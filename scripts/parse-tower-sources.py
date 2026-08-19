#!/usr/bin/env python3
"""Cross-check two curated tower-boss rosters into persistent per-entry evidence.

Only pairs with the same leader, Pal, and normal-mode level in both bounded
source tables are emitted.  A source-only or conflicting pair is preserved in
`excluded` and never guessed into the app dataset.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup, Tag

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "scripts" / ".cache" / "acquisition" / "tower"
MANIFEST = ROOT / "scripts" / ".cache-manifest.json"
PALS = ROOT / "src" / "data" / "palworld" / "pals.ts"
OUT = ROOT / "scripts" / ".cache" / "tower-bosses.json"


def text(tag: Tag | None) -> str:
    return re.sub(r"\s+", " ", tag.get_text(" ", strip=True)).strip() if tag else ""


def table_with_headers(soup: BeautifulSoup, expected: list[str]) -> Tag:
    for table in soup.find_all("table"):
        headers = [text(cell) for cell in table.find_all("th")]
        if headers[: len(expected)] == expected:
            return table
    raise RuntimeError("required tower roster table not found: " + " | ".join(expected))


def pair(value: str) -> tuple[str, str]:
    parts = re.split(r"\s+(?:and|&)\s+", value)
    if len(parts) != 2 or not all(parts):
        raise RuntimeError(f"tower boss cell is not an exact leader/Pal pair: {value!r}")
    return parts[0], parts[1]


def wiki_roster() -> dict[tuple[str, str], dict[str, Any]]:
    soup = BeautifulSoup((CACHE / "palworldWiki.html").read_text(), "html5lib")
    table = table_with_headers(soup, ["Tower Name", "Region", "Coordinates", "Boss", "Normal Level", "Hardmode Level"])
    rows: dict[tuple[str, str], dict[str, Any]] = {}
    for row in table.find_all("tr"):
        cells = row.find_all("td")
        if not cells:
            continue
        values = [text(cell) for cell in cells]
        if len(values) != 6:
            raise RuntimeError(f"wiki.gg tower row has {len(values)} cells: {values}")
        leader, pal = pair(values[3])
        if not values[4].isdigit() or not values[5].isdigit():
            raise RuntimeError(f"wiki.gg tower row has non-numeric level: {values}")
        key = leader, pal
        if key in rows:
            raise RuntimeError(f"duplicate wiki.gg tower pair: {key}")
        rows[key] = {
            "tower": values[0],
            "region": values[1],
            "coordinates": values[2],
            "normalLevel": int(values[4]),
            "hardModeLevel": int(values[5]),
        }
    if not rows:
        raise RuntimeError("wiki.gg tower roster table was empty")
    return rows


def game8_roster() -> dict[tuple[str, str], dict[str, Any]]:
    soup = BeautifulSoup((CACHE / "game8.html").read_text(), "html5lib")
    table = table_with_headers(soup, ["Tower Boss", "Map Location", "Overworld Image"])
    rows: dict[tuple[str, str], dict[str, Any]] = {}
    for row in table.find_all("tr"):
        cells = row.find_all("td")
        if not cells:
            continue
        values = [text(cell) for cell in cells]
        if not values or not values[0]:
            continue
        # The table renders each boss in a first row and the location/weakness
        # detail in a second rowspan row. The latter is deliberately ignored only
        # when it has this exact source-labelled shape.
        if len(values) == 1 and re.match(r"^Weakness\s*:", values[0]):
            continue
        match = re.fullmatch(r"(.+?)\s*Lv\.?\s*(\d+)", values[0])
        if not match:
            raise RuntimeError(f"Game8 tower row has no bounded pair/level cell: {values}")
        leader, pal = pair(match.group(1).strip())
        key = leader, pal
        if key in rows:
            raise RuntimeError(f"duplicate Game8 tower pair: {key}")
        rows[key] = {"normalLevel": int(match.group(2))}
    if not rows:
        raise RuntimeError("Game8 tower roster table was empty")
    return rows


def pal_lookup() -> dict[str, str]:
    pairs = re.findall(r'internalName:\s*"([^"]+)",\s*name:\s*"([^"]+)"', PALS.read_text())
    return {display: internal for internal, display in pairs}


def main() -> None:
    wiki = wiki_roster()
    game8 = game8_roster()
    source_meta = json.loads(MANIFEST.read_text()).get("towerSources", {}).get("sources", {})
    if set(source_meta) != {"palworldWiki", "game8"}:
        raise RuntimeError("missing independently fetched tower source provenance")

    lookup = pal_lookup()
    shared = sorted(set(wiki) & set(game8), key=lambda key: (wiki[key]["normalLevel"], key))
    records: list[dict[str, Any]] = []
    for leader, pal in shared:
        wiki_row = wiki[(leader, pal)]
        game8_row = game8[(leader, pal)]
        if wiki_row["normalLevel"] != game8_row["normalLevel"]:
            continue
        if pal not in lookup:
            raise RuntimeError(f"two-source tower Pal `{pal}` has no exact PALS display-name join")
        records.append(
            {
                "tower": wiki_row["tower"],
                "region": wiki_row["region"],
                "coordinates": wiki_row["coordinates"],
                "leader": leader,
                "pal": pal,
                "internalName": lookup[pal],
                "normalLevel": wiki_row["normalLevel"],
                "hardModeLevel": wiki_row["hardModeLevel"],
                "sourceTier": 3,
                "sourceKind": "wiki-corroborated",
                "sources": [
                    {"name": "Palworld Wiki", "url": source_meta["palworldWiki"]["url"]},
                    {"name": "Game8", "url": source_meta["game8"]["url"]},
                ],
            }
        )

    excluded = {
        "palworldWikiOnly": [" and ".join(key) for key in sorted(set(wiki) - set(game8))],
        "game8Only": [" and ".join(key) for key in sorted(set(game8) - set(wiki))],
        "levelDisagreements": [
            {
                "pair": " and ".join(key),
                "palworldWiki": wiki[key]["normalLevel"],
                "game8": game8[key]["normalLevel"],
            }
            for key in sorted(set(wiki) & set(game8))
            if wiki[key]["normalLevel"] != game8[key]["normalLevel"]
        ],
    }
    if not records:
        raise RuntimeError("no two-source-agreed tower entries; refusing to emit guessed tower data")

    OUT.write_text(json.dumps({"records": records, "excluded": excluded}, indent=2, sort_keys=True) + "\n")
    print(
        f"emitted {len(records)} two-source-agreed tower entries; "
        f"excluded wiki-only={len(excluded['palworldWikiOnly'])}, "
        f"game8-only={len(excluded['game8Only'])}, level-disagreements={len(excluded['levelDisagreements'])}"
    )


if __name__ == "__main__":
    main()
