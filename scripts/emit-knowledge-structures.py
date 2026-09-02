"""Emit source-backed Palworld structure construction and operational details.

Sourced from PalDB's structure catalogue (https://paldb.cc/en/Structures),
individual structure pages, and cross-referenced with the technology catalogue.
Enforces strict section contracts via scripts/palworld_source_contracts.py.
"""
from __future__ import annotations

import concurrent.futures
import datetime as dt
import json
import re
import sys
from pathlib import Path
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup, Tag

from palworld_source_contracts import SourceContractError, require_exact_section

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data" / "palworld"
CATALOGUE_URL = "https://paldb.cc/en/Structures"
TECHNOLOGIES_URL = "https://paldb.cc/en/Technologies"
CACHE_DIR = ROOT / "scripts" / ".cache" / "knowledge-structures"
COVERAGE = DATA / "knowledgeStructures.coverage.json"
BASELINE = ROOT / "scripts" / "coverage-baselines" / "knowledge-structures.json"

WORK_SUITABILITIES = {
    "Kindling",
    "Watering",
    "Planting",
    "Generating Electricity",
    "Handiwork",
    "Gathering",
    "Lumbering",
    "Mining",
    "Medicine Production",
    "Cooling",
    "Transporting",
    "Farming",
}


def fetch(url: str, cache_path: Path) -> str:
    if cache_path.exists():
        return cache_path.read_text(encoding="utf-8")
    request = Request(url, headers={"User-Agent": "good-vibe-desk data generator/1.0"})
    with urlopen(request, timeout=45) as response:
        payload = response.read().decode("utf-8")
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(payload, encoding="utf-8")
    return payload


def normalized(tag: Tag | None) -> str:
    return " ".join(tag.get_text(" ", strip=True).split()) if tag is not None else ""


def load_technologies() -> tuple[dict[str, dict[str, object]], set[str]]:
    tech_file = DATA / "knowledgeTechnologies.ts"
    if not tech_file.exists():
        return {}, set()

    content = tech_file.read_text(encoding="utf-8")
    prefix = "export const PALWORLD_TECHNOLOGIES: readonly EvidenceRecord<TechnologyKnowledge>[] = "
    idx = content.find(prefix)
    if idx == -1:
        return {}, set()

    json_str = content[idx + len(prefix):].rstrip().rstrip(";")
    try:
        tech_list = json.loads(json_str)
    except Exception:
        return {}, set()

    tech_by_name = {}
    for entry in tech_list:
        data = entry.get("data", {})
        if "name" in data:
            tech_by_name[data["name"]] = data

    ancient_keys = set()
    try:
        tech_html = fetch(TECHNOLOGIES_URL, CACHE_DIR / "technologies.html")
        soup = BeautifulSoup(tech_html, "html.parser")
        boss_tiles = soup.select("div.hoverTech.BossTechnology[data-hover]")
        for tile in boss_tiles:
            hover = tile.get("data-hover", "")
            if hover.startswith("?s=Technology/"):
                key = hover.removeprefix("?s=Technology/")
                ancient_keys.add(key)
    except Exception:
        pass

    return tech_by_name, ancient_keys


