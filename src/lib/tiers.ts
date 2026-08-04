// Computed tier lists. Everything here is derived from the generated dataset —
// no hand-placed rankings — so the numbers move when the data is regenerated.
import { PALS } from "@/data/palworld";
import type { Pal } from "@/data/palworld";
import { PAL_STATS } from "@/data/palworld/stats";
import { skillsOf } from "@/data/palworld/skills";

export const WORK_TYPES = [
  "Kindling",
  "Watering",
  "Planting",
  "Generating Electricity",
  "Handiwork",
  "Gathering",
  "Lumbering",
  "Mining",
  "Medicine Production",
  "Cooling",
  "Transporting",
  "Farming",
] as const;

export type WorkType = (typeof WORK_TYPES)[number];

export interface RaidWeights {
  attack: number;
  health: number;
  defense: number;
  skill: number;
}

export interface ScoredPal {
  pal: Pal;
  score: number;
  detail: Record<string, number>;
}

function stat(pal: Pal, key: string): number {
  const v = PAL_STATS[pal.internalName]?.stats[key];
  return typeof v === "number" ? v : 0;
}

export function workLevelOf(pal: Pal, work: string): number {
  return PAL_STATS[pal.internalName]?.work.find((w) => w.work === work)?.level ?? 0;
}

/** Highest active-skill power the Pal can learn (0 when unknown). */
export function bestSkillPower(pal: Pal): number {
  return skillsOf(pal.internalName).activeSkills.reduce(
    (max, s) => Math.max(max, s.power ?? 0),
    0,
  );
}

function normalise(list: ScoredPal[]): ScoredPal[] {
  const max = list.reduce((m, s) => Math.max(m, s.score), 0) || 1;
  return list
    .map((s) => ({ ...s, score: (s.score / max) * 100 }))
    .sort((a, b) => b.score - a.score);
}

export function raidTier(weights: RaidWeights): ScoredPal[] {
  const rows = PALS.map((pal) => {
    const detail = {
      attack: stat(pal, "attack"),
      health: stat(pal, "health"),
      defense: stat(pal, "defense"),
      skill: bestSkillPower(pal),
    };
    const score =
      detail.attack * weights.attack +
      detail.health * weights.health +
      detail.defense * weights.defense +
      detail.skill * weights.skill;
    return { pal, score, detail };
  }).filter((r) => r.score > 0);
  return normalise(rows);
}

export function workTier(selected: readonly string[], speedWeight: number): ScoredPal[] {
  const works = selected.length ? selected : WORK_TYPES;
  const rows = PALS.map((pal) => {
    const detail: Record<string, number> = {};
    let total = 0;
    for (const w of works) {
      const lv = workLevelOf(pal, w);
      if (lv > 0) detail[w] = lv;
      total += lv;
    }
    const speed = stat(pal, "workSpeed");
    detail["Work Speed"] = speed;
    return { pal, score: total * 10 + speed * speedWeight, detail };
  }).filter((r) => r.score > 0 && Object.keys(r.detail).length > 1);
  return normalise(rows);
}

/** Ranch output comes from Farming suitability; ties break on work speed. */
export function ranchTier(): ScoredPal[] {
  const rows = PALS.map((pal) => {
    const farming = workLevelOf(pal, "Farming");
    return {
      pal,
      score: farming * 100 + stat(pal, "workSpeed"),
      detail: { Farming: farming, "Work Speed": stat(pal, "workSpeed") },
    };
  }).filter((r) => r.detail.Farming > 0);
  return normalise(rows);
}

export function tierBand(score: number): "S" | "A" | "B" | "C" | "D" {
  if (score >= 85) return "S";
  if (score >= 70) return "A";
  if (score >= 50) return "B";
  if (score >= 30) return "C";
  return "D";
}
