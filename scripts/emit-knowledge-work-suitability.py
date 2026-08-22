"""Emit source-backed Pal work-suitability levels for condensation ranks 0–4.

The Palpedia public work page consumes an embedded, first-party Pal payload plus a
small deterministic work-progression helper. This emitter reads that payload as
text only; it never evaluates downloaded JavaScript. Rank-0 values must agree
exactly with the existing PalCalc game-data export before rank progression is
emitted.
"""
from __future__ import annotations

import datetime as dt
import json
import re
import sys
from pathlib import Path
from urllib.request import Request, urlopen

from palworld_source_contracts import SourceContractError

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data" / "palworld"
CACHE = ROOT / "scripts" / ".cache" / "knowledge-work-suitability"
PAYLOAD_URL = "https://www.palpedia.net/_next/static/chunks/9987-de58e01fb165ef92.js"
PAYLOAD_CACHE = CACHE / "palpedia-pals-payload.source"
PALCALC = ROOT / "scripts" / ".cache" / "palcalc-db.json"
MANIFEST = ROOT / "scripts" / ".cache-manifest.json"
OUTPUT = DATA / "knowledgeWorkSuitability.ts"
COVERAGE = DATA / "knowledgeWorkSuitability.coverage.json"
BASELINE = ROOT / "scripts" / "coverage-baselines" / "knowledge-work-suitability.json"

SOURCE_WORK_ORDER = (
    "kindling",
    "watering",
    "planting",
    "generatingElectricity",
    "handiwork",
    "gathering",
    "lumbering",
    "mining",
    "crudeOilExtraction",
    "medicineProduction",
    "cooling",
    "transporting",
    "farming",
)
BEST_WORK_KEY = {
    "EmitFlame": "kindling",
    "Watering": "watering",
    "Seeding": "planting",
    "GenerateElectricity": "generatingElectricity",
    "Handcraft": "handiwork",
    "Collection": "gathering",
    "Deforest": "lumbering",
    "Mining": "mining",
    "OilExtraction": "crudeOilExtraction",
    "ProductMedicine": "medicineProduction",
    "Cool": "cooling",
    "Transport": "transporting",
    "MonsterFarm": "farming",
}
PALCALC_WORK_KEY = {
    "Kindling": "kindling",
    "Watering": "watering",
    "Planting": "planting",
    "GenerateElectricity": "generatingElectricity",
    "Handiwork": "handiwork",
    "Gathering": "gathering",
    "Lumbering": "lumbering",
    "Mining": "mining",
    "MedicineProduction": "medicineProduction",
    "Cooling": "cooling",
    "Transporting": "transporting",
    "Farming": "farming",
}
PAYLOAD_MARKER = "31059:function(e){e.exports=JSON.parse('"
# Palpedia’s work table includes this human/tower companion row. It has no PalCalc
# Pal record and is outside the companion app’s PALS roster; any additional
# unmatched source identity is a parser failure, not a silent exclusion.
EXPECTED_SOURCE_ONLY_WORKER_IDS = {"gym_elecpanda_otomo"}


def fetch_payload() -> str:
    if PAYLOAD_CACHE.exists():
        return PAYLOAD_CACHE.read_text()
    request = Request(PAYLOAD_URL, headers={"User-Agent": "good-vibe-desk data generator/1.0"})
    with urlopen(request, timeout=60) as response:
        payload = response.read().decode("utf-8")
    CACHE.mkdir(parents=True, exist_ok=True)
    PAYLOAD_CACHE.write_text(payload)
    return payload


def decode_js_single_quoted_literal(text: str) -> str:
    decoded: list[str] = []
    index = 0
    while index < len(text):
        char = text[index]
        if char != "\\":
            decoded.append(char)
            index += 1
            continue
        index += 1
        if index >= len(text):
            raise SourceContractError("Palpedia payload has a dangling JavaScript string escape.")
        escaped = text[index]
        index += 1
        simple = {"n": "\n", "r": "\r", "t": "\t", "b": "\b", "f": "\f", "v": "\v", "0": "\0"}
        if escaped in simple:
            decoded.append(simple[escaped])
        elif escaped == "x":
            value = text[index : index + 2]
            if not re.fullmatch(r"[0-9a-fA-F]{2}", value):
                raise SourceContractError("Palpedia payload has an invalid \\x escape.")
            decoded.append(chr(int(value, 16)))
            index += 2
        elif escaped == "u":
            value = text[index : index + 4]
            if not re.fullmatch(r"[0-9a-fA-F]{4}", value):
                raise SourceContractError("Palpedia payload has an invalid \\u escape.")
            decoded.append(chr(int(value, 16)))
            index += 4
        else:
            decoded.append(escaped)
    return "".join(decoded)


