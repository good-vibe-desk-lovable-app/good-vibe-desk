#!/usr/bin/env python3
"""Parse cached PalDB pages into ``scripts/.cache/paldb-parsed.json``.

Every extractor is bounded to its DOM section. The parser never interprets a
navigation link or another section as Pal data. Work suitability is read from
PalCalc's game-file export when available; the scoped PalDB result is retained
only as a cross-validation signal.
"""
from __future__ import annotations

import html as htmllib
import json
import os
import re
from collections import Counter
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup, Tag

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "scripts" / ".cache" / "paldb"
OUT = ROOT / "scripts" / ".cache" / "paldb-parsed.json"
FETCH_GAPS = ROOT / "scripts" / ".cache" / "paldb-gaps.json"
PALCALC = ROOT / "scripts" / ".cache" / "palcalc-db.json"
PALS_FILE = ROOT / "src" / "data" / "palworld" / "pals.ts"

WORK_LABELS = {
    "GenerateElectricity": "Generating Electricity",
    "MedicineProduction": "Medicine Production",
}
KNOWN_WORK_ROWS = {
    "SheepBall": [("Farming", 1), ("Handiwork", 1), ("Transporting", 1)],
    "PinkCat": [("Gathering", 1), ("Handiwork", 1), ("Mining", 1), ("Transporting", 1)],
    "Anubis": [("Handiwork", 6), ("Mining", 6), ("Transporting", 4)],
    "KabukiMan": [("Gathering", 5), ("Handiwork", 6), ("Kindling", 8), ("Transporting", 5)],
    "KingWhale": [],
}


def pals() -> list[tuple[str, str]]:
    source = PALS_FILE.read_text()
    pairs = re.findall(r'internalName:\s*"([^"]+)",\s*name:\s*"([^"]+)"', source)
    seen: set[str] = set()
    result: list[tuple[str, str]] = []
    for internal, display in pairs:
        if internal not in seen:
            seen.add(internal)
            result.append((internal, display))
    return result


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", htmllib.unescape(value)).strip()


def text(tag: Tag | None) -> str:
    return clean(tag.get_text(" ", strip=True)) if tag else ""


def class_has(tag: Tag | None, name: str) -> bool:
    return bool(tag and name in (tag.get("class") or []))


def section_card(soup: BeautifulSoup, title: str) -> Tag | None:
    """Return the card body whose direct heading has exactly ``title``."""
    for heading in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
        if text(heading) == title:
            parent = heading.parent
            if isinstance(parent, Tag) and class_has(parent, "card-body"):
                return parent
            return heading.find_parent(lambda tag: isinstance(tag, Tag) and class_has(tag, "card-body"))
    return None


def section_table(soup: BeautifulSoup, title: str) -> Tag | None:
    card = section_card(soup, title)
    return card.find("table") if card else None


def required_card(soup: BeautifulSoup, internal: str, *titles: str) -> Tag:
    for title in titles:
        card = section_card(soup, title)
        if card:
            return card
    expected = " or ".join(repr(title) for title in titles)
    raise AssertionError(f"{internal}: missing required PalDB card {expected}")


def required_table(soup: BeautifulSoup, internal: str, title: str) -> Tag:
    table = section_table(soup, title)
    if not table:
        raise AssertionError(f"{internal}: missing required PalDB table in {title!r} card")
    return table


def num(value: str) -> float | None:
    match = re.search(r"-?\d+(?:\.\d+)?", value.replace(",", ""))
    return float(match.group(0)) if match else None


def direct_divs(tag: Tag) -> list[Tag]:
    return [child for child in tag.find_all("div", recursive=False) if isinstance(child, Tag)]


def card_kv_pairs(card: Tag | None) -> dict[str, str]:
    """Read row-like key/value fields from exactly one card body."""
    if not card:
        return {}
    out: dict[str, str] = {}
    for row in card.find_all("div"):
        classes = row.get("class") or []
        if not {"d-flex", "justify-content-between", "border-bottom"}.issubset(classes):
            continue
        cells = direct_divs(row)
        if len(cells) < 2:
            continue
        key, value = text(cells[0]), text(cells[-1])
        if key and value:
            out.setdefault(key, value)
    return out


def kv_pairs(soup: BeautifulSoup, internal: str) -> dict[str, str]:
    """Read required Stats, Movement, and Others cards; never page-wide data."""
    out: dict[str, str] = {}
    for titles in (("Stats",), ("Movement",), ("Others", "Other")):
        for key, value in card_kv_pairs(required_card(soup, internal, *titles)).items():
            out.setdefault(key, value)
    return out


