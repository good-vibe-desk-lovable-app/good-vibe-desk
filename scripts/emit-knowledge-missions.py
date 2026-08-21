"""Emit source-backed Palworld mission records from bounded PalDB mission cards."""
from __future__ import annotations

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
URL = "https://paldb.cc/en/Mission"
CACHE = ROOT / "scripts" / ".cache" / "knowledge-missions.html"
COVERAGE = DATA / "knowledgeMissions.coverage.json"
BASELINE = ROOT / "scripts" / "coverage-baselines" / "knowledge-missions.json"


def text(tag: Tag | None) -> str:
    return " ".join(tag.get_text(" ", strip=True).split()) if tag else ""


def fetch() -> str:
    request = Request(URL, headers={"User-Agent": "good-vibe-desk data generator/1.0"})
    with urlopen(request, timeout=30) as response:
        payload = response.read().decode("utf-8")
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(payload)
    return payload


def field_after_label(container: Tag, label: str) -> str | None:
    label_node = next((node for node in container.select(".half-bottom-row") if text(node) == label), None)
    if label_node is None:
        return None
    next_node = label_node.find_next_sibling("div")
    value = text(next_node)
    return value or None


def coordinates(container: Tag) -> list[dict[str, int | str]]:
    values = []
    for anchor in container.select('a[href*="Palpagos_Islands?pos="]'):
        match = re.search(r"pos=(-?\d+)%2C(-?\d+)", anchor.get("href", ""))
        if match:
            values.append({"name": text(anchor), "x": int(match.group(1)), "y": int(match.group(2))})
    return values


def parse_section(section_title: str, expected_kind: str, soup: BeautifulSoup) -> list[dict[str, object]]:
    section = require_exact_section(soup, page=URL, title=section_title)
    cards: list[Tag] = []
    for node in section.nodes:
        cards.extend(node.select("div.col > div.d-flex.border.rounded"))
    if not cards:
        raise SourceContractError(f"{URL}: {section_title} has no bounded mission cards.")
    results = []
    for card in cards:
        title_node = card.select_one("[data-id]")
        if title_node is None:
            raise SourceContractError(f"{URL}: {section_title} mission card lacks stable data-id.")
        source_id = title_node["data-id"]
        title = text(title_node)
        body = title_node.find_parent(class_="p-2")
        if not source_id or body is None:
            raise SourceContractError(f"{URL}: mission card lacks a source identifier or card body.")
        children = [child for child in body.find_all("div", recursive=False)]
        try:
            title_index = children.index(title_node)
        except ValueError as error:
            raise SourceContractError(f"{URL}: mission {source_id} title cannot be located in card body.") from error
        kind = text(children[title_index + 1]) if len(children) > title_index + 1 else ""
        description = text(children[title_index + 2]) if len(children) > title_index + 2 else ""
        if kind != expected_kind:
            raise SourceContractError(f"{URL}: mission {source_id} violates {expected_kind!r} card contract.")
        results.append({
            "sourceId": source_id,
            "title": title or None,
            "kind": expected_kind,
            "description": description or None,
            "objective": field_after_label(body, "Objective"),
            "reward": field_after_label(body, "Reward"),
            "next": field_after_label(body, "Next"),
            "mapTargets": coordinates(body),
        })
    return results


def main() -> None:
    soup = BeautifulSoup(fetch(), "html.parser")
    missions = parse_section("Main Mission /58", "Main Mission", soup) + parse_section("Sub Mission /59", "Sub Mission", soup)
    ids = [record["sourceId"] for record in missions]
    if len(ids) != len(set(ids)):
        duplicates = sorted({item for item in ids if ids.count(item) > 1})
        raise SourceContractError(f"{URL}: duplicate mission data-id values: {duplicates[:5]}.")
    emitted_at = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    source = {"id": "paldb-missions", "url": URL, "tier": "wiki", "locator": "Main Mission /58 and Sub Mission /59 bounded cards", "observedAt": emitted_at, "sourceVersion": "v1.0.3"}
    payload = [{"id": f"mission:{record['sourceId']}", "data": record, "version": {"gameVersion": "v1.0.3", "emittedAt": emitted_at, "generatorVersion": "paldb-missions"}, "sources": [source], "provenance": [{"field": key, "sourceIds": [source["id"]], "confidence": "corroborated"} for key in record], "gaps": ([{"field": "title", "reason": "The bounded source card supplies a stable mission identifier but renders no title text.", "resolution": "Retain title as UNKNOWN until a versioned source supplies it."}] if record["title"] is None else []) + ([{"field": "description", "reason": "The bounded source card supplies a stable mission identifier but renders no narrative text.", "resolution": "Retain description as UNKNOWN until a versioned source supplies it."}] if record["description"] is None else [])} for record in missions]
    counts = {"main": sum(record["kind"] == "Main Mission" for record in missions), "sub": sum(record["kind"] == "Sub Mission" for record in missions), "withMapTargets": sum(bool(record["mapTargets"]) for record in missions), "untitled": sum(record["title"] is None for record in missions), "undocumentedDescription": sum(record["description"] is None for record in missions)}
    coverage = {"dataset": "knowledge-missions", "generatedAt": emitted_at, "gameVersion": "v1.0.3", "recordCount": len(payload), "counts": counts, "sourceUrls": [URL]}
    ts = "\n".join([
        "// AUTO-GENERATED by scripts/emit-knowledge-missions.py. Do not hand-edit.",
        f"// Source: {URL}; emitted: {emitted_at}.",
        'import type { EvidenceRecord } from "./knowledge";',
        "",
        "export interface MissionKnowledge {",
        "  sourceId: string;",
        "  title: string | null;",
        '  kind: "Main Mission" | "Sub Mission";',
        "  description: string | null;",
        "  objective: string | null;",
        "  reward: string | null;",
        "  next: string | null;",
        "  mapTargets: readonly { name: string; x: number; y: number }[];",
        "}",
        "",
        "export const PALWORLD_MISSIONS: readonly EvidenceRecord<MissionKnowledge>[] = " + json.dumps(payload, ensure_ascii=False) + ";",
        "",
    ])
    (DATA / "knowledgeMissions.ts").write_text(ts)
    COVERAGE.write_text(json.dumps(coverage, indent=2) + "\n")
    BASELINE.parent.mkdir(parents=True, exist_ok=True)
    if not BASELINE.exists():
        BASELINE.write_text(json.dumps(coverage, indent=2) + "\n")
    print(f"wrote knowledgeMissions.ts: {len(payload)} records ({counts['main']} main, {counts['sub']} sub)")


if __name__ == "__main__":
    try:
        main()
    except SourceContractError as error:
        print(f"[emit-knowledge-missions] FAILED: {error}", file=sys.stderr)
        raise SystemExit(1)
