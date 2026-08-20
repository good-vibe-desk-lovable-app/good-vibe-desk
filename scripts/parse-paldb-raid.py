#!/usr/bin/env python3
"""Parse PalDB's bounded Summoning Altar roster into joined raid evidence.

Only cards identified by `data-pal-id="RAID_*"` inside the `Summoning Altar /11`
card are accepted.  The game internal name is derived from that published
identifier, not from a display label or Paldeck number.
"""
from __future__ import annotations

import html as htmllib
import json
import re
from pathlib import Path

from bs4 import BeautifulSoup, Tag

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "scripts" / ".cache" / "acquisition" / "raid.html"
OUT = ROOT / "scripts" / ".cache" / "raid-bosses.json"
PALS = ROOT / "src" / "data" / "palworld" / "pals.ts"
SOURCE_URL = "https://paldb.cc/en/Raid"
EXPECTED_RAID_CARD_COUNT = 11
NON_ROSTER_RAID_IDS = {"RAID_YakushimaBoss002", "RAID_YakushimaBoss002_2"}


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", htmllib.unescape(value)).strip()


def text(tag: Tag | None) -> str:
    return clean(tag.get_text(" ", strip=True)) if tag else ""


def pal_names() -> set[str]:
    return set(re.findall(r'internalName:\s*"([^"]+)"', PALS.read_text()))


def summoning_altar(soup: BeautifulSoup) -> Tag:
    heading = next(
        (
            node
            for node in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])
            if text(node).startswith("Summoning Altar")
        ),
        None,
    )
    if not heading:
        raise RuntimeError("PalDB raid source has no Summoning Altar heading")
    card = heading.find_parent("div", class_=lambda c: c and "card" in c)
    if not isinstance(card, Tag):
        raise RuntimeError("PalDB raid source Summoning Altar heading is not inside a card")
    return card


def parse() -> dict[str, object]:
    soup = BeautifulSoup(HTML.read_text(), "html5lib")
    card = summoning_altar(soup)
    source_rows = card.select('a[data-pal-id^="RAID_"]')
    if len(source_rows) != EXPECTED_RAID_CARD_COUNT:
        raise RuntimeError(
            f"expected {EXPECTED_RAID_CARD_COUNT} PalDB Summoning Altar cards, found {len(source_rows)}"
        )

    names = pal_names()
    out: dict[str, list[dict[str, object]]] = {}
    unmatched: list[dict[str, object]] = []
    for anchor in source_rows:
        raw_id = anchor.get("data-pal-id", "")
        internal = re.sub(r"^RAID_", "", raw_id)
        internal = re.sub(r"_2$", "", internal)
        name = text(anchor)
        parent = anchor.find_parent("div", class_=lambda c: c and "flex-grow-1" in c)
        level_match = re.search(r"\bLevel:\s*(\d+)\b", text(parent))
        row = {
            "sourceId": raw_id,
            "name": name,
            "level": int(level_match.group(1)) if level_match else None,
            "sourceUrl": SOURCE_URL,
        }
        if internal not in names:
            unmatched.append(row)
            continue
        out.setdefault(internal, []).append(row)

    unexpected = [row["sourceId"] for row in unmatched if row["sourceId"] not in NON_ROSTER_RAID_IDS]
    if unexpected:
        raise RuntimeError("unexpected non-roster PalDB raid identifiers: " + ", ".join(sorted(unexpected)))
    return {"joined": out, "unmatched": unmatched}


def main() -> None:
    if not HTML.exists():
        raise RuntimeError("missing raid cache; run python3 scripts/fetch-paldb-raid.py first")
    parsed = parse()
    records = parsed["joined"]
    if set(records) != {"NightLady", "NightLady_Dark", "KingBahamut_Dragon", "DarkMechaDragon", "LegendDeer"}:
        raise RuntimeError("unexpected joined raid Pal set: " + ", ".join(sorted(records)))
    OUT.write_text(json.dumps(parsed, indent=2, sort_keys=True) + "\n")
    print(f"parsed {sum(map(len, records.values()))} raid cards for {len(records)} Pals; {len(parsed['unmatched'])} source cards remain non-roster")


if __name__ == "__main__":
    main()
