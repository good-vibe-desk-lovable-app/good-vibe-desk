"""Emit source-backed Palworld encounter knowledge from validated evidence caches.

This generator intentionally preserves independent dungeon, raid, and tower
channels. It does not infer a field Alpha or World Tree encounter merely because
a loose third-party category labels it as one. Those categories remain explicit
coverage gaps until a bounded source defines their semantics.
"""
from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data" / "palworld"
CACHE = ROOT / "scripts" / ".cache"
MANIFEST = ROOT / "scripts" / ".cache-manifest.json"
COVERAGE = DATA / "knowledgeEncounters.coverage.json"
BASELINE = ROOT / "scripts" / "coverage-baselines" / "knowledge-encounters.json"


def js(value: object) -> str:
    return json.dumps(value, ensure_ascii=False)


def main() -> None:
    manifest = json.loads(MANIFEST.read_text())
    displayed = manifest["paldb"].get("displayedVersion", {})
    game_version = displayed.get("version", "UNKNOWN")
    emitted_at = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    towers = json.loads((CACHE / "tower-bosses.json").read_text())
    raids = json.loads((CACHE / "raid-bosses.json").read_text())
    dungeons = json.loads((CACHE / "dungeon-bosses.json").read_text())

    records: list[dict[str, object]] = []
    for evidence in towers["records"]:
        sources = [
            {"id": f"tower-{index + 1}", "url": source["url"], "tier": "wiki", "observedAt": emitted_at}
            for index, source in enumerate(evidence["sources"])
        ]
        data = {
            "kind": "tower",
            "internalName": evidence["internalName"],
            "pal": evidence["pal"],
            "leader": evidence["leader"],
            "name": evidence["tower"],
            "region": evidence["region"],
            "coordinates": evidence["coordinates"],
            "normalLevel": evidence["normalLevel"],
            "hardModeLevel": evidence["hardModeLevel"],
        }
        records.append({
            "id": f"tower:{evidence['internalName']}:{evidence['tower']}",
            "data": data,
            "version": {"gameVersion": game_version, "emittedAt": emitted_at, "generatorVersion": "tower-bosses-cache"},
            "sources": sources,
            "provenance": [{"field": key, "sourceIds": [source["id"] for source in sources], "confidence": "corroborated"} for key in data],
        })

    for internal_name, entries in sorted(raids["joined"].items()):
        for entry in entries:
            source = {"id": "paldb-raid", "url": entry["sourceUrl"], "tier": "wiki", "observedAt": emitted_at, "sourceVersion": game_version}
            data = {"kind": "raid", "internalName": internal_name, "name": entry["name"], "level": entry["level"], "sourceId": entry["sourceId"]}
            records.append({
                "id": f"raid:{entry['sourceId']}",
                "data": data,
                "version": {"gameVersion": game_version, "emittedAt": emitted_at, "generatorVersion": "raid-bosses-cache"},
                "sources": [source],
                "provenance": [{"field": key, "sourceIds": [source["id"]], "confidence": "corroborated"} for key in data],
            })

    for internal_name, entries in sorted(dungeons["joined"].items()):
        for entry in entries:
            source = {"id": "paldb-dungeon", "url": entry["sourceUrl"], "tier": "wiki", "observedAt": emitted_at, "sourceVersion": game_version}
            data = {"kind": "dungeon", "internalName": internal_name, "name": entry["name"], "dungeon": entry["dungeon"], "dungeonLevel": entry["dungeonLevel"], "minLevel": entry["minLevel"], "maxLevel": entry["maxLevel"], "sourceId": entry["sourceId"]}
            records.append({
                "id": f"dungeon:{entry['dungeon']}:{entry['sourceId']}",
                "data": data,
                "version": {"gameVersion": game_version, "emittedAt": emitted_at, "generatorVersion": "dungeon-bosses-cache"},
                "sources": [source],
                "provenance": [{"field": key, "sourceIds": [source["id"]], "confidence": "corroborated"} for key in data],
            })

    ids = [record["id"] for record in records]
    if len(ids) != len(set(ids)):
        raise RuntimeError("Encounter emitter produced duplicate record IDs.")
    counts = {
        "tower": sum(record["data"]["kind"] == "tower" for record in records),
        "raid": sum(record["data"]["kind"] == "raid" for record in records),
        "dungeon": sum(record["data"]["kind"] == "dungeon" for record in records),
        "fieldAlpha": 0,
        "worldTree": 0,
        "excludedTowerClaims": len(towers["excluded"]),
        "nonRosterRaidCards": len(raids["unmatched"]),
    }
    gaps = [
        {"field": "fieldAlpha", "reason": "The current Dungeons index did not establish a separate field-Alpha source channel; its rows duplicate dungeon families.", "resolution": "Use a bounded source that distinguishes fixed field Alphas from dungeon bosses."},
        {"field": "worldTree", "reason": "No source meeting the encounter contract currently defines World Tree final-boss semantics without conflating them with towers.", "resolution": "Use official or game-extracted World Tree encounter data before emission."},
        {"field": "towerExcluded", "reason": "Three tower claims remain excluded because they lack the required two independent sources.", "resolution": "Add an entry only after two retained sources agree."},
    ]
    body = "// AUTO-GENERATED by scripts/emit-knowledge-encounters.py. Do not hand-edit.\n" + f"// Source channels: validated dungeon, raid, and two-source tower caches; PalDB displayed version: {game_version} {displayed.get('date', '')}.\n" + f"// Emitted: {emitted_at}.\n" + 'import type { EvidenceRecord, KnowledgeGap } from "./knowledge";\n\n' + "export interface EncounterKnowledge {\n  kind: \"dungeon\" | \"raid\" | \"tower\";\n  internalName: string;\n  name: string;\n  [key: string]: unknown;\n}\n\n" + "export const PALWORLD_ENCOUNTERS: readonly EvidenceRecord<EncounterKnowledge>[] = " + js(records) + ";\n\n" + "export const ENCOUNTER_KNOWLEDGE_GAPS: readonly KnowledgeGap[] = " + js(gaps) + ";\n"
    (DATA / "knowledgeEncounters.ts").write_text(body)
    coverage = {"dataset": "knowledge-encounters", "generatedAt": emitted_at, "gameVersion": game_version, "recordCount": len(records), "counts": counts, "sourceUrls": ["https://paldb.cc/en/Dungeons", "https://paldb.cc/en/Raid", "https://palworld.wiki.gg/wiki/Tower", "https://game8.co/games/Palworld/archives/440436"]}
    COVERAGE.write_text(json.dumps(coverage, indent=2) + "\n")
    BASELINE.parent.mkdir(parents=True, exist_ok=True)
    if not BASELINE.exists():
        BASELINE.write_text(json.dumps(coverage, indent=2) + "\n")
    print(f"wrote knowledgeEncounters.ts: {coverage['recordCount']} records ({counts['dungeon']} dungeon, {counts['raid']} raid, {counts['tower']} tower)")


if __name__ == "__main__":
    main()
