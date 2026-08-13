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
import { LEARNSET_NOT_FOUND, WORK_VERIFIED_ABSENT } from "@/data/palworld/overrides";

/**
 * Maximum BASE work suitability in the datamine is 8. No Pal has base 9 or 10 —
 * the runtime scale reaching 10 comes from condensation (+1 to the best
 * suitability per rank; at rank 4, +1 to every suitability) and the "Applied
 * Handbook" consumables (+1 permanent, one item per work type). Normalising
 * against 10 would compress every score and understate specialists.
 */
export const MAX_BASE_WORK_LEVEL = 8;

/**
 * Condensation runs 0-4 (five states, four stars). Ranch output tables use
 * Lv1..Lv5 headers, which are PARTNER SKILL levels: partner skill level =
 * condensation rank + 1. Sacrifice totals are the post-v1.0 values (cumulative
 * 48, not the stale pre-1.0 116).
 */
export const CONDENSE_TABLE = [
  {
    rank: 0,
    sacrifices: 0,
    cumulative: 0,
    partnerSkillLevel: 1,
    bonus: "no bonus",
    suitability: "none",
  },
  {
    rank: 1,
    sacrifices: 4,
    cumulative: 4,
    partnerSkillLevel: 2,
    bonus: "+5% HP/Atk/Def",
    suitability: "+1 to best",
  },
  {
    rank: 2,
    sacrifices: 8,
    cumulative: 12,
    partnerSkillLevel: 3,
    bonus: "+10% HP/Atk/Def",
    suitability: "+1 to 2nd-best",
  },
  {
    rank: 3,
    sacrifices: 12,
    cumulative: 24,
    partnerSkillLevel: 4,
    bonus: "+15% HP/Atk/Def",
    suitability: "+1 to 3rd-best",
  },
  {
    rank: 4,
    sacrifices: 24,
    cumulative: 48,
    partnerSkillLevel: 5,
    bonus: "+20% HP/Atk/Def",
    suitability: "+1 to every suitability",
  },
] as const;

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
  "Combat scores use base stats as published by paldb.cc — level-80 stat lines were not sourceable for the roster, so absolute values are lower than in-game at cap; relative ordering is unaffected. Work suitability levels normalise against 8, the maximum BASE level in the datamine.";

function statOrNull(pal: Pal, key: string): number | null {
  const v = PAL_STATS[pal.internalName]?.stats[key];
  return typeof v === "number" ? v : null;
}

export function workLevelOf(pal: Pal, work: string): number {
  return PAL_STATS[pal.internalName]?.work.find((w) => w.work === work)?.level ?? 0;
}

/**
 * True when the work suitability figures are KNOWN. An empty list normally means
 * the field was absent on the source page (KingWhale), but for a Pal in
 * WORK_VERIFIED_ABSENT the zeros are datamined facts and must be scored, not
 * reported as insufficient data.
 */
function hasWorkData(pal: Pal): boolean {
  const work = PAL_STATS[pal.internalName]?.work;
  if (WORK_VERIFIED_ABSENT.has(pal.internalName)) return true;
  return Array.isArray(work) && work.length > 0;
}

function workVerifiedZero(pal: Pal): boolean {
  return WORK_VERIFIED_ABSENT.has(pal.internalName);
}

/** Highest active-skill power the Pal can learn, or null when no skills are known. */
export function bestSkillPower(pal: Pal): number | null {
  const skills = skillsOf(pal.internalName).activeSkills;
  if (skills.length === 0) return null;
  const best = skills.reduce((max, s) => Math.max(max, s.power ?? 0), 0);
  return best;
}

function finish(
  rows: { pal: Pal; score: number; detail: Record<string, number> }[],
  unranked: UnrankedPal[],
): TierResult {
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
    if (skill === null)
      missing.push(
        LEARNSET_NOT_FOUND.has(pal.internalName)
          ? "active skills (no learnset in any source)"
          : "active skills",
      );
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
  "score = (sum of selected work suitability levels / 8) x 100 + work speed x Ws — levels normalise against 8, the maximum BASE suitability in the datamine (9 and 10 only exist via condensation and Applied Handbooks)";

export function workTier(selected: readonly string[], speedWeight: number): TierResult {
  const works = selected.length ? selected : WORK_TYPES;
  const rows: { pal: Pal; score: number; detail: Record<string, number> }[] = [];
  const unranked: UnrankedPal[] = [];
  for (const pal of PALS) {
    const speed = statOrNull(pal, "workSpeed");
    if (!hasWorkData(pal) || speed === null) {
      unranked.push({
        pal,
        missing: [
          !hasWorkData(pal) ? "work suitability" : null,
          speed === null ? "work speed" : null,
        ].filter((x): x is string => !!x),
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
    // A zero total normally just means "no suitability for the jobs you picked",
    // so the Pal drops out of the list. A verified-absent zero is a fact about
    // the Pal and stays in the ranking (at the bottom).
    if (total === 0 && !workVerifiedZero(pal)) continue;
    detail["Work Speed"] = speed;
    rows.push({
      pal,
      score: (total / MAX_BASE_WORK_LEVEL) * 100 + speed * speedWeight,
      detail,
    });
  }
  return finish(rows, unranked);
}

export const RANCH_FORMULA =
  "score = (Farming suitability / 8) x 100 + work speed — quantity only; per-item ranch drop rates do not exist in any datamine export and are not invented here";

export const RANCH_NOTE =
  "Ranch output quantity scales with PARTNER SKILL LEVEL 1-5, which maps to condensation rank 0-4 (Lamball wool 1 -> 1-5, Mau gold coin 10 -> 10-50). Only Vixy changes which items it drops.";

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
    if (farming <= 0 && !workVerifiedZero(pal)) continue; // no ranch output — not a data gap
    rows.push({
      pal,
      score: (farming / MAX_BASE_WORK_LEVEL) * 100 + speed,
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
    missingMap.set(
      u.pal.id,
      Array.from(new Set([...(missingMap.get(u.pal.id) ?? []), ...u.missing])),
    );
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
