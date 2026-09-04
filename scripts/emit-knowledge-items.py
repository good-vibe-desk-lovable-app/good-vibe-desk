"""Emit source-backed Palworld item cards, stat variants, and production rows.

The catalogue contract is the exact PalDB ``Items /<count>`` heading and its
bounded ``div.col > div.d-flex.border.rounded`` cards. Individual pages may
contain multiple quality/schematic variants, so their repeated ``Stats`` and
``Production`` sections are retained by source order.
In addition, ingests structured item JSON from palworld.gg.
"""
from __future__ import annotations

import concurrent.futures
import datetime as dt
import json
import re
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup, Tag

from palworld_source_contracts import SourceContractError, require_exact_section

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data" / "palworld"
CATALOGUE_URL = "https://paldb.cc/en/Items"
ITEM_BASE_URL = "https://paldb.cc/en/"
PALWORLD_GG_ITEMS_URL = "https://palworld.gg/_nuxt/CAAXy-Yd.js"

CACHE_ROOT = ROOT / "scripts" / ".cache" / "knowledge-items"
COVERAGE = DATA / "knowledgeItems.coverage.json"
BASELINE = ROOT / "scripts" / "coverage-baselines" / "knowledge-items.json"
MAX_WORKERS = 8

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0"}


def normalized(tag: Tag | None) -> str:
    return " ".join(tag.get_text(" ", strip=True).split()) if tag is not None else ""


def fetch(url: str, cache_path: Path) -> str:
    if cache_path.exists():
        return cache_path.read_text(encoding="utf-8")
    request = Request(url, headers=HEADERS)
    last_error = None
    for attempt in range(3):
        try:
            with urlopen(request, timeout=45) as response:
                payload = response.read().decode("utf-8", errors="ignore")
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            cache_path.write_text(payload, encoding="utf-8")
            time.sleep(0.02)
            return payload
        except (HTTPError, URLError, Exception) as error:
            last_error = error
            time.sleep(1.0)
    raise SourceContractError(f"{url}: source fetch failed after 3 attempts: {last_error}") from last_error


def section_title(soup: BeautifulSoup) -> str:
    headings = [normalized(heading) for heading in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])]
    matches = [title for title in headings if re.fullmatch(r"Items /[1-9][0-9]*", title)]
    if len(matches) != 1:
        raise SourceContractError(f"{CATALOGUE_URL}: expected one exact Items /<count> heading; found {matches!r}.")
    return matches[0]


def parse_catalogue() -> list[dict[str, str]]:
    soup = BeautifulSoup(fetch(CATALOGUE_URL, CACHE_ROOT / "catalogue.html"), "html.parser")
    heading = section_title(soup)
    section = require_exact_section(soup, page=CATALOGUE_URL, title=heading)
    cards: list[Tag] = []
    for node in section.nodes:
        cards.extend(node.select("div.col > div.d-flex.border.rounded"))
    if not cards:
        raise SourceContractError(f"{CATALOGUE_URL}: {heading} has no bounded item cards.")
    expected_count = int(heading.rsplit("/", 1)[1])
    if len(cards) != expected_count:
        raise SourceContractError(f"{CATALOGUE_URL}: heading declares {expected_count} cards but bounded selector found {len(cards)}.")

    records: list[dict[str, str]] = []
    for card in cards:
        link = card.select_one("a.itemname[href]")
        if link is None:
            raise SourceContractError(f"{CATALOGUE_URL}: bounded item card lacks a.itemname[href].")
        slug = link.get("href", "").strip()
        name = normalized(link)
        description = normalized(link.find_next_sibling("div"))
        if not slug or "/" in slug or "?" in slug or "#" in slug or not re.fullmatch(r"[A-Za-z0-9_.:%-]+", slug) or not name:
            raise SourceContractError(f"{CATALOGUE_URL}: invalid card identity: slug={slug!r}, name={name!r}.")
        records.append({"slug": slug, "name": name, "description": description})
    return records


def sibling_nodes_after(heading: Tag) -> list[Tag]:
    nodes: list[Tag] = []
    for sibling in heading.next_siblings:
        if not isinstance(sibling, Tag):
            continue
        if sibling.name in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            break
        nodes.append(sibling)
    return nodes


def parse_stat_groups(soup: BeautifulSoup, page: str) -> list[list[dict[str, str]]]:
    groups: list[list[dict[str, str]]] = []
    for heading in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
        if normalized(heading) != "Stats":
            continue
        rows: list[dict[str, str]] = []
        for node in sibling_nodes_after(heading):
            for row in [node, *node.select("div.d-flex.justify-content-between")]:
                classes = set(row.get("class", []))
                if not {"d-flex", "justify-content-between"}.issubset(classes):
                    continue
                children = [child for child in row.find_all(recursive=False) if isinstance(child, Tag)]
                if len(children) < 2:
                    continue
                label, value = normalized(children[0]), normalized(children[-1])
                if label and value:
                    rows.append({"label": label, "value": value})
        if not rows:
            raise SourceContractError(f"{page}: Stats heading is present but has no bounded label/value rows.")
        groups.append(rows)
    return groups


