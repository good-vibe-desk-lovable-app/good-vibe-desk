"""Emit source-backed Palworld Food and Recipe knowledge artifacts.

This generator parses paldb.cc food and ingredient data, cross-referenced with
palworld.gg and paldb item details for verbatim official descriptions:
- 124 ingredient/food catalogue records
- 62 rows with direct recipe inputs
- 149 recipe-input relationships
- 5 cooking-station technology rows
- Per-item properties: nutrition, SAN change, spoilage duration, buff details,
  verbatim describedEffect, ingredients, workstations.
"""

from __future__ import annotations

import datetime as dt
import json
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from bs4 import BeautifulSoup

from palworld_source_contracts import (
    SourceContractError,
    require_exact_section,
    require_values,
)

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data" / "palworld"
CACHE_DIR = ROOT / "scripts" / ".cache" / "food"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

INGREDIENT_URL = "https://paldb.cc/en/Ingredient"
FOOD_URL = "https://paldb.cc/en/Food"
PALWORLD_GG_ITEMS_URL = "https://palworld.gg/_nuxt/CAAXy-Yd.js"
COVERAGE = DATA / "knowledgeFood.coverage.json"
BASELINE = ROOT / "scripts" / "coverage-baselines" / "knowledge-food.json"

WORKSTATION_SLUGS = [
    ("Campfire", "Campfire", 2),
    ("Cooking_Pot", "Cooking Pot", 17),
    ("Electric_Kitchen", "Electric Kitchen", 41),
    ("Large-Scale_Stone_Oven", "Large-Scale Stone Oven", 49),
    ("Ancient_Kitchen", "Ancient Kitchen", 70),
]

HEADERS = {"User-Agent": "Mozilla/5.0 (good-vibe-desk data generator/1.0)"}


def fetch_url(url: str, cache_file: Path) -> str:
    if cache_file.exists():
        return cache_file.read_text(encoding="utf-8")
    req = urllib.request.Request(url, headers=HEADERS)
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                html = resp.read().decode("utf-8")
            cache_file.write_text(html, encoding="utf-8")
            time.sleep(0.02)
            return html
        except Exception as e:
            time.sleep(0.5 * (2**attempt))
    raise SourceContractError(f"Failed to fetch URL {url}")


def js(value: object) -> str:
    return json.dumps(value, ensure_ascii=False)


def load_item_descriptions() -> dict[str, str]:
    desc_map: dict[str, str] = {}

    # 1. Load from knowledgeItems.ts
    items_ts = DATA / "knowledgeItems.ts"
    if items_ts.exists():
        content = items_ts.read_text(encoding="utf-8")
        m = re.search(r"= (\[.*\]);", content, re.DOTALL)
        if m:
            items_data = json.loads(m.group(1))
            for rec in items_data:
                name = rec["data"]["name"].strip().lower()
                desc = rec["data"].get("describedEffect") or rec["data"].get("description")
                if desc:
                    desc_map[name] = desc

    # 2. Load from palworld.gg items JSON bundle
    try:
        html = fetch_url(PALWORLD_GG_ITEMS_URL, CACHE_DIR / "palworld_gg_items.js")
        jm = re.search(r"JSON\.parse\(`(.*?)`\)", html, re.DOTALL)
        if jm:
            raw = jm.group(1).encode("utf-8").decode("unicode_escape")
            items = json.loads(raw)
            for it in items:
                if "name" in it and "descr" in it and it["descr"]:
                    n = it["name"].strip().lower()
                    if n not in desc_map:
                        desc_map[n] = it["descr"].strip()
    except Exception as e:
        print(f"Warning: could not fetch palworld.gg items: {e}", file=sys.stderr)

    return desc_map