def others_table(soup: BeautifulSoup, internal: str) -> dict[str, str]:
    """Return key/value fields from the required bounded Others card."""
    return card_kv_pairs(required_card(soup, internal, "Others", "Other"))


def parse_work(soup: BeautifulSoup, internal: str) -> list[dict[str, Any]]:
    """Read only required ``div.workArray`` rows, never navigation links or food icons."""
    root = soup.find("div", class_="workArray")
    if not root:
        raise AssertionError(f"{internal}: missing required PalDB workArray")
    out: list[dict[str, Any]] = []
    for row in direct_divs(root):
        head = row.find("div", class_=lambda classes: classes and "justify-content-between" in classes)
        if not head:
            continue
        link = head.find("a", href=True)
        if not link:
            continue
        work = text(link)
        level_match = re.search(r"\bLv\s*(\d+)\b", text(head), re.IGNORECASE)
        if work and level_match:
            out.append({"work": work, "level": int(level_match.group(1))})
    return out


def parse_drops(soup: BeautifulSoup, internal: str) -> list[dict[str, Any]]:
    table = required_table(soup, internal, "Possible Drops")
    out: list[dict[str, Any]] = []
    for row in table.find_all("tr"):
        cells = row.find_all("td")
        if len(cells) < 4:
            continue
        item, qty, level, probability = (text(cells[index]) for index in range(4))
        if not item or item.lower() == "item":
            continue
        entry: dict[str, Any] = {"item": item, "qty": qty, "probability": probability}
        min_level = num(level)
        if min_level is not None:
            entry["minLevel"] = int(min_level)
        out.append(entry)
    return out


def parse_spawns(soup: BeautifulSoup, internal: str) -> list[dict[str, Any]]:
    # Astralym is the one current exception: it has no Spawner card, so the
    # absence stays explicit rather than being mistaken for a renamed section.
    if internal == "WorldTreeDragon":
        return []
    table = required_table(soup, internal, "Spawner")
    out: list[dict[str, Any]] = []
    for row in table.find_all("tr"):
        cells = row.find_all("td")
        if not cells:
            continue
        row_text = text(row)
        level = re.search(r"\b(\d+)\b", row_text)
        location = next(
            (
                anchor
                for anchor in row.find_all("a", href=True)
                if anchor.find("i", class_=lambda classes: classes and "fa-map-location-dot" in classes)
            ),
            None,
        )
        if location:
            name = text(location)
            coords_match = re.search(r"(-?\d+),\s*(-?\d+)\s*$", name)
            entry: dict[str, Any] = {"area": name}
            if coords_match:
                entry["area"] = name[: coords_match.start()].strip()
                entry["coords"] = [int(coords_match.group(1)), int(coords_match.group(2))]
            if level:
                entry["level"] = int(level.group(1))
            out.append(entry)
            continue
        egg = next((anchor for anchor in row.find_all("a", href=True) if "?zone=" in anchor["href"]), None)
        if egg:
            zone = egg["href"].split("?zone=", 1)[1].split("&", 1)[0]
            out.append({"area": zone, "kind": "egg"})
    return out


def parse_habitat(soup: BeautifulSoup, internal: str) -> list[dict[str, Any]]:
    # PalDB's bounded distribution card is currently titled "Map". Restrict
    # extraction to that exact card so matching the shared `?pal=...` URL shape
    # elsewhere on the page can never create habitat data.
    card = required_card(soup, internal, "Map")
    out: list[dict[str, Any]] = []
    for anchor in card.find_all("a", href=True):
        href = anchor["href"]
        match = re.search(r"^([^?]+)\?pal=[^&]+&t=(day|night)TimeLocations", href)
        count_match = re.search(r"\((\d+)\)", text(anchor))
        if match and count_match:
            out.append(
                {
                    "map": match.group(1).replace("_", " "),
                    "time": match.group(2),
                    "count": int(count_match.group(1)),
                }
            )
    return out