def parse_production_rows(soup: BeautifulSoup, page: str) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for heading in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
        if normalized(heading) != "Production":
            continue
        for node in sibling_nodes_after(heading):
            for table in [node, *node.select("table")]:
                if table.name != "table":
                    continue
                raw_table = str(table)
                header_labels = [value.strip() for value in re.findall(r"<th(?:\s[^>]*)?>\s*([^<]+)", raw_table, flags=re.IGNORECASE)]
                if header_labels[:3] != ["Materials", "Product", "Schematic"]:
                    continue
                source_rows = [fragment for fragment in re.split(r"<tr(?:\s[^>]*)?>", raw_table, flags=re.IGNORECASE)[1:] if "<td" in fragment.lower()]
                if not source_rows:
                    raise SourceContractError(f"{page}: Production table has its required header but no rows.")
                for source_row in source_rows:
                    cell_fragments = re.split(r"<td(?:\s[^>]*)?>", source_row, flags=re.IGNORECASE)[1:]
                    if len(cell_fragments) != 3:
                        raise SourceContractError(f"{page}: Production row has {len(cell_fragments)} source cells, expected 3.")
                    materials, product, schematic = (normalized(BeautifulSoup(fragment, "html.parser")) for fragment in cell_fragments)
                    if not product:
                        raise SourceContractError(f"{page}: Production row has no product text.")
                    rows.append({"materials": materials, "product": product, "schematic": schematic})
    return rows


def parse_item_page(slug: str) -> dict[str, object]:
    url = ITEM_BASE_URL + slug
    html = fetch(url, CACHE_ROOT / "pages" / f"{slug}.html")
    soup = BeautifulSoup(html, "html.parser")
    document_title = normalized(soup.select_one("title"))
    suffix = " - Palworld Database Wiki"
    title = document_title.removesuffix(suffix)
    if not title or title == document_title:
        raise SourceContractError(f"{url}: missing or malformed PalDB document title.")
    stat_groups = parse_stat_groups(soup, url)
    production_rows = parse_production_rows(soup, url)
    return {"pageTitle": title, "statGroups": stat_groups, "productionRows": production_rows}


def load_palworld_gg_items() -> dict[str, dict[str, object]]:
    """Load structured item JSON from palworld.gg."""
    try:
        code = fetch(PALWORLD_GG_ITEMS_URL, CACHE_ROOT / "palworld_gg_items.js")
        jm = re.search(r'JSON\.parse\(`(.*?)`\)', code, re.DOTALL)
        if not jm:
            return {}
        raw = jm.group(1).encode('utf-8').decode('unicode_escape')
        items = json.loads(raw)
        gg_map = {}
        for it in items:
            if "id" in it:
                gg_map[it["id"]] = it
            if "name" in it:
                gg_map[it["name"].lower()] = it
        return gg_map
    except Exception as error:
        print(f"[load_palworld_gg_items] Warning: {error}", file=sys.stderr)
        return {}


