#!/usr/bin/env python3
"""Parse all cached PalDB dungeon-family pages into exact joined boss evidence.

A source row is accepted only when it appears in the exact `Boss Spawns` card of
each of the fourteen index families.  Every family must retain that bounded
section and every published `data-pal-id` must exactly join a roster
`internalName`; otherwise parsing fails rather than manufacturing partial data.
"""
from __future__ import annotations

import html as htmllib
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup, Tag

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "scripts" / ".cache" / "acquisition" / "dungeons"
MANIFEST = ROOT / "scripts" / ".cache-manifest.json"
OUT = ROOT / "scripts" / ".cache" / "dungeon-bosses.json"
PALS = ROOT / "src" / "data" / "palworld" / "pals.ts"
EXPECTED_FAMILY_COUNT = 14
BASE_URL = "https://paldb.cc/en/"


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", htmllib.unescape(value)).strip()


def text(tag: Tag | None) -> str:
    return clean(tag.get_text(" ", strip=True)) if tag else ""


def pal_names() -> set[str]:
    return set(re.findall(r'internalName:\s*"([^"]+)"', PALS.read_text()))


def section_card(soup: BeautifulSoup, title: str) -> Tag:
    heading = next(
        (node for node in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]) if text(node) == title),
        None,
    )
    if not heading:
        raise RuntimeError(f"missing exact `{title}` heading")
    card = heading.find_parent("div", class_=lambda value: value and "card" in value)
    if not isinstance(card, Tag):
        raise RuntimeError(f"`{title}` heading is not inside a card")
    return card


def boss_rows(slug: str, family: dict[str, Any], names: set[str]) -> list[tuple[str, dict[str, Any]]]:
    path = CACHE / f"{slug}.html"
    if not path.exists():
        raise RuntimeError(f"missing cached dungeon page for family {family['name']}: {slug}")
    soup = BeautifulSoup(path.read_text(), "html5lib")
    card = section_card(soup, "Boss Spawns")
    anchors = card.select("a[data-pal-id]")
    if not anchors:
        raise RuntimeError(f"dungeon family {family['name']} ({slug}) has an empty Boss Spawns card")

    rows: list[tuple[str, dict[str, Any]]] = []
    for anchor in anchors:
        source_id = anchor.get("data-pal-id", "")
        if not source_id:
            raise RuntimeError(f"dungeon family {family['name']} ({slug}) has a boss without data-pal-id")
        # The boss data ID may use a presentation casing (for example
        # `BOSS_Icewitch`). The icon asset inside this same bounded boss row is
        # the published game identifier (`T_IceWitch_icon_normal`). Join only on
        # that exact asset suffix; no handwritten alias/case normalization exists.
        icon = anchor.find("img", src=True)
        match = re.search(r"/T_([^/]+)_icon_normal\.webp(?:$|\?)", icon["src"] if icon else "")
        if not match:
            raise RuntimeError(
                f"dungeon family {family['name']} ({slug}) boss `{source_id}` has no canonical Pal icon identifier"
            )
        internal = match.group(1)
        if internal not in names:
            raise RuntimeError(
                f"dungeon family {family['name']} ({slug}) boss `{source_id}` icon -> `{internal}` has no exact PALS internalName join"
            )
        row_container = anchor.find_parent("div", class_=lambda value: value and "d-flex" in value)
        level_text = text(row_container)
        range_match = re.search(r"\b(\d+)\s*[–-]\s*(\d+)\b", level_text)
        fixed_match = re.search(r"\b(\d+)\b\s*$", level_text)
        if range_match:
            min_level, max_level = int(range_match.group(1)), int(range_match.group(2))
        elif fixed_match:
            min_level = max_level = int(fixed_match.group(1))
        else:
            raise RuntimeError(
                f"dungeon family {family['name']} ({slug}) boss `{internal}` has no bounded numeric level: {level_text}"
            )
        rows.append(
            (
                internal,
                {
                    "sourceId": source_id,
                    "name": text(anchor),
                    "dungeon": family["name"],
                    "dungeonLevel": family["level"],
                    "minLevel": min_level,
                    "maxLevel": max_level,
                    "sourceUrl": BASE_URL + slug,
                },
            )
        )
    return rows


def main() -> None:
    manifest = json.loads(MANIFEST.read_text())
    source = manifest.get("paldb", {}).get("acquisitionPages", {}).get("dungeons")
    if not source:
        raise RuntimeError("missing dungeon manifest; run python3 scripts/fetch-paldb-dungeons.py first")
    families = source.get("families", [])
    if len(families) != EXPECTED_FAMILY_COUNT:
        raise RuntimeError(f"expected {EXPECTED_FAMILY_COUNT} manifest dungeon families, found {len(families)}")

    names = pal_names()
    joined: dict[str, list[dict[str, Any]]] = defaultdict(list)
    validated_families: list[dict[str, Any]] = []
    for family in families:
        slug = family["slug"]
        rows = boss_rows(slug, family, names)
        validated_families.append({**family, "bossCount": len(rows)})
        for internal, row in rows:
            if row not in joined[internal]:
                joined[internal].append(row)

    result = {
        "families": validated_families,
        "joined": dict(sorted(joined.items())),
        "sourceTier": 3,
        "sourceKind": "wiki-sourced",
    }
    OUT.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    print(
        f"validated {len(validated_families)} dungeon families; "
        f"joined {sum(map(len, joined.values()))} boss rows to {len(joined)} exact Pals"
    )


if __name__ == "__main__":
    main()