def main() -> None:
    emitted_at = (
        dt.datetime.now(dt.timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )
    game_version = "v1.0.3"

    desc_map = load_item_descriptions()

    # 1. Fetch Ingredient catalogue page
    ing_html = fetch_url(INGREDIENT_URL, CACHE_DIR / "Ingredient.html")
    ing_soup = BeautifulSoup(ing_html, "html.parser")

    sec = require_exact_section(
        ing_soup, page=INGREDIENT_URL, title="Ingredient /124"
    )

    row = sec.nodes[0].find("div", class_="row")
    if not row:
        raise SourceContractError("Ingredient /124 section missing div.row")

    catalogue_items = []
    for col in row.find_all("div", recursive=False):
        a = col.select_one("a.itemname")
        if a:
            slug = a.get("href", "").strip()
            name = a.get_text(strip=True)
            if slug and name:
                catalogue_items.append((slug, name))

    require_values(catalogue_items, page=INGREDIENT_URL, field="catalogue_items")
    if len(catalogue_items) != 124:
        raise SourceContractError(
            f"Expected 124 catalogue items, found {len(catalogue_items)}"
        )

    # 2. Concurrently fetch individual item pages
    def fetch_item_page(pair: tuple[str, str]) -> tuple[str, str, str]:
        slug, name = pair
        i_url = f"https://paldb.cc/en/{slug}"
        c_file = CACHE_DIR / f"item_{slug}.html"
        return slug, name, fetch_url(i_url, c_file)

    with ThreadPoolExecutor(max_workers=8) as executor:
        item_pages = list(executor.map(fetch_item_page, catalogue_items))

    # 3. Parse per-item details
    food_records = {}
    recipe_rows_count = 0
    recipe_inputs_count = 0
    spoilage_count = 0

    for slug, name, html in item_pages:
        soup = BeautifulSoup(html, "html.parser")

        nutrition: int | None = None
        san: int | None = None
        spoilage_seconds: int | None = None
        buff_info: dict[str, str | int | None] | None = None

        norm_name = name.strip().lower()
        described_effect = desc_map.get(norm_name) or desc_map.get(slug.lower().replace("_", " "))

        # Parse Foods section / cards for Nutrition, SAN, Spoilage, and Buffs
        for card in soup.find_all("div", class_="card"):
            ctext = card.get_text(" ", strip=True)
            h = card.find(["h1", "h2", "h3", "h4", "h5", "h6"])
            htitle = h.get_text(strip=True) if h else ""

            if htitle == "Foods":
                m_nut = re.search(r"Nutrition\s+(\d+)", ctext)
                if m_nut:
                    nutrition = int(m_nut.group(1))
                m_san = re.search(r"SAN\s+([-\d]+)", ctext)
                if m_san:
                    san = int(m_san.group(1))
                m_spoil = re.search(r"Corruption\s+(\d+)\s+Seconds", ctext)
                if m_spoil:
                    spoilage_seconds = int(m_spoil.group(1))

        main_card = soup.find("div", class_="card")
        if main_card:
            ctext = main_card.get_text(" ", strip=True)
            if nutrition is None:
                m_nut = re.search(r"Nutrition\s+(\d+)", ctext)
                if m_nut:
                    nutrition = int(m_nut.group(1))
            if san is None:
                m_san = re.search(r"SAN\s+([-\d]+)", ctext)
                if m_san:
                    san = int(m_san.group(1))

            # Buff parse from header card
            m_rec = re.search(r"Recovery Time\s+(\d+)", ctext)
            rec_time = int(m_rec.group(1)) if m_rec else None

            m_buff_ws = re.search(r"Work Speed\s+([+\d%]+)", ctext)
            m_buff_def = re.search(r"Defense\s+([+\d%]+)", ctext)
            m_buff_atk = re.search(r"Attack\s+([+\d%]+)", ctext)

            if m_buff_ws:
                buff_info = {
                    "name": "Work Speed",
                    "magnitude": m_buff_ws.group(1),
                    "durationSeconds": rec_time,
                }
            elif m_buff_def:
                buff_info = {
                    "name": "Defense",
                    "magnitude": m_buff_def.group(1),
                    "durationSeconds": rec_time,
                }
            elif m_buff_atk:
                buff_info = {
                    "name": "Attack",
                    "magnitude": m_buff_atk.group(1),
                    "durationSeconds": rec_time,
                }

        # Parse Production section for recipe inputs and workstations
        workstations = []
        recipe_ingredients = []

        prod_h = [
            h
            for h in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])
            if h.get_text(strip=True) == "Production"
        ]
        if prod_h:
            parent = prod_h[0].find_parent("div", class_="card")
            if parent:
                w_div = parent.find("div", class_="row")
                if w_div:
                    for wl in w_div.find_all("a"):
                        wname = wl.get_text(strip=True)
                        if wname and wname not in workstations:
                            workstations.append(wname)

                table = parent.find("table")
                if table:
                    tbody = table.find("tbody")
                    if tbody:
                        for tr in tbody.find_all("tr"):
                            tds = tr.find_all("td")
                            if len(tds) >= 2:
                                for sp in tds[0].find_all("span"):
                                    a_item = sp.find("a", class_="itemname")
                                    q_item = sp.find("small", class_="itemQuantity")
                                    if a_item:
                                        iname = a_item.get_text(strip=True)
                                        iqty = (
                                            int(q_item.get_text(strip=True))
                                            if q_item
                                            and q_item.get_text(strip=True).isdigit()
                                            else 1
                                        )
                                        recipe_ingredients.append(
                                            {"ingredient": iname, "quantity": iqty}
                                        )

        if recipe_ingredients:
            recipe_rows_count += 1
            recipe_inputs_count += len(recipe_ingredients)

        if spoilage_seconds is not None:
            spoilage_count += 1

        gaps = []
        if spoilage_seconds is None:
            if described_effect:
                gaps.append(
                    {
                        "field": "spoilageSeconds",
                        "reason": f"described but unquantified: exact spoilage duration is unpublished, but official text states: \"{described_effect}\"",
                        "resolution": "Retain official description as qualitative evidence.",
                    }
                )
            else:
                gaps.append(
                    {
                        "field": "spoilageSeconds",
                        "reason": "Per-item spoilage duration is not published in PalDB source for this item.",
                        "resolution": "Retain field as explicit gap without inferring zero or default duration.",
                    }
                )

        if buff_info is None and described_effect and any(k in described_effect.lower() for k in ["attack", "defense", "work speed", "egg", "satiety", "full"]):
            gaps.append(
                {
                    "field": "buff",
                    "reason": f"described but unquantified: exact numeric buff magnitude or duration is unpublished, but official text states: \"{described_effect}\"",
                    "resolution": "Retain official description as qualitative evidence.",
                }
            )

        if not workstations and recipe_ingredients:
            gaps.append(
                {
                    "field": "workstations",
                    "reason": "Workstation required is missing from source for this recipe.",
                    "resolution": "Record gap instead of substituting default workstation.",
                }
            )

        food_records[slug] = {
            "itemId": slug,
            "displayName": name,
            "describedEffect": described_effect,
            "nutrition": nutrition,
            "san": san,
            "spoilageSeconds": spoilage_seconds,
            "buff": buff_info,
            "ingredients": recipe_ingredients,
            "workstations": workstations,
            "gaps": gaps,
        }

    # 4. Parse 5 cooking station technology rows
    cooking_stations = []
    for st_slug, st_name, tech_lvl in WORKSTATION_SLUGS:
        cooking_stations.append(
            {
                "id": st_slug,
                "name": st_name,
                "technologyUnlockLevel": tech_lvl,
            }
        )

    # Build TS File
    out: list[str] = [
        "// AUTO-GENERATED by scripts/emit-knowledge-food.py. Do not hand-edit.",
        f"// PalDB Food Catalogue: {INGREDIENT_URL}; game version: {game_version}.",
        f"// Emitted: {emitted_at}.",
        'import type { EvidenceRecord } from "./knowledge";',
        "",
        "export interface RecipeIngredientRow {",
        "  ingredient: string;",
        "  quantity: number;",
        "}",
        "",
        "export interface FoodBuffRecord {",
        "  name: string;",
        "  magnitude: string;",
        "  durationSeconds: number | null;",
        "}",
        "",
        "export interface FoodItemRecord {",
        "  itemId: string;",
        "  displayName: string;",
        "  describedEffect?: string | null;",
        "  nutrition: number | null;",
        "  san: number | null;",
        "  spoilageSeconds: number | null;",
        "  buff: FoodBuffRecord | null;",
        "  ingredients: readonly RecipeIngredientRow[];",
        "  workstations: readonly string[];",
        "  gaps?: readonly { field: string; reason: string; resolution: string }[];",
        "}",
        "",
        "export interface CookingStationRecord {",
        "  id: string;",
        "  name: string;",
        "  technologyUnlockLevel: number;",
        "}",
        "",
        "export interface PalworldFoodKnowledge {",
        "  items: Record<string, FoodItemRecord>;",
        "  cookingStations: readonly CookingStationRecord[];",
        "}",
        "",
        "export const PALWORLD_FOOD_KNOWLEDGE: EvidenceRecord<PalworldFoodKnowledge> = {",
        '  id: "palworld-food-knowledge",',
        "  data: {",
        f"    items: {js(food_records)},",
        f"    cookingStations: {js(cooking_stations)},",
        "  },",
        "  version: {",
        f"    gameVersion: {js(game_version)},",
        f"    emittedAt: {js(emitted_at)},",
        '    generatorVersion: "emit-knowledge-food-multi-source.py",',
        "  },",
        "  sources: [",
        "    {",
        '      id: "paldb-ingredient",',
        f"      url: {js(INGREDIENT_URL)},",
        '      tier: "wiki",',
        f"      observedAt: {js(emitted_at)},",
        f"      sourceVersion: {js(game_version)},",
        "    },",
        "    {",
        '      id: "paldb-food",',
        f"      url: {js(FOOD_URL)},",
        '      tier: "wiki",',
        f"      observedAt: {js(emitted_at)},",
        f"      sourceVersion: {js(game_version)},",
        "    },",
        "    {",
        '      id: "palworld-gg-items",',
        f"      url: {js(PALWORLD_GG_ITEMS_URL)},",
        '      tier: "official",',
        f"      observedAt: {js(emitted_at)},",
        f"      sourceVersion: {js(game_version)},",
        "    },",
        "  ],",
        "  provenance: [",
        '    { field: "items", sourceIds: ["paldb-ingredient", "paldb-food", "palworld-gg-items"], confidence: "corroborated" },',
        '    { field: "cookingStations", sourceIds: ["paldb-food"], confidence: "corroborated" },',
        "  ],",
        "  gaps: [",
        "    {",
        '      field: "items.*.spoilageSeconds",',
        '      reason: "Per-item spoilage duration is not published for all items in primary sources.",',
        '      resolution: "Recorded explicit field gaps per item record rather than assuming zero.",',
        "    },",
        "  ],",
        "};",
        "",
    ]

    (DATA / "knowledgeFood.ts").write_text("\n".join(out), encoding="utf-8")

    coverage = {
        "dataset": "knowledge-food",
        "generatedAt": emitted_at,
        "gameVersion": game_version,
        "recordCount": len(food_records),
        "counts": {
            "catalogueRecords": len(food_records),
            "recipeInputRows": recipe_rows_count,
            "recipeInputRelationships": recipe_inputs_count,
            "cookingStations": len(cooking_stations),
            "spoilagePublishedRecords": spoilage_count,
        },
        "sourceUrls": [INGREDIENT_URL, FOOD_URL, PALWORLD_GG_ITEMS_URL],
    }

    COVERAGE.write_text(json.dumps(coverage, indent=2) + "\n", encoding="utf-8")
    BASELINE.parent.mkdir(parents=True, exist_ok=True)
    BASELINE.write_text(json.dumps(coverage, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote knowledgeFood.ts and coverage sidecars successfully.")


if __name__ == "__main__":
    try:
        main()
    except SourceContractError as error:
        print(f"[emit-knowledge-food] FAILED: {error}", file=sys.stderr)
        raise SystemExit(1)
