#!/usr/bin/env python3
"""Emits src/data/palworld/{elements,stats,spawns,drops,skills,dataGaps}.ts
from scripts/.cache/paldb-parsed.json. Keyed by internalName (the join key)."""
import datetime
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "src", "data", "palworld")
CACHE = os.path.join(ROOT, "scripts", ".cache", "paldb-parsed.json")
d = json.load(open(CACHE))
recs, gaps = d["records"], d["gaps"]
keys = sorted(recs)

# When the paldb.cc scrape these files come from was actually taken.
#
# WHY THIS EXISTS: version.ts records a sourcedAt for the palcalc side of the
# dataset (the breeding graph) but nothing recorded it for the paldb.cc side
# (work suitability, stats, active skills, spawns, drops). After the 1.0
# release it took an afternoon of forensics to establish these files were
# post-1.0 — the proof in the end was that ten Pals sit at work suitability 8,
# a level that could not exist before 1.0, and that they are exactly the ten
# published 1.0 Level 8 specialists. That should have been one line in a
# header. Now it is.
#
# Uses the cache file's mtime rather than "now", because emit can be re-run
# long after the scrape and the date that matters is when the DATA was taken.
SCRAPED_AT = datetime.datetime.fromtimestamp(
    os.path.getmtime(CACHE), datetime.timezone.utc
).strftime("%Y-%m-%d")
GENERATED_AT = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")

HEAD = ("// AUTO-GENERATED from paldb.cc by scripts/parse-paldb.py + emit-paldb.py.\n"
        "// Join key is internalName. Do not hand-edit.\n"
        f"// paldb.cc scrape taken: {SCRAPED_AT}\n"
        f"// This file emitted:     {GENERATED_AT}\n")


def j(v):
    return json.dumps(v, ensure_ascii=False)


def write(name, body):
    open(os.path.join(DATA, name), "w").write(HEAD + body)
    print("wrote", name)


# elements
lines = [f"  {j(k)}: {j(recs[k]['elements'])}," for k in keys]
write("elements.ts",
      "export const PAL_ELEMENTS: Record<string, readonly string[]> = {\n"
      + "\n".join(lines) + "\n};\n\n"
      "export function elementsOf(internalName: string): readonly string[] {\n"
      "  return PAL_ELEMENTS[internalName] ?? [];\n}\n")

# stats
lines = []
for k in keys:
    r = recs[k]
    lines.append("  %s: %s," % (j(k), j({
        "stats": {a: b for a, b in r["stats"].items() if b is not None},
        "movement": {a: b for a, b in r["movement"].items() if b is not None},
        "work": r["work"],
        "genus": r.get("genus"),
        "foodAmount": r.get("foodAmount"),
        "nocturnal": r.get("nocturnal", False),
    })))
write("stats.ts",
      "export interface PalStatBlock {\n"
      "  stats: Record<string, number | string>;\n"
      "  movement: Record<string, number>;\n"
      "  work: { work: string; level: number }[];\n"
      "  genus?: string | null;\n"
      "  foodAmount?: number | null;\n"
      "  nocturnal: boolean;\n}\n\n"
      "export const PAL_STATS: Record<string, PalStatBlock> = {\n"
      + "\n".join(lines) + "\n};\n\n"
      "export function workLevel(internalName: string, work: string): number {\n"
      "  return PAL_STATS[internalName]?.work.find((w) => w.work === work)?.level ?? 0;\n}\n\n"
      "// HAND-MAINTAINED merge - see ./overrides.ts. Rows the paldb crawl cannot\n"
      "// supply (currently Astralym). Re-emitted here so a regeneration keeps them.\n"
      'import { STAT_OVERRIDES } from "./overrides";\n'
      "Object.assign(PAL_STATS, STAT_OVERRIDES);\n")


# spawns
lines = [f"  {j(k)}: {j(recs[k]['spawns'])}," for k in keys]
write("spawns.ts",
      "export interface SpawnPoint {\n  area: string;\n  coords?: number[];\n"
      "  level?: number;\n  kind?: string;\n}\n\n"
      "export const PAL_SPAWNS: Record<string, SpawnPoint[]> = {\n"
      + "\n".join(lines) + "\n};\n\n"
      "export function spawnsOf(internalName: string): SpawnPoint[] {\n"
      "  return PAL_SPAWNS[internalName] ?? [];\n}\n\n"
      "/** A Pal with no field spawner can only be obtained by breeding/eggs. */\n"
      "export function isBreedOnly(internalName: string): boolean {\n"
      "  return spawnsOf(internalName).every((s) => s.kind === \"egg\");\n}\n")

# habitat
lines = [f"  {j(k)}: {j(recs[k].get('habitat', []))}," for k in keys]
write("habitat.ts",
      "export interface HabitatWindow {\n  map: string;\n  time: \"day\" | \"night\";\n"
      "  count: number;\n}\n\n"
      "export const PAL_HABITAT: Record<string, HabitatWindow[]> = {\n"
      + "\n".join(lines) + "\n};\n\n"
      "export function habitatOf(internalName: string): HabitatWindow[] {\n"
      "  return PAL_HABITAT[internalName] ?? [];\n}\n")

# drops
lines = [f"  {j(k)}: {j(recs[k]['drops'])}," for k in keys]
write("drops.ts",
      "export interface PalDrop {\n  item: string;\n  qty: string;\n"
      "  probability: string;\n  minLevel?: number;\n}\n\n"
      "export const PAL_DROPS: Record<string, PalDrop[]> = {\n"
      + "\n".join(lines) + "\n};\n\n"
      "export function dropsOf(internalName: string): PalDrop[] {\n"
      "  return PAL_DROPS[internalName] ?? [];\n}\n")

# skills
lines = []
for k in keys:
    r = recs[k]
    lines.append("  %s: %s," % (j(k), j({
        "partnerSkill": r.get("partnerSkill"),
        "activeSkills": r["activeSkills"],
    })))
write("skills.ts",
      "export interface ActiveSkill {\n  level: number;\n  name: string;\n"
      "  element?: string;\n  power?: number;\n  cooldown?: number;\n}\n\n"
      "export interface PalSkillBlock {\n  partnerSkill?: string | null;\n"
      "  activeSkills: ActiveSkill[];\n}\n\n"
      "export const PAL_SKILLS: Record<string, PalSkillBlock> = {\n"
      + "\n".join(lines) + "\n};\n\n"
      "export function skillsOf(internalName: string): PalSkillBlock {\n"
      "  return PAL_SKILLS[internalName] ?? { activeSkills: [] };\n}\n")

# gaps
write("dataGaps.ts",
      "export interface DataGap {\n  internalName: string;\n  field: string;\n"
      "  reason: string;\n}\n\n"
      "export const DATA_GAPS: DataGap[] = " + j(gaps) + ";\n")