def extract_pal_records(source: str) -> list[dict]:
    start = source.find(PAYLOAD_MARKER)
    if start < 0:
        raise SourceContractError("Palpedia payload module 31059 JSON marker was not found exactly once.")
    if source.find(PAYLOAD_MARKER, start + 1) >= 0:
        raise SourceContractError("Palpedia payload module 31059 JSON marker is duplicated.")
    start += len(PAYLOAD_MARKER)
    literal: list[str] = []
    escaped = False
    end = -1
    for index in range(start, len(source)):
        char = source[index]
        if not escaped and char == "'":
            end = index
            break
        literal.append(char)
        if escaped:
            escaped = False
        elif char == "\\":
            escaped = True
    if end < 0 or not source.startswith("')}", end):
        raise SourceContractError("Palpedia payload module 31059 JSON literal did not close as expected.")
    try:
        records = json.loads(decode_js_single_quoted_literal("".join(literal)))
    except json.JSONDecodeError as error:
        raise SourceContractError(f"Palpedia module 31059 did not decode as JSON: {error}") from error
    if not isinstance(records, list) or len(records) < 600:
        raise SourceContractError("Palpedia module 31059 did not contain the expected full Pal record array.")
    if not all(isinstance(record, dict) for record in records):
        raise SourceContractError("Palpedia module 31059 contains a non-object Pal record.")
    return records


def source_internal_name(record: dict) -> str:
    image = record.get("image")
    if not isinstance(image, str):
        raise SourceContractError(f"Palpedia record {record.get('id')!r} has no icon identity.")
    match = re.fullmatch(r"pals/T_([A-Za-z0-9_]+)_icon_normal\.png", image)
    if match is None:
        raise SourceContractError(f"Palpedia record {record.get('id')!r} has an unexpected icon identity {image!r}.")
    return match.group(1)


def derive_levels(work_skills: dict, best_work: object, *, source_id: str) -> list[dict[str, int]]:
    if not isinstance(work_skills, dict):
        raise SourceContractError(f"Palpedia record {source_id!r} has no workSkills object.")
    unknown_keys = sorted(set(work_skills) - set(SOURCE_WORK_ORDER))
    if unknown_keys:
        raise SourceContractError(f"Palpedia record {source_id!r} has unknown work keys {unknown_keys!r}.")
    if not all(isinstance(value, int) and value >= 0 for value in work_skills.values()):
        raise SourceContractError(f"Palpedia record {source_id!r} has invalid non-integer work levels.")
    ordered = sorted(
        (key for key, value in work_skills.items() if value > 0),
        key=lambda key: (-work_skills[key], SOURCE_WORK_ORDER.index(key)),
    )
    if not ordered:
        raise SourceContractError(f"Palpedia record {source_id!r} has no positive work suitability.")
    if not isinstance(best_work, str) or not best_work.startswith("EPalWorkSuitability::"):
        raise SourceContractError(f"Palpedia record {source_id!r} has invalid bestWorkSuitability {best_work!r}.")
    best_key = BEST_WORK_KEY.get(best_work.removeprefix("EPalWorkSuitability::"))
    if best_key not in ordered:
        raise SourceContractError(f"Palpedia record {source_id!r} bestWorkSuitability is not a positive work skill.")
    progression_order = [best_key, *(key for key in ordered if key != best_key)]
    levels: list[dict[str, int]] = []
    for rank in range(5):
        values = {key: work_skills[key] for key in ordered}
        for star in range(1, min(rank, 3) + 1):
            values[progression_order[(star - 1) % len(progression_order)]] += 1
        if rank >= 4:
            for key in progression_order:
                values[key] += 1
        for key in values:
            values[key] = min(values[key], 10)
        levels.append(values)
    return levels


