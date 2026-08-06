// HAND-MAINTAINED additions that the paldb.cc crawl cannot supply.
//
// Source: Dhampyru/Palworld-Extracted datamine "Game Data Parsed 7-22-26",
// cross-checked against paldb.cc and palworld.wiki.gg. Merged into PAL_STATS at
// the bottom of stats.ts; scripts/emit-paldb.py re-emits that merge so a
// regeneration cannot silently drop these rows.
import type { PalStatBlock } from "./stats";

/**
 * Astralym (WorldTreeDragon, Paldex 204) is absent from the palcalc roster and
 * from the paldb crawl. Every value below is datamined, none inferred.
 *
 * Its paldb.cc page renders a ten-icon row with nine filled next to "Work
 * Suitability" — that row is FoodAmount (9). Astralym's actual work suitability
 * is 0 across all twelve types, which is VERIFIED ABSENT, not missing data.
 */
export const STAT_OVERRIDES: Record<string, PalStatBlock> = {
  WorldTreeDragon: {
    stats: {
      size: "XL",
      rarity: 10,
      health: 200,
      food: 0,
      meleeAttack: 100,
      attack: 200,
      defense: 200,
      workSpeed: 100,
      support: 100,
      captureRate: 1.0,
      maleProbability: 50,
      combiRank: 10,
      price: 10000,
      // Level-80 stat ranges, datamined. Other Pals have no level-80 line in the
      // paldb crawl, so tier scoring still runs on base stats for consistency.
      level80HealthMin: 8900,
      level80HealthMax: 11300,
      level80AttackMin: 1300,
      level80AttackMax: 1660,
      level80DefenseMin: 1250,
      level80DefenseMax: 1610,
    },
    movement: {},
    work: [],
    genus: null,
    foodAmount: 9,
    nocturnal: false,
  },
};

/**
 * Pals whose empty work list is a datamined ZERO, not absent data. Tier scoring
 * must score these (they rank last) rather than reporting "insufficient data".
 */
export const WORK_VERIFIED_ABSENT: ReadonlySet<string> = new Set(["WorldTreeDragon"]);

/**
 * Pals with no active-skill learnset in any source. Combat scores are genuinely
 * UNCOMPUTABLE for these — distinct from a zero.
 */
export const LEARNSET_NOT_FOUND: ReadonlySet<string> = new Set(["WorldTreeDragon"]);

/**
 * Pals whose empty element list is a datamined "None", not missing data.
 * Element coverage is genuinely 0 for these.
 */
export const ELEMENTS_VERIFIED_NONE: ReadonlySet<string> = new Set(["WorldTreeDragon"]);
