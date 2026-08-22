"""Emit source-backed fixed field Alpha encounter records from PalDB's map asset.

This is deliberately separate from the existing dungeon, raid, and tower channels.
Only map records in the explicitly named ``fixedDungeon`` assignment that declare
both ``type: Alpha Pal`` and ``comment: Field Boss`` are emitted. Raw game-space
positions are preserved verbatim; the emitter does not infer player-map
coordinates from renderer transformations.
"""
from __future__ import annotations

import datetime as dt
import json
import re
import sys
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup

from palworld_source_contracts import SourceContractError

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data" / "palworld"
MAP_PAGE = "https://paldb.cc/en/Palpagos_Islands"
CACHE_ROOT = ROOT / "scripts" / ".cache" / "knowledge-field-alphas"
COVERAGE = DATA / "knowledgeFieldAlphas.coverage.json"
BASELINE = ROOT / "scripts" / "coverage-baselines" / "knowledge-field-alphas.json"


def fetch(url: str, cache_path: Path) -> str:
    if cache_path.exists():
        return cache_path.read_text()
    request = Request(url, headers={"User-Agent": "good-vibe-desk data generator/1.0"})
    with urlopen(request, timeout=45) as response:
        payload = response.read().decode("utf-8")
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(payload)
    return payload


def balanced_value(text: str, *, assignment: str, opening: str, closing: str) -> str:
    match = re.search(rf"\b{re.escape(assignment)}\s*=\s*{re.escape(opening)}", text)
    if match is None:
        raise SourceContractError(f"map asset: required assignment {assignment!r} was not found.")
    start = match.end() - 1
    depth = 0
    in_string = False
    escaped = False
    for index, char in enumerate(text[start:], start=start):
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
        elif char == opening:
            depth += 1
        elif char == closing:
            depth -= 1
            if depth == 0:
                return text[start : index + 1]
    raise SourceContractError(f"map asset: assignment {assignment!r} is not balanced.")


def map_asset_url() -> str:
    html = fetch(MAP_PAGE, CACHE_ROOT / "map.html")
    soup = BeautifulSoup(html, "html.parser")
    candidates = [script.get("src", "") for script in soup.select("script[src]") if "map_data_en.js" in script.get("src", "")]
    if len(candidates) != 1:
        raise SourceContractError(f"{MAP_PAGE}: expected one map_data_en.js script, found {len(candidates)}.")
    return urljoin(MAP_PAGE, candidates[0])


def plain_text(html: str) -> str:
    return " ".join(BeautifulSoup(html, "html.parser").get_text(" ", strip=True).split())