def parse_structure_page(
    href: str,
    tech_by_name: dict[str, dict[str, object]],
    ancient_keys: set[str],
) -> dict[str, object]:
    url = f"https://paldb.cc/en/{href}"
    cache_path = CACHE_DIR / "pages" / f"{href}.html"
    html = fetch(url, cache_path)
    soup = BeautifulSoup(html, "html.parser")

    title_node = soup.select_one("h1") or soup.select_one(".itemname")
    page_title = normalized(title_node) if title_node else href.replace("_", " ")

    # Parse Stats section
    stats_section = None
    for h in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
        if normalized(h) == "Stats":
            stats_section = h
            break

    stats: dict[str, str] = {}
    required_suitabilities: list[dict[str, object]] = []
    if stats_section:
        for sibling in stats_section.next_siblings:
            if getattr(sibling, "name", None) in ["h1", "h2", "h3", "h4", "h5", "h6"]:
                break
            if getattr(sibling, "name", None) == "div":
                children = sibling.select(":scope > div")
                if len(children) == 2:
                    k = normalized(children[0])
                    v = normalized(children[1])
                    stats[k] = v

                    # Check for required suitability row in Stats
                    a_k = children[0].select_one("a")
                    if a_k:
                        suit_name = normalized(a_k)
                        if suit_name in WORK_SUITABILITIES:
                            try:
                                lvl = int(v)
                            except ValueError:
                                lvl = 1
                            required_suitabilities.append({"suitability": suit_name, "level": lvl})

    # Parse Others section
    others_section = None
    for h in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
        if normalized(h) == "Others":
            others_section = h
            break

    others: dict[str, str] = {}
    if others_section:
        for sibling in others_section.next_siblings:
            if getattr(sibling, "name", None) in ["h1", "h2", "h3", "h4", "h5", "h6"]:
                break
            if getattr(sibling, "name", None) == "div":
                children = sibling.select(":scope > div")
                if len(children) == 2:
                    others[normalized(children[0])] = normalized(children[1])

    # Parse Production / Crafting Construction Materials & Technology
    prod_section = None
    for h in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
        if normalized(h) == "Production":
            prod_section = h
            break

    materials: list[dict[str, object]] = []
    page_tech_level: int | None = None
    schematic_item: str | None = None

    if prod_section:
        table = None
        for sibling in prod_section.next_siblings:
            if getattr(sibling, "name", None) in ["h1", "h2", "h3", "h4", "h5", "h6"]:
                break
            if getattr(sibling, "name", None) == "div":
                table = sibling.select_one("table")
                if table:
                    break

        if table:
            first_tr = table.select_one("tbody > tr")
            if first_tr:
                tds = first_tr.select(":scope > td")
                if len(tds) >= 1:
                    mat_links = tds[0].select("a.itemname")
                    mat_qtys = tds[0].select("small.itemQuantity")
                    for i, link in enumerate(mat_links):
                        m_name = normalized(link)
                        qty = 1
                        if i < len(mat_qtys):
                            q_text = normalized(mat_qtys[i])
                            try:
                                qty = int(q_text)
                            except ValueError:
                                qty = 1
                        materials.append({"materialName": m_name, "quantity": qty})

                if len(tds) >= 3:
                    sch_text = normalized(tds[2])
                    if "Technology" in sch_text:
                        match = re.search(r"Technology\s+Lv\.?\s*([0-9]+)", sch_text)
                        if match:
                            page_tech_level = int(match.group(1))
                    elif sch_text:
                        schematic_item = sch_text

    # Cross-reference with Technology Catalogue
    conflicts: list[dict[str, object]] = []
    tech_entry = tech_by_name.get(page_title) or tech_by_name.get(href.replace("_", " "))

    tech_level = page_tech_level
    tech_point_cost = None
    tech_category = None
    source_key = href

    point_type = "normal"
    if tech_entry:
        cat_level = tech_entry.get("level")
        cat_cost = tech_entry.get("technologyPointCost")
        cat_category = tech_entry.get("category")
        cat_source_key = tech_entry.get("sourceKey")

        if isinstance(cat_level, int):
            if page_tech_level is not None and page_tech_level != cat_level:
                conflicts.append({
                    "field": "technologyUnlock.level",
                    "pageValue": page_tech_level,
                    "catalogueValue": cat_level,
                    "description": f"Page technology level ({page_tech_level}) differs from catalogue level ({cat_level}). Catalogue takes precedence.",
                })
            tech_level = cat_level

        if isinstance(cat_cost, int):
            tech_point_cost = cat_cost
        if isinstance(cat_category, str):
            tech_category = cat_category
        if isinstance(cat_source_key, str) and cat_source_key in ancient_keys:
            point_type = "ancient"

    elif schematic_item:
        point_type = "schematic_only"
    elif tech_level is None:
        point_type = "none"

    # Extract Power Info
    power_type = "none"
    power_amount = None
    if "Energy Type" in stats:
        power_type = "draw"
    elif "Generating Electricity" in stats:
        power_type = "generation"

    # Extract Capacity Info
    worker_max = int(stats["Worker Max"]) if "Worker Max" in stats and stats["Worker Max"].isdigit() else None
    slots = int(stats["Slots"]) if "Slots" in stats and stats["Slots"].isdigit() else None
    workload = None
    if "Workload" in stats:
        match = re.search(r"x\s*([0-9]+)", stats["Workload"])
        if match:
            workload = int(match.group(1))

    # Extract Placement Info
    belong_base = (
        bool(int(others["bBelongToBaseCamp"]))
        if "bBelongToBaseCamp" in others and others["bBelongToBaseCamp"].isdigit()
        else None
    )
    det_damage = float(others["DeteriorationDamage"]) if "DeteriorationDamage" in others else None
    hp = int(others["Hp"]) if "Hp" in others and others["Hp"].isdigit() else None
    hp_pvp = int(others["Hp_PVP"]) if "Hp_PVP" in others and others["Hp_PVP"].isdigit() else None
    defense = int(stats["Defense"]) if "Defense" in stats and stats["Defense"].isdigit() else None
    def_pvp = int(others["Defense_PVP"]) if "Defense_PVP" in others and others["Defense_PVP"].isdigit() else None
    code = stats.get("Code")

    return {
        "sourceKey": source_key,
        "name": page_title,
        "category": stats.get("Type", "Unknown"),
        "materials": materials,
        "requiredWorkSuitabilities": required_suitabilities,
        "power": {"type": power_type, "amount": power_amount},
        "capacity": {"workerMax": worker_max, "slots": slots, "workload": workload},
        "placement": {
            "belongToBaseCamp": belong_base,
            "deteriorationDamage": det_damage,
            "hp": hp,
            "hpPvp": hp_pvp,
            "defense": defense,
            "defensePvp": def_pvp,
            "code": code,
        },
        "technologyUnlock": {
            "level": tech_level,
            "pointCost": tech_point_cost,
            "pointType": point_type,
            "sourceKey": tech_entry.get("sourceKey") if tech_entry else None,
        },
        "prerequisiteRelations": [],
        "conflicts": conflicts,
    }