def parse_active_skills(soup: BeautifulSoup, internal: str) -> list[dict[str, Any]]:
    """Read individual cards inside the required Active Skills card only."""
    card = required_card(soup, internal, "Active Skills")
    out: list[dict[str, Any]] = []
    for skill in card.select(".activeSkill"):
        head = skill.select_one(".itemHead")
        if not isinstance(head, Tag):
            continue
        level_match = re.search(r"\bLv\.\s*(\d+)\b", text(head), re.IGNORECASE)
        name_anchor = head.find("a", href=True)
        if not level_match or not name_anchor:
            continue
        entry: dict[str, Any] = {"level": int(level_match.group(1)), "name": text(name_anchor)}
        info = next((child for child in direct_divs(skill) if "Power:" in text(child)), None)
        if info:
            info_text = text(info)
            element = info.select_one(".me-auto span")
            power = re.search(r"\bPower:\s*(\d+)", info_text)
            cooldown = re.search(r"(?:CoolTime|:\s*)(\d+)", info_text)
            if text(element):
                entry["element"] = text(element)
            if power:
                entry["power"] = int(power.group(1))
            if cooldown:
                entry["cooldown"] = int(cooldown.group(1))
        out.append(entry)
    return out


def parse_partner(soup: BeautifulSoup, internal: str) -> str | None:
    anchor = soup.find("a", href="Partner_Skill")
    if not anchor:
        raise AssertionError(f"{internal}: missing required PalDB Partner Skill anchor")
    card = anchor.find_parent(lambda tag: isinstance(tag, Tag) and class_has(tag, "card"))
    if not card:
        raise AssertionError(f"{internal}: Partner Skill anchor is outside its required card")
    strings = [clean(value) for value in card.stripped_strings]
    try:
        index = strings.index("Partner Skill")
    except ValueError:
        return None
    for candidate in strings[index + 1 :]:
        candidate = re.sub(r"\s+Lv\.?\s*\d+\s*$", "", candidate).strip()
        if candidate and candidate not in {"Partner Skill", "Active Skills"}:
            return candidate
    return None


def validate_required_sections(soup: BeautifulSoup, internal: str) -> None:
    """Hard-fail source-shape drift before any scoped extractor can emit empties."""
    required_card(soup, internal, "Stats")
    required_card(soup, internal, "Movement")
    required_card(soup, internal, "Others", "Other")
    if not soup.find("div", class_="workArray"):
        raise AssertionError(f"{internal}: missing required PalDB workArray")
    required_table(soup, internal, "Possible Drops")
    if internal != "WorldTreeDragon":
        required_table(soup, internal, "Spawner")
    required_card(soup, internal, "Map")
    required_card(soup, internal, "Active Skills")
    anchor = soup.find("a", href="Partner_Skill")
    if not anchor:
        raise AssertionError(f"{internal}: missing required PalDB Partner Skill anchor")
    if not anchor.find_parent(lambda tag: isinstance(tag, Tag) and class_has(tag, "card")):
        raise AssertionError(f"{internal}: Partner Skill anchor is outside its required card")


def load_palcalc_work() -> dict[str, list[dict[str, Any]]]:
    if not PALCALC.exists():
        raise SystemExit("Missing scripts/.cache/palcalc-db.json; run scripts/fetch-palcalc.py first.")
    data = json.loads(PALCALC.read_text())
    out: dict[str, list[dict[str, Any]]] = {}
    for pal in data.get("Pals", []):
        internal = pal.get("InternalName")
        suitability = pal.get("WorkSuitability")
        if not internal or not isinstance(suitability, dict):
            continue
        rows = [
            {"work": WORK_LABELS.get(work, work), "level": int(level)}
            for work, level in suitability.items()
            if isinstance(level, int) and level > 0
        ]
        out[internal] = rows
    return out


def canonical_work(rows: list[dict[str, Any]]) -> list[tuple[str, int]]:
    return sorted((row["work"], int(row["level"])) for row in rows)