def main() -> None:
    asset_url = map_asset_url()
    js = fetch(asset_url, CACHE_ROOT / "map_data_en.source")
    records_raw = json.loads(balanced_value(js, assignment="fixedDungeon", opening="[", closing="]"))
    if not isinstance(records_raw, list) or not records_raw:
        raise SourceContractError(f"{asset_url}: fixedDungeon is empty or not an array.")

    alpha_candidates = [record for record in records_raw if record.get("type") == "Alpha Pal"]
    unknown_alpha_comments = sorted({record.get("comment") for record in alpha_candidates if record.get("comment") not in {"Field Boss", "Dungeon Boss"}})
    if unknown_alpha_comments:
        raise SourceContractError(f"{asset_url}: Alpha records have unknown encounter comments: {unknown_alpha_comments!r}.")
    selected = [record for record in alpha_candidates if record.get("comment") == "Field Boss"]
    if not selected:
        raise SourceContractError(f"{asset_url}: fixedDungeon contains no Alpha Field Boss records.")
    records: list[dict[str, object]] = []
    for record in selected:
        source_id = record.get("id")
        level = record.get("lv")
        item = record.get("item")
        position = record.get("pos")
        comment = record.get("comment")
        if not isinstance(source_id, str) or not re.fullmatch(r"(?:BOSS|Boss)_[A-Za-z0-9_]+", source_id):
            raise SourceContractError(f"{asset_url}: Alpha record lacks a stable boss-prefixed source ID: {record!r}")
        if not isinstance(level, int) or level < 1:
            raise SourceContractError(f"{asset_url}: Alpha record {source_id} has invalid level {level!r}.")
        if not isinstance(item, str) or not plain_text(item):
            raise SourceContractError(f"{asset_url}: Alpha record {source_id} has no Pal name text.")
        if not isinstance(position, dict) or not all(isinstance(position.get(axis), int) for axis in ("X", "Y")):
            raise SourceContractError(f"{asset_url}: Alpha record {source_id} has invalid raw position {position!r}.")
        if comment != "Field Boss":
            raise SourceContractError(f"{asset_url}: Alpha record {source_id} has non-field comment {comment!r}.")
        only_time = record.get("onlyTime")
        if only_time is not None and not isinstance(only_time, str):
            raise SourceContractError(f"{asset_url}: Alpha record {source_id} has invalid onlyTime {only_time!r}.")
        records.append({
            "sourceId": source_id,
            "palName": plain_text(item),
            "level": level,
            "rawPosition": {"x": position["X"], "y": position["Y"]},
            "sourceHref": record.get("href") if isinstance(record.get("href"), str) else None,
            "onlyTime": only_time,
            "classification": "fixed-field-alpha",
        })
    ids = [record["sourceId"] for record in records]
    if len(ids) != len(set(ids)):
        raise SourceContractError(f"{asset_url}: fixed field Alpha source IDs are not unique.")

    emitted_at = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    source = {"id": "paldb-fixed-field-alpha-map", "url": asset_url, "tier": "wiki", "locator": "fixedDungeon records with type Alpha Pal and comment Field Boss", "observedAt": emitted_at, "sourceVersion": "v1.0.3"}
    payload = [{
        "id": f"field-alpha:{record['sourceId']}",
        "data": record,
        "version": {"gameVersion": "v1.0.3", "emittedAt": emitted_at, "generatorVersion": "paldb-fixed-field-alphas"},
        "sources": [source],
        "provenance": [{"field": field, "sourceIds": [source["id"]], "confidence": "corroborated"} for field in record],
        "gaps": [{"field": "mapCoordinates", "reason": "The source publishes raw game-space position; renderer transforms are not treated as a documented player-map coordinate contract.", "resolution": "Add converted coordinates only when a stable source defines the mapping and coordinate semantics."}],
    } for record in records]
    counts = {"fixedFieldAlpha": len(payload), "excludedDungeonAlpha": sum(record.get("comment") == "Dungeon Boss" for record in alpha_candidates), "withTimeRestriction": sum(record["onlyTime"] is not None for record in records), "minLevel": min(record["level"] for record in records), "maxLevel": max(record["level"] for record in records)}
    coverage = {"dataset": "knowledge-field-alphas", "generatedAt": emitted_at, "gameVersion": "v1.0.3", "recordCount": len(payload), "counts": counts, "sourceUrls": [MAP_PAGE, asset_url]}
    body = "// AUTO-GENERATED by scripts/emit-knowledge-field-alphas.py. Do not hand-edit.\n" + f"// Source: {asset_url}; emitted: {emitted_at}.\n" + 'import type { EvidenceRecord } from "./knowledge";\n\n' + "export interface FieldAlphaKnowledge {\n  sourceId: string;\n  palName: string;\n  level: number;\n  rawPosition: { x: number; y: number };\n  sourceHref: string | null;\n  onlyTime: string | null;\n  classification: \"fixed-field-alpha\";\n}\n\n" + "export const PALWORLD_FIXED_FIELD_ALPHAS: readonly EvidenceRecord<FieldAlphaKnowledge>[] = " + json.dumps(payload, ensure_ascii=False) + ";\n"
    (DATA / "knowledgeFieldAlphas.ts").write_text(body)
    COVERAGE.write_text(json.dumps(coverage, indent=2) + "\n")
    BASELINE.parent.mkdir(parents=True, exist_ok=True)
    if not BASELINE.exists():
        BASELINE.write_text(json.dumps(coverage, indent=2) + "\n")
    print(f"wrote knowledgeFieldAlphas.ts: {len(payload)} fixed field Alpha records")


if __name__ == "__main__":
    try:
        main()
    except SourceContractError as error:
        print(f"[emit-knowledge-field-alphas] FAILED: {error}", file=sys.stderr)
        raise SystemExit(1)