def main() -> None:
    cat_html = fetch(CATALOGUE_URL, CACHE_DIR / "catalogue.html")
    soup = BeautifulSoup(cat_html, "html.parser")

    section = require_exact_section(soup, page=CATALOGUE_URL, title="Structures /498")
    card_divs = []
    for node in section.nodes:
        card_divs.extend(node.select("div.col > div.d-flex.border.rounded"))

    if len(card_divs) != 498:
        raise SourceContractError(f"{CATALOGUE_URL}: expected 498 structure catalogue rows, found {len(card_divs)}.")

    tech_by_name, ancient_keys = load_technologies()

    records: list[dict[str, object]] = []
    gaps_count = 0
    pages_fetched = 0
    total_materials = 0
    total_suitabilities = 0

    emitted_at = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    source_cat = {
        "id": "paldb-structures-catalogue",
        "url": CATALOGUE_URL,
        "tier": "wiki",
        "locator": "Structures /498 catalogue section",
        "observedAt": emitted_at,
        "sourceVersion": "v1.0.3",
    }

    # Pre-fetch all linked pages in parallel
    hrefs = []
    for card in card_divs:
        item_a = card.select_one("a.itemname")
        href = item_a.get("href", "") if item_a else ""
        if href and href not in hrefs:
            hrefs.append(href)

    def prefetch(href: str) -> None:
        cache_path = CACHE_DIR / "pages" / f"{href}.html"
        if not cache_path.exists():
            fetch(f"https://paldb.cc/en/{href}", cache_path)

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        list(executor.map(prefetch, hrefs))

    for idx, card in enumerate(card_divs):
        item_a = card.select_one("a.itemname")
        href = item_a.get("href", "") if item_a else ""
        name = normalized(item_a) if item_a else f"Structure_{idx+1}"

        if not href:
            # Unlinked structure entry (e.g. Banyan_Big, DamagedScarecrow_Test)
            gaps_count += 1
            record_data = {
                "sourceKey": f"unlinked_{idx+1}",
                "name": name,
                "category": "Unknown",
                "materials": [],
                "requiredWorkSuitabilities": [],
                "power": {"type": "none", "amount": None},
                "capacity": {"workerMax": None, "slots": None, "workload": None},
                "placement": {
                    "belongToBaseCamp": None,
                    "deteriorationDamage": None,
                    "hp": None,
                    "hpPvp": None,
                    "defense": None,
                    "defensePvp": None,
                    "code": None,
                },
                "technologyUnlock": {"level": None, "pointCost": None, "pointType": "none", "sourceKey": None},
                "prerequisiteRelations": [],
                "conflicts": [],
            }
            gaps = [{
                "field": "individualPage",
                "reason": "This structure row in the PalDB catalogue lacks a link to an individual detail page.",
                "resolution": "Retain catalogue entry with gap indicator.",
            }]
        else:
            pages_fetched += 1
            record_data = parse_structure_page(href, tech_by_name, ancient_keys)
            total_materials += len(record_data["materials"])
            total_suitabilities += len(record_data["requiredWorkSuitabilities"])
            gaps = []
            if not record_data["prerequisiteRelations"]:
                gaps.append({
                    "field": "prerequisiteRelations",
                    "reason": "Prerequisite structure relations are not explicitly published on PalDB structure pages.",
                    "resolution": "Leave prerequisite array empty until a direct graph source is available.",
                })

        source_page = {
            "id": f"paldb-structure-page-{record_data['sourceKey']}",
            "url": f"https://paldb.cc/en/{href}" if href else CATALOGUE_URL,
            "tier": "wiki",
            "locator": f"Structure page for {name}",
            "observedAt": emitted_at,
            "sourceVersion": "v1.0.3",
        }

        records.append({
            "id": f"structure:{record_data['sourceKey']}",
            "data": record_data,
            "version": {"gameVersion": "v1.0.3", "emittedAt": emitted_at, "generatorVersion": "paldb-structures"},
            "sources": [source_cat, source_page],
            "provenance": [{"field": key, "sourceIds": [source_page["id"]], "confidence": "corroborated"} for key in record_data],
            "gaps": gaps,
        })

    counts = {
        "catalogueRows": len(card_divs),
        "pagesSuccessfullyFetched": pages_fetched,
        "constructionMaterialRelations": total_materials,
        "requiredWorkSuitabilityRelations": total_suitabilities,
        "unlinkedStructureGaps": gaps_count,
    }

    coverage = {
        "dataset": "knowledge-structures",
        "generatedAt": emitted_at,
        "gameVersion": "v1.0.3",
        "recordCount": len(records),
        "counts": counts,
        "sourceUrls": [CATALOGUE_URL],
    }

    body = (
        "// AUTO-GENERATED by scripts/emit-knowledge-structures.py. Do not hand-edit.\n"
        f"// Source: {CATALOGUE_URL}; emitted: {emitted_at}.\n"
        'import type { EvidenceRecord } from "./knowledge";\n\n'
        "export interface StructureMaterialRequirement {\n"
        "  materialName: string;\n"
        "  quantity: number;\n"
        "}\n\n"
        "export interface StructureWorkSuitabilityRequirement {\n"
        "  suitability: string;\n"
        "  level: number;\n"
        "}\n\n"
        "export interface StructurePowerInfo {\n"
        "  type: string;\n"
        "  amount: number | null;\n"
        "}\n\n"
        "export interface StructureCapacityInfo {\n"
        "  workerMax: number | null;\n"
        "  slots: number | null;\n"
        "  workload: number | null;\n"
        "}\n\n"
        "export interface StructurePlacementInfo {\n"
        "  belongToBaseCamp: boolean | null;\n"
        "  deteriorationDamage: number | null;\n"
        "  hp: number | null;\n"
        "  hpPvp: number | null;\n"
        "  defense: number | null;\n"
        "  defensePvp: number | null;\n"
        "  code: string | null;\n"
        "}\n\n"
        "export interface StructureTechnologyUnlock {\n"
        "  level: number | null;\n"
        "  pointCost: number | null;\n"
        "  pointType: string;\n"
        "  sourceKey: string | null;\n"
        "}\n\n"
        "export interface StructureConflictRecord {\n"
        "  field: string;\n"
        "  pageValue: string | number | null;\n"
        "  catalogueValue: string | number | null;\n"
        "  description: string;\n"
        "}\n\n"
        "export interface StructureKnowledge {\n"
        "  sourceKey: string;\n"
        "  name: string;\n"
        "  category: string;\n"
        "  materials: StructureMaterialRequirement[];\n"
        "  requiredWorkSuitabilities: StructureWorkSuitabilityRequirement[];\n"
        "  power: StructurePowerInfo;\n"
        "  capacity: StructureCapacityInfo;\n"
        "  placement: StructurePlacementInfo;\n"
        "  technologyUnlock: StructureTechnologyUnlock;\n"
        "  prerequisiteRelations: string[];\n"
        "  conflicts: StructureConflictRecord[];\n"
        "}\n\n"
        "export const PALWORLD_STRUCTURES: readonly EvidenceRecord<StructureKnowledge>[] = "
        + json.dumps(records, ensure_ascii=False)
        + ";\n"
    )

    (DATA / "knowledgeStructures.ts").write_text(body, encoding="utf-8")
    COVERAGE.write_text(json.dumps(coverage, indent=2) + "\n", encoding="utf-8")
    BASELINE.parent.mkdir(parents=True, exist_ok=True)
    if not BASELINE.exists():
        BASELINE.write_text(json.dumps(coverage, indent=2) + "\n", encoding="utf-8")

    print(
        f"wrote knowledgeStructures.ts: {len(records)} structures ({pages_fetched} pages fetched, "
        f"{total_materials} materials, {total_suitabilities} required work suitabilities)"
    )


if __name__ == "__main__":
    try:
        main()
    except SourceContractError as error:
        print(f"[emit-knowledge-structures] FAILED: {error}", file=sys.stderr)
        raise SystemExit(1)
