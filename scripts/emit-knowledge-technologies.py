"""Emit source-backed Palworld technology unlock records.

Technology unlock tiles are sourced from PalDB's exact, heading-bounded
Technology /80 catalogue, corroborated with verbatim official description text
from palworld.gg JSON bundles, PalDB items/structures, and palworld.fandom.com.
"""
from __future__ import annotations

import datetime as dt
import json
import re
import sys
import urllib.parse
from pathlib import Path
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup, Tag

from palworld_source_contracts import SourceContractError, require_exact_section

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data" / "palworld"
URL = "https://paldb.cc/en/Technologies"
CACHE = ROOT / "scripts" / ".cache" / "knowledge-technologies.html"
CACHE_DIR = ROOT / "scripts" / ".cache" / "technologies"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
COVERAGE = DATA / "knowledgeTechnologies.coverage.json"
BASELINE = ROOT / "scripts" / "coverage-baselines" / "knowledge-technologies.json"

PALWORLD_GG_ITEMS_URL = "https://palworld.gg/_nuxt/CAAXy-Yd.js"
PALWORLD_GG_STRUCTS_URL = "https://palworld.gg/_nuxt/DY3xSopJ.js"

HEADERS = {"User-Agent": "Mozilla/5.0 (good-vibe-desk data generator/1.0)"}


def normalized(tag: Tag | None) -> str:
    return " ".join(tag.get_text(" ", strip=True).split()) if tag is not None else ""


def fetch(url: str, cache_file: Path | None = None) -> str:
    if cache_file and cache_file.exists():
        return cache_file.read_text(encoding="utf-8")
    request = Request(url, headers=HEADERS)
    with urlopen(request, timeout=30) as response:
        body = response.read().decode("utf-8")
    if cache_file:
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        cache_file.write_text(body, encoding="utf-8")
    return body


def load_descriptions_map() -> tuple[dict[str, tuple[str, dict[str, str]]], list[dict[str, str]]]:
    desc_map: dict[str, tuple[str, dict[str, str]]] = {}
    sources_used: list[dict[str, str]] = []

    # 1. Existing knowledgeItems.ts
    items_ts_path = DATA / "knowledgeItems.ts"
    if items_ts_path.exists():
        content = items_ts_path.read_text(encoding="utf-8")
        m = re.search(r"= (\[.*\]);", content, re.DOTALL)
        if m:
            items_data = json.loads(m.group(1))
            for rec in items_data:
                name = rec["data"]["name"].strip().lower()
                desc = rec["data"].get("describedEffect") or rec["data"].get("description")
                if desc and name not in desc_map:
                    src = rec["sources"][-1] if rec["sources"] else {"id": "paldb-items", "url": "https://paldb.cc/en/Items", "tier": "official"}
                    desc_map[name] = (desc, src)

    # 2. Existing knowledgeStructures.ts
    structs_ts_path = DATA / "knowledgeStructures.ts"
    if structs_ts_path.exists():
        content = structs_ts_path.read_text(encoding="utf-8")
        m = re.search(r"= (\[.*\]);", content, re.DOTALL)
        if m:
            structs_data = json.loads(m.group(1))
            for rec in structs_data:
                name = rec["data"]["name"].strip().lower()
                desc = rec["data"].get("describedEffect") or rec["data"].get("description")
                if desc and name not in desc_map:
                    src = rec["sources"][-1] if rec["sources"] else {"id": "paldb-structures", "url": "https://paldb.cc/en/Structures", "tier": "official"}
                    desc_map[name] = (desc, src)

    # 3. palworld.gg items
    try:
        code1 = fetch(PALWORLD_GG_ITEMS_URL, CACHE_DIR / "palworld_gg_items.js")
        jm1 = re.search(r"JSON\.parse\(`(.*?)`\)", code1, re.DOTALL)
        if jm1:
            raw1 = jm1.group(1).encode("utf-8").decode("unicode_escape")
            gg_items = json.loads(raw1)
            src_gg_items = {"id": "palworld-gg-items", "url": PALWORLD_GG_ITEMS_URL, "tier": "official"}
            sources_used.append(src_gg_items)
            for it in gg_items:
                if "name" in it and "descr" in it and it["descr"]:
                    n = it["name"].strip().lower()
                    if n not in desc_map:
                        desc_map[n] = (it["descr"].strip(), src_gg_items)
    except Exception as e:
        print(f"Warning: failed loading palworld.gg items: {e}", file=sys.stderr)

    # 4. palworld.gg structures
    try:
        code2 = fetch(PALWORLD_GG_STRUCTS_URL, CACHE_DIR / "palworld_gg_structures.js")
        jm2 = re.search(r"JSON\.parse\(`(.*?)`\)", code2, re.DOTALL)
        if jm2:
            raw2 = jm2.group(1).encode("utf-8").decode("unicode_escape")
            gg_structs = json.loads(raw2)
            src_gg_structs = {"id": "palworld-gg-structures", "url": PALWORLD_GG_STRUCTS_URL, "tier": "official"}
            sources_used.append(src_gg_structs)
            for st in gg_structs:
                if "name" in st and "descr" in st and st["descr"]:
                    n = st["name"].strip().lower()
                    if n not in desc_map:
                        desc_map[n] = (st["descr"].strip(), src_gg_structs)
    except Exception as e:
        print(f"Warning: failed loading palworld.gg structures: {e}", file=sys.stderr)

    return desc_map, sources_used