def main() -> None:
    palcalc_work = load_palcalc_work()
    records: dict[str, dict[str, Any]] = {}
    gaps: list[dict[str, str]] = []
    work_conflicts: list[str] = []

    for internal, display in pals():
        path = CACHE / f"{internal}.html"
        if not path.exists():
            gaps.append({"internalName": internal, "field": "page", "reason": "not cached; parsing was not attempted"})
            continue
        # PalDB omits some closing table-cell tags. html5lib recovers that markup
        # before extraction while preserving the parser's section boundaries.
        soup = BeautifulSoup(path.read_text(errors="replace"), "html5lib")
        validate_required_sections(soup, internal)
        kv = kv_pairs(soup, internal)
        page_work = parse_work(soup, internal)
        authoritative_work = palcalc_work.get(internal)
        if authoritative_work is None:
            gaps.append(
                {
                    "internalName": internal,
                    "field": "work",
                    "reason": "absent from the PalCalc game-file export; no source-of-truth work record",
                }
            )
            work = page_work
            work_source = "paldb.cc (no PalCalc record)"
        else:
            work = authoritative_work
            work_source = "tylercamp/palcalc db.json"
            if canonical_work(page_work) != canonical_work(authoritative_work):
                work_conflicts.append(internal)

        elements = [value for value in (kv.get("ElementType1"), kv.get("ElementType2")) if value and value != "None"]
        record = {
            "internalName": internal,
            "displayName": display,
            "sourceUrl": "https://paldb.cc/en/" + display.replace(" ", "_"),
            "pageTitle": text(soup.title),
            "elements": elements,
            "stats": {
                "size": kv.get("Size"),
                "rarity": num(kv.get("Rarity", "")),
                "health": num(kv.get("Health", "")),
                "food": num(kv.get("Food", "")),
                "meleeAttack": num(kv.get("MeleeAttack", "")),
                "attack": num(kv.get("Attack", "")),
                "defense": num(kv.get("Defense", "")),
                "workSpeed": num(kv.get("Work Speed", "")),
                "support": num(kv.get("Support", "")),
                "captureRate": num(kv.get("CaptureRateCorrect", "")),
                "maleProbability": num(kv.get("MaleProbability", "")),
                "combiRank": num(kv.get("CombiRank", "")),
            },
            "movement": {
                "walkSpeed": num(kv.get("WalkSpeed", "")),
                "runSpeed": num(kv.get("RunSpeed", "")),
                "rideSprintSpeed": num(kv.get("RideSprintSpeed", "")),
                "transportSpeed": num(kv.get("TransportSpeed", "")),
                "stamina": num(kv.get("Stamina", "")),
            },
            "work": work,
            "workSource": work_source,
            "hasPalcalcWork": authoritative_work is not None,
            "drops": parse_drops(soup, internal),
            "spawns": parse_spawns(soup, internal),
            "habitat": parse_habitat(soup, internal),
            "activeSkills": parse_active_skills(soup, internal),
            "partnerSkill": parse_partner(soup, internal),
            "nocturnal": "Nocturnal" in text(required_card(soup, internal, "Stats")),
            "genus": others_table(soup, internal).get("GenusCategory"),
            "foodAmount": num(others_table(soup, internal).get("FoodAmount", "")),
        }
        if not elements:
            gaps.append({"internalName": internal, "field": "elements", "reason": "absent from the Stats/Other sections"})
        if authoritative_work is None and not page_work:
            gaps.append({"internalName": internal, "field": "work", "reason": "absent from the PalDB work container"})
        records[internal] = record

    # Each cached roster page currently exposes one bounded Map card, including
    # pages whose individual day/night counts are legitimately zero. Treat a
    # missing card as a parser/source-shape failure rather than silently emitting
    # an empty habitat module that would collapse supported wild acquisition into
    # unknown.
    missing_map_cards = [internal for internal, record in records.items() if not record["habitat"]]
    if missing_map_cards:
        raise AssertionError(
            "PalDB Map card missing or unparsed for " + ", ".join(sorted(missing_map_cards))
        )

    if FETCH_GAPS.exists():
        gaps = json.loads(FETCH_GAPS.read_text()) + gaps
    for internal, expected in KNOWN_WORK_ROWS.items():
        actual = canonical_work(records.get(internal, {}).get("work", []))
        if actual != expected:
            raise AssertionError(f"{internal} work row mismatch: expected {expected}, got {actual}")
    if records.get("WorldTreeDragon", {}).get("hasPalcalcWork"):
        raise AssertionError("WorldTreeDragon unexpectedly gained a PalCalc source-of-truth record")

    OUT.write_text(json.dumps({"records": records, "gaps": gaps}, indent=2, sort_keys=True) + "\n")
    print(f"parsed {len(records)} pals, {len(gaps)} gap entries")
    for field in ("elements", "work", "drops", "spawns", "activeSkills"):
        print(f"  {field}: {sum(bool(record[field]) for record in records.values())}/{len(records)}")
    print(f"  active skill names: {len({skill['name'] for record in records.values() for skill in record['activeSkills']})}")
    print(f"  PalDB-vs-PalCalc work conflicts: {len(work_conflicts)}")
    if work_conflicts:
        print("    " + ", ".join(work_conflicts))


if __name__ == "__main__":
    main()