def main() -> None:
    catalogue_cards = parse_catalogue()
    by_slug: dict[str, list[dict[str, str]]] = defaultdict(list)
    for card in catalogue_cards:
        by_slug[card["slug"]].append(card)

    details: dict[str, dict[str, object]] = {}
    errors: list[str] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(parse_item_page, slug): slug for slug in sorted(by_slug)}
        for future in concurrent.futures.as_completed(futures):
            slug = futures[future]
            try:
                details[slug] = future.result()
            except SourceContractError as error:
                errors.append(str(error))
    if errors:
        preview = "\n".join(errors[:10])
        raise SourceContractError(f"Item-page contract failed for {len(errors)} slug(s):\n{preview}")

    gg_items = load_palworld_gg_items()

    emitted_at = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    catalogue_source = {"id": "paldb-items-catalogue", "url": CATALOGUE_URL, "tier": "wiki", "locator": "exact Items /<count> heading and bounded item cards", "observedAt": emitted_at, "sourceVersion": "v1.0.3"}
    gg_source = {"id": "palworld-gg-items", "url": PALWORLD_GG_ITEMS_URL, "tier": "official", "locator": "Structured JSON bundle for items", "observedAt": emitted_at, "sourceVersion": "v1.0.3"}

    records: list[dict[str, object]] = []
    for card_index, card in enumerate(catalogue_cards):
        detail = details[card["slug"]]
        page_url = ITEM_BASE_URL + card["slug"]
        page_source = {"id": f"paldb-item:{card['slug']}", "url": page_url, "tier": "wiki", "locator": "source page title plus bounded Stats and Production sections", "observedAt": emitted_at, "sourceVersion": "v1.0.3"}

        gg_match = gg_items.get(card["slug"]) or gg_items.get(card["name"].lower())
        descr_effect = card["description"] if card["description"] else None
        if gg_match and gg_match.get("descr"):
            descr_effect = gg_match["descr"]

        item_data = {**card, "describedEffect": descr_effect, **detail}
        sources_list = [catalogue_source, page_source]
        if gg_match:
            sources_list.append(gg_source)

        gaps = []
        if not detail["statGroups"]:
            gaps.append({"field": "statGroups", "reason": "The source item page publishes no Stats section.", "resolution": "Retain the catalogue item without inferred statistics."})
        if not detail["productionRows"]:
            if descr_effect:
                gaps.append({"field": "productionRows", "reason": f"described but unquantified: exact crafting recipe is unpublished on page, but official text states: \"{descr_effect}\"", "resolution": "Retain item description as qualitative evidence until direct recipe extraction supplies exact material quantities."})
            else:
                gaps.append({"field": "productionRows", "reason": "The source item page publishes no qualifying Materials/Product/Schematic Production row.", "resolution": "Retain the item without an inferred recipe."})

        records.append({
            "id": f"item-card:{card_index + 1}:{card['slug']}",
            "data": item_data,
            "version": {"gameVersion": "v1.0.3", "emittedAt": emitted_at, "generatorVersion": "paldb-items-multi-source"},
            "sources": sources_list,
            "provenance": [
                {"field": "slug", "sourceIds": [s["id"] for s in sources_list], "confidence": "corroborated"},
                {"field": "name", "sourceIds": [s["id"] for s in sources_list], "confidence": "corroborated"},
                {"field": "description", "sourceIds": [s["id"] for s in sources_list], "confidence": "corroborated"},
                {"field": "describedEffect", "sourceIds": [s["id"] for s in sources_list], "confidence": "confirmed"},
                {"field": "pageTitle", "sourceIds": [page_source["id"]], "confidence": "corroborated"},
                {"field": "statGroups", "sourceIds": [page_source["id"]], "confidence": "corroborated"},
                {"field": "productionRows", "sourceIds": [page_source["id"]], "confidence": "corroborated"},
            ],
            "gaps": gaps,
        })

    counts = Counter()
    counts["catalogueCards"] = len(catalogue_cards)
    counts["uniquePages"] = len(by_slug)
    counts["recordsWithStats"] = sum(bool(record["data"]["statGroups"]) for record in records)
    counts["recordsWithProduction"] = sum(bool(record["data"]["productionRows"]) for record in records)
    counts["productionRows"] = sum(len(record["data"]["productionRows"]) for record in records)
    counts["statGroups"] = sum(len(record["data"]["statGroups"]) for record in records)

    coverage = {"dataset": "knowledge-items", "generatedAt": emitted_at, "gameVersion": "v1.0.3", "recordCount": len(records), "counts": dict(counts), "sourceUrls": [CATALOGUE_URL, PALWORLD_GG_ITEMS_URL]}
    body = "// AUTO-GENERATED by scripts/emit-knowledge-items.py. Do not hand-edit.\n" + f"// Sources: {CATALOGUE_URL}, {PALWORLD_GG_ITEMS_URL}; emitted: {emitted_at}.\n" + 'import type { EvidenceRecord } from "./knowledge";\n\n' + "export interface ItemStat {\n  label: string;\n  value: string;\n}\n\nexport interface ItemProductionRow {\n  materials: string;\n  product: string;\n  schematic: string;\n}\n\nexport interface ItemKnowledge {\n  slug: string;\n  name: string;\n  description: string;\n  describedEffect?: string | null;\n  pageTitle: string;\n  statGroups: readonly (readonly ItemStat[])[];\n  productionRows: readonly ItemProductionRow[];\n}\n\n" + "export const PALWORLD_ITEMS: readonly EvidenceRecord<ItemKnowledge>[] = " + json.dumps(records, ensure_ascii=False) + ";\n"
    (DATA / "knowledgeItems.ts").write_text(body, encoding="utf-8")
    COVERAGE.write_text(json.dumps(coverage, indent=2) + "\n")
    BASELINE.parent.mkdir(parents=True, exist_ok=True)
    if not BASELINE.exists():
        BASELINE.write_text(json.dumps(coverage, indent=2) + "\n")
    print(f"wrote knowledgeItems.ts: {len(records)} catalogue cards, {len(by_slug)} unique pages, {counts['productionRows']} production rows")


if __name__ == "__main__":
    try:
        main()
    except SourceContractError as error:
        print(f"[emit-knowledge-items] FAILED: {error}", file=sys.stderr)
        raise SystemExit(1)
