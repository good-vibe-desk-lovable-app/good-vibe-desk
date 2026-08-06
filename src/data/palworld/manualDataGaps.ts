// HAND-MAINTAINED data gaps (dataGaps.ts is emitted by scripts/emit-paldb.py and
// only records what the paldb crawl failed to find). Everything here is a value
// that is knowingly absent or knowingly inferred — never invented.
import type { DataGap } from "./dataGaps";

export const MANUAL_DATA_GAPS: DataGap[] = [
  {
    internalName: "WorldTreeDragon",
    field: "partnerSkill",
    reason:
      "not-found — the datamine carries the placeholder \"This Pal's abilities are still being investigated.\"",
  },
  {
    internalName: "WorldTreeDragon",
    field: "activeSkills",
    reason:
      "not-found — no learnset in the datamine, on paldb.cc or on palworld.wiki.gg. Combat scores are uncomputable, not zero.",
  },
  {
    internalName: "WorldTreeDragon",
    field: "eggType",
    reason:
      "inferred, not datamined — ElementType1/2 are both None, so Common egg is the only consistent value. eggSize (Huge) IS sourced: rarity 10 under the rarity rule (Normal 0-4, Large 5-7, Huge 8+).",
  },
  {
    internalName: "WorldTreeDragon",
    field: "movement",
    reason: "not-found — no walk/run/ride/transport speeds in any source.",
  },
  {
    internalName: "*",
    field: "ranchDropRates",
    reason:
      "not-found — per-item ranch drop-rate percentages do not exist in any datamine export. Only quantity ranges (which scale with partner skill level 1-5 = condensation rank 0-4) are known, so ranch scoring uses quantities only.",
  },
  {
    internalName: "*",
    field: "dungeonAcquisition",
    reason:
      "under-counted, NOT verified-absent — DT_DungeonEnemySpawnDataTable keys through spawn-group IDs rather than Pal names, so dungeon acquisition matched zero rows in the datamine. A Pal with no other channel therefore shows \"acquisition unknown\", never \"not obtainable\".",
  },
];
