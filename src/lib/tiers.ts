// Computed tier lists. Everything here is derived from the generated dataset —
// no hand-placed rankings — so the numbers move when the data is regenerated.
//
// Data honesty: a Pal missing a stat the score depends on is NOT scored as zero.
// It is returned as `unranked` with the missing field named, because "no data"
// and "a score of zero" are different facts.
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
  /** 0–100, normalised against the best scoring Pal in the same list. */
  score: number;
  /** Raw component values behind the score. */
  detail: Record<string, number>;
  /** 1-based position in the full ranking. */
  rank: number;
}

export interface UnrankedPal {
  pal: Pal;
  missing: string[];
}

export interface TierResult {
  ranked: ScoredPal[];
  unranked: UnrankedPal[];
}

/** paldb.cc publishes base stats, not level-80 stats. Shown on the page. */
export const STAT_BASIS =
  "Scores use base stats as published by paldb.cc — level-80 stat lines were not sourceable, so absolute values are lower than in-game at cap. Relative ordering is unaffected.";

function statOrNull(pal: Pal, key: string): number | null {
  const v = PAL_STATS[pal.internalName]?.stats[key];
  return typeof v === "number" ? v : null;
}

export function workLevelOf(pal: Pal, work: string): number {
  return PAL_STATS[pal.internalName]?.work.find((w) => w.work === work)?.level ?? 0;
}

function hasWorkData(pal: Pal): boolean {
  const work = PAL_STATS[pal.internalName]?.work;
  return Array.isArray(work) && work.length > 0;
}

/** Highest active-skill power the Pal can learn, or null when no skills are known. */
export function bestSkillPower(pal: Pal): number | null {
  const skills = skillsOf(pal.internalName).activeSkills;
  if (skills.length === 0) return null;
  const best = skills.reduce((max, s) => Math.max(max, s.power ?? 0), 0);
  return best;
}

function finish(rows: { pal: Pal; score: number; detail: Record<string, number> }[], unranked: UnrankedPal[]): TierResult {
  const max = rows.reduce((m, s) => Math.max(m, s.score), 0) || 1;
  const ranked = rows
    .map((s) => ({ ...s, score: (s.score / max) * 100 }))
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({ ...s, rank: i + 1 }));
  return { ranked, unranked: unranked.sort((a, b) => a.pal.name.localeCompare(b.pal.name)) };
}

export const RAID_FORMULA =
  "score = attack x Wa + health x Wh + defense x Wd + best skill power x Ws";

export function raidTier(weights: RaidWeights): TierResult {
  const rows: { pal: Pal; score: number; detail: Record<string, number> }[] = [];
  const unranked: UnrankedPal[] = [];
  for (const pal of PALS) {
    const attack = statOrNull(pal, "attack") ?? statOrNull(pal, "melee");
    const health = statOrNull(pal, "health");
    const defense = statOrNull(pal, "defense");
    const skill = bestSkillPower(pal);
    const missing: string[] = [];
    if (attack === null) missing.push("attack");
    if (health === null) missing.push("health");
    if (defense === null) missing.push("defense");
    if (skill === null) missing.push("active skills");
    if (missing.length) {
      unranked.push({ pal, missing });
      continue;
    }
    const detail = { attack: attack!, health: health!, defense: defense!, skill: skill! };
    rows.push({
      pal,
      detail,
      score:
        detail.attack * weights.attack +
        detail.health * weights.health +
        detail.defense * weights.defense +
        detail.skill * weights.skill,
    });
  }
  return finish(rows, unranked);
}

export const WORK_FORMULA =
  "score = (sum of selected work suitability levels) x 10 + work speed x Ws";

export function workTier(selected: readonly string[], speedWeight: number): TierResult {
  const works = selected.length ? selected : WORK_TYPES;
  const rows: { pal: Pal; score: number; detail: Record<string, number> }[] = [];
  const unranked: UnrankedPal[] = [];
  for (const pal of PALS) {
    const speed = statOrNull(pal, "workSpeed");
    if (!hasWorkData(pal) || speed === null) {
      unranked.push({
        pal,
        missing: [!hasWorkData(pal) ? "work suitability" : null, speed === null ? "work speed" : null].filter(
          (x): x is string => !!x,
        ),
      });
      continue;
    }
    const detail: Record<string, number> = {};
    let total = 0;
    for (const w of works) {
      const lv = workLevelOf(pal, w);
      if (lv > 0) detail[w] = lv;
      total += lv;
    }
    if (total === 0) continue; // genuinely no suitability for the selected jobs
    detail["Work Speed"] = speed;
    rows.push({ pal, score: total * 10 + speed * speedWeight, detail });
  }
  return finish(rows, unranked);
}

export const RANCH_FORMULA = "score = Farming suitability x 100 + work speed";

/** Ranch output comes from Farming suitability; ties break on work speed. */
export function ranchTier(): TierResult {
  const rows: { pal: Pal; score: number; detail: Record<string, number> }[] = [];
  const unranked: UnrankedPal[] = [];
  for (const pal of PALS) {
    const speed = statOrNull(pal, "workSpeed");
    if (!hasWorkData(pal) || speed === null) {
      unranked.push({ pal, missing: [!hasWorkData(pal) ? "work suitability" : "work speed"] });
      continue;
    }
    const farming = workLevelOf(pal, "Farming");
    if (farming <= 0) continue; // no ranch output at all — not a data gap
    rows.push({
      pal,
      score: farming * 100 + speed,
      detail: { Farming: farming, "Work Speed": speed },
    });
  }
  return finish(rows, unranked);
}

export const OVERALL_FORMULA =
  "score = combat percentile x Wc + base-work percentile x Wb, both taken from the tabs above";

export interface OverallWeights {
  combat: number;
  work: number;
}

/** Blends the combat and work rankings. Unranked in either list stays unranked. */
export function overallTier(
  weights: OverallWeights,
  raid: TierResult,
  work: TierResult,
): TierResult {
  const raidScore = new Map(raid.ranked.map((r) => [r.pal.id, r.score]));
  const workScore = new Map(work.ranked.map((r) => [r.pal.id, r.score]));
  const missingMap = new Map<number, string[]>();
  for (const u of [...raid.unranked, ...work.unranked]) {
    missingMap.set(u.pal.id, Array.from(new Set([...(missingMap.get(u.pal.id) ?? []), ...u.missing])));
  }

  const rows: { pal: Pal; score: number; detail: Record<string, number> }[] = [];
  const unranked: UnrankedPal[] = [];
  for (const pal of PALS) {
    const missing = missingMap.get(pal.id);
    if (missing) {
      unranked.push({ pal, missing });
      continue;
    }
    const c = raidScore.get(pal.id) ?? 0;
    const w = workScore.get(pal.id) ?? 0;
    rows.push({
      pal,
      score: c * weights.combat + w * weights.work,
      detail: { Combat: c, Work: w },
    });
  }
  return finish(rows, unranked);
}

export type Band = "S" | "A" | "B" | "C" | "D";

/** Percentile bands: top 5% S, next 15% A, next 30% B, next 30% C, rest D. */
export function bandForRank(rank: number, total: number): Band {
  if (total <= 0) return "D";
  const pct = rank / total;
  if (pct <= 0.05) return "S";
  if (pct <= 0.2) return "A";
  if (pct <= 0.5) return "B";
  if (pct <= 0.8) return "C";
  return "D";
}

/** Legacy score-threshold band, kept for callers that only have a score. */
export function tierBand(score: number): Band {
  if (score >= 85) return "S";
  if (score >= 70) return "A";
  if (score >= 50) return "B";
  if (score >= 30) return "C";
  return "D";
}