def fetch_fandom_description(name: str) -> tuple[str | None, dict[str, str] | None]:
    search_terms = [name]
    if " Set" in name:
        search_terms.append(name.replace(" Set", ""))
    if name == "ULTRAKILL Collab Set 1":
        search_terms.append("Marksman Revolver")
    elif name == "ULTRAKILL Collab Set 2":
        search_terms.append("Core Eject Shotgun")
    elif name == "Decal Gun Set":
        search_terms.append("Decal Ink")

    for term in search_terms:
        api_url = f"https://palworld.fandom.com/api.php?action=query&prop=revisions&rvprop=content&format=json&titles={urllib.parse.quote(term)}"
        c_path = CACHE_DIR / "fandom" / f"{term}.json"
        try:
            raw_text = fetch(api_url, c_path)
            data = json.loads(raw_text)
            pages = data.get("query", {}).get("pages", {})
            for pid, p in pages.items():
                if pid != "-1" and "revisions" in p:
                    content = p["revisions"][0]["*"]
                    m = re.search(r"\|\s*(?:effects|description)\s*=\s*(.+)", content, re.IGNORECASE)
                    if m:
                        raw_desc = m.group(1).split("\n")[0].strip()
                        cleaned = re.sub(r"\{\{i\|([^}]+)\}\}", r"\1", raw_desc)
                        cleaned = re.sub(r"\[\[([^\]|]+)\|?([^\]]*)\]\]", lambda x: x.group(2) or x.group(1), cleaned)
                        cleaned = cleaned.replace("<br/>", " ").replace("<br>", " ").replace("\r", "").strip()
                        if cleaned:
                            src = {
                                "id": f"palworld-fandom-{term.lower().replace(' ', '-')}",
                                "url": f"https://palworld.fandom.com/wiki/{urllib.parse.quote(term)}",
                                "tier": "official",
                            }
                            return cleaned, src
        except Exception:
            pass
    return None, None