def palcalc_work(record: dict, *, internal_name: str) -> dict[str, int]:
    work = record.get("WorkSuitability")
    if not isinstance(work, dict):
        raise SourceContractError(f"PalCalc {internal_name!r} has no WorkSuitability object.")
    unknown_keys = sorted(set(work) - set(PALCALC_WORK_KEY))
    if unknown_keys:
        raise SourceContractError(f"PalCalc {internal_name!r} has unknown work keys {unknown_keys!r}.")
    values = {PALCALC_WORK_KEY[key]: value for key, value in work.items() if value > 0}
    if not all(isinstance(value, int) for value in values.values()):
        raise SourceContractError(f"PalCalc {internal_name!r} has non-integer work suitability values.")
    return values


def main() -> None:
    source_records = extract_pal_records(fetch_payload())
    if not PALCALC.exists() or not MANIFEST.exists():
        raise SourceContractError("PalCalc cache and manifest are required for rank-0 cross-validation.")
    palcalc_payload = json.loads(PALCALC.read_text())
    palcalc_records = palcalc_payload.get("Pals")
    if not isinstance(palcalc_records, list) or not isinstance(palcalc_payload.get("Version"), str):
        raise SourceContractError("PalCalc cache is not a recognized db.json export.")
    palcalc_by_internal = {record.get("InternalName"): record for record in palcalc_records if isinstance(record, dict) and isinstance(record.get("InternalName"), str)}
    if len(palcalc_by_internal) != len(palcalc_records):
        raise SourceContractError("PalCalc cache contains missing or duplicate InternalName values.")

    eligible = [
        record for record in source_records
        if not record.get("isBoss")
        and not record.get("isPredator")
        and isinstance(record.get("workSkills"), dict)
        and any(value > 0 for value in record["workSkills"].values())
    ]
    if len(eligible) < 298:
        raise SourceContractError(f"Palpedia payload has only {len(eligible)} eligible positive-work rows.")

    emitted_at = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    manifest = json.loads(MANIFEST.read_text())
    palcalc_manifest = manifest.get("palcalc")
    if not isinstance(palcalc_manifest, dict):
        raise SourceContractError("PalCalc cache manifest has no palcalc section.")
    palcalc_url = palcalc_manifest.get("url")
    palcalc_version = palcalc_manifest.get("dbVersion")
    palcalc_fetched = palcalc_manifest.get("fetchedAt")
    if not all(isinstance(value, str) and value for value in (palcalc_url, palcalc_version, palcalc_fetched)):
        raise SourceContractError("PalCalc cache manifest lacks URL, version, or fetch timestamp.")

    source = {
        "id": "palpedia-work-progression-payload",
        "url": PAYLOAD_URL,
        "tier": "wiki",
        "locator": "module 31059 structured Pal records; workSkills, bestWorkSuitability, and zukanIndex > 0",
        "observedAt": emitted_at,
        "sourceVersion": "v1.0.3",
    }
    palcalc_source = {
        "id": "palcalc-rank-zero-cross-check",
        "url": palcalc_url,
        "tier": "datamined",
        "locator": f"db.json {palcalc_version}; InternalName WorkSuitability exact rank-0 cross-check",
        "observedAt": palcalc_fetched,
        "sourceVersion": palcalc_version,
    }

    payload: list[dict] = []
    source_only_worker_ids: set[str] = set()
    seen_internal: set[str] = set()
    for record in eligible:
        source_id = record.get("id")
        if not isinstance(source_id, str) or not re.fullmatch(r"[a-z0-9_]+", source_id):
            raise SourceContractError(f"Palpedia worker record has invalid stable ID {source_id!r}.")
        internal_name = source_internal_name(record)
        if internal_name in seen_internal:
            raise SourceContractError(f"Palpedia worker identity {internal_name!r} is duplicated.")
        seen_internal.add(internal_name)
        if internal_name not in palcalc_by_internal:
            source_only_worker_ids.add(source_id)
            continue
        levels = derive_levels(record["workSkills"], record.get("bestWorkSuitability"), source_id=source_id)
        if levels[0] != palcalc_work(palcalc_by_internal[internal_name], internal_name=internal_name):
            raise SourceContractError(
                f"Palpedia worker {source_id!r} rank 0 disagrees with PalCalc {internal_name!r}: "
                f"{levels[0]!r} != {palcalc_work(palcalc_by_internal[internal_name], internal_name=internal_name)!r}."
            )
        payload.append({
            "id": f"work-suitability:{internal_name}",
            "data": {"internalName": internal_name, "sourceId": source_id, "levels": levels},
            "version": {"gameVersion": "v1.0.3", "emittedAt": emitted_at, "generatorVersion": "palpedia-work-progression-v1"},
            "sources": [source, palcalc_source],
            "provenance": [
                {"field": "internalName", "sourceIds": [source["id"]], "confidence": "corroborated", "note": "Exact Palpedia CDN icon identity, not a name alias."},
                {"field": "sourceId", "sourceIds": [source["id"]], "confidence": "confirmed"},
                {"field": "levels", "sourceIds": [source["id"], palcalc_source["id"]], "confidence": "corroborated", "note": "Palpedia rank progression with exact PalCalc rank-0 agreement."},
            ],
            "gaps": [
                {"field": "throughput", "reason": "Suitability ranks are not a complete production-time model; task speed also depends on work-speed passives, research, facilities, SAN, food, pathing, and animations.", "resolution": "Add a versioned game-file work-output formula and controlled task-time tests for each work category."},
            ],
        })

    if source_only_worker_ids != EXPECTED_SOURCE_ONLY_WORKER_IDS:
        raise SourceContractError(
            "Palpedia source-only worker IDs changed: "
            f"expected {sorted(EXPECTED_SOURCE_ONLY_WORKER_IDS)!r}, got {sorted(source_only_worker_ids)!r}."
        )
    if len(payload) + len(source_only_worker_ids) != len(eligible):
        raise SourceContractError("Not every eligible Palpedia worker was emitted or explicitly excluded.")
    if len(payload) < 290:
        raise SourceContractError("Work progression output has fewer than 290 records.")

    counts = {
        "eligibleSourceWorkers": len(eligible),
        "excludedSourceOnlyWorkers": len(source_only_worker_ids),
        "emittedProgressions": len(payload),
        "rank0CrossChecked": len(payload),
        "rank1To4Sourced": len(payload),
        "maxRank": 4,
        "maxSuitability": max(level for entry in payload for rank in entry["data"]["levels"] for level in rank.values()),
    }
    coverage = {
        "dataset": "knowledge-work-suitability",
        "generatedAt": emitted_at,
        "gameVersion": "v1.0.3",
        "recordCount": len(payload),
        "counts": counts,
        "sourceUrls": [PAYLOAD_URL, palcalc_url],
    }
    body = "// AUTO-GENERATED by scripts/emit-knowledge-work-suitability.py. Do not hand-edit.\n" + f"// Sources: {PAYLOAD_URL}; {palcalc_url}; emitted: {emitted_at}.\n" + 'import type { EvidenceRecord } from "./knowledge";\n\n' + "export type WorkSuitabilityKey = " + " | ".join(json.dumps(key) for key in SOURCE_WORK_ORDER) + ";\n\n" + "export interface WorkSuitabilityKnowledge {\n  internalName: string;\n  sourceId: string;\n  levels: ReadonlyArray<Partial<Record<WorkSuitabilityKey, number>>>;\n}\n\n" + "export const PALWORLD_WORK_SUITABILITY: readonly EvidenceRecord<WorkSuitabilityKnowledge>[] = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n"
    OUTPUT.write_text(body)
    COVERAGE.write_text(json.dumps(coverage, indent=2) + "\n")
    BASELINE.parent.mkdir(parents=True, exist_ok=True)
    if not BASELINE.exists():
        BASELINE.write_text(json.dumps(coverage, indent=2) + "\n")
    print(f"wrote {OUTPUT.name}: {len(payload)} Pal rank-0–4 work-suitability progressions")


if __name__ == "__main__":
    try:
        main()
    except SourceContractError as error:
        print(f"[emit-knowledge-work-suitability] FAILED: {error}", file=sys.stderr)
        raise SystemExit(1)