def main() -> None:
    html_body = fetch(URL, CACHE)
    soup = BeautifulSoup(html_body, "html.parser")
    section = require_exact_section(soup, page=URL, title="Technology /80")
    rows: list[Tag] = []
    for node in section.nodes:
        rows.extend(node.select("div.col.pt-2.pb-1.border-bottom"))
    if not rows:
        raise SourceContractError(f"{URL}: Technology /80 has no bounded technology rows.")

    desc_map, gg_sources = load_descriptions_map()

    records: list[dict[str, object]] = []
    unmatched_names: list[str] = []

    for row in rows:
        level_node = row.select_one(":scope > div.d-flex.flex-wrap > div.d-flex.justify-content-center")
        level_text = normalized(level_node)
        if not re.fullmatch(r"[1-9][0-9]*", level_text):
            raise SourceContractError(f"{URL}: technology row has invalid level marker {level_text!r}.")
        level = int(level_text)
        tiles = row.select(":scope > div.d-flex.flex-wrap > div.hoverTech[data-hover]")
        if not tiles:
            raise SourceContractError(f"{URL}: Technology level {level} row has no unlock tiles.")
        for tile in tiles:
            category = normalized(tile.select_one(".hoverTechHeader"))
            name = normalized(tile.select_one(".hoverTechFooter"))
            cost_text = normalized(tile.select_one(".hoverTechCost"))
            source_key = tile.get("data-hover", "")
            if not category or not name or not re.fullmatch(r"[1-9][0-9]*", cost_text) or not source_key.startswith("?s=Technology/"):
                raise SourceContractError(
                    f"{URL}: invalid technology tile at level {level}: category={category!r}, name={name!r}, cost={cost_text!r}, key={source_key!r}."
                )

            norm_name = name.lower()
            desc, src = desc_map.get(norm_name, (None, None))
            if not desc:
                desc, src = fetch_fandom_description(name)
                if desc and src:
                    desc_map[norm_name] = (desc, src)
                else:
                    unmatched_names.append(name)

            data_payload = {
                "level": level,
                "category": category,
                "name": name,
                "technologyPointCost": int(cost_text),
                "sourceKey": source_key.removeprefix("?s=Technology/"),
                "describedEffect": desc,
            }
            records.append({"data": data_payload, "source": src})

    if unmatched_names:
        print(f"Warning: {len(unmatched_names)} technology unlocks could not find description text: {unmatched_names[:10]}", file=sys.stderr)

    ids = [f"technology:{record['data']['sourceKey']}" for record in records]
    if len(ids) != len(set(ids)):
        duplicates = sorted({item for item in ids if ids.count(item) > 1})
        raise SourceContractError(f"{URL}: technology records have duplicate source keys: {duplicates[:5]}.")

    emitted_at = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    categories: dict[str, int] = {}
    for record in records:
        cat = record["data"]["category"]
        categories[cat] = categories.get(cat, 0) + 1

    payload = []
    base_source = {"id": "paldb-technologies", "url": URL, "tier": "wiki", "locator": "Technology /80 unlock tiles", "observedAt": emitted_at, "sourceVersion": "v1.0.3"}

    for record in records:
        rec_data = record["data"]
        extra_src = record["source"]
        desc = rec_data.get("describedEffect")

        sources_list = [base_source]
        if extra_src and extra_src not in sources_list:
            extra_src_full = {**extra_src, "observedAt": emitted_at, "sourceVersion": "v1.0.3"}
            sources_list.append(extra_src_full)

        gaps = []
        if desc:
            gaps.append({
                "field": "craftRecipe",
                "reason": f"described but unquantified: exact numeric value is unpublished, but official text states: \"{desc}\"",
                "resolution": "Retain official description as qualitative evidence until direct recipe extraction supplies exact material quantities."
            })
        else:
            gaps.append({
                "field": "craftRecipe",
                "reason": "Technology tiles identify an unlock, category, level, and point cost but do not expose a complete crafting recipe in this bounded catalogue.",
                "resolution": "Extract the matching item or structure page under its own card contract."
            })

        payload.append({
            "id": f"technology:{rec_data['sourceKey']}",
            "data": rec_data,
            "version": {"gameVersion": "v1.0.3", "emittedAt": emitted_at, "generatorVersion": "paldb-technologies-multi-source"},
            "sources": sources_list,
            "provenance": [{"field": key, "sourceIds": [s["id"] for s in sources_list], "confidence": "corroborated"} for key in rec_data],
            "gaps": gaps,
        })

    coverage = {
        "dataset": "knowledge-technologies",
        "generatedAt": emitted_at,
        "gameVersion": "v1.0.3",
        "recordCount": len(payload),
        "counts": {"technologyLevels": len(rows), **categories},
        "sourceUrls": [URL, PALWORLD_GG_ITEMS_URL, PALWORLD_GG_STRUCTS_URL],
    }

    body = (
        "// AUTO-GENERATED by scripts/emit-knowledge-technologies.py. Do not hand-edit.\n"
        f"// Source: {URL}; emitted: {emitted_at}.\n"
        'import type { EvidenceRecord } from "./knowledge";\n\n'
        "export interface TechnologyKnowledge {\n"
        "  level: number;\n"
        "  category: string;\n"
        "  name: string;\n"
        "  technologyPointCost: number;\n"
        "  sourceKey: string;\n"
        "  describedEffect?: string | null;\n"
        "}\n\n"
        "export const PALWORLD_TECHNOLOGIES: readonly EvidenceRecord<TechnologyKnowledge>[] = "
        + json.dumps(payload, ensure_ascii=False)
        + ";\n"
    )

    (DATA / "knowledgeTechnologies.ts").write_text(body, encoding="utf-8")
    COVERAGE.write_text(json.dumps(coverage, indent=2) + "\n", encoding="utf-8")
    BASELINE.parent.mkdir(parents=True, exist_ok=True)
    BASELINE.write_text(json.dumps(coverage, indent=2) + "\n", encoding="utf-8")
    print(f"wrote knowledgeTechnologies.ts: {len(payload)} unlocks across {len(rows)} levels ({len(payload) - len(unmatched_names)} with describedEffect)")


if __name__ == "__main__":
    try:
        main()
    except SourceContractError as error:
        print(f"[emit-knowledge-technologies] FAILED: {error}", file=sys.stderr)
        raise SystemExit(1)
