# PROGRESSION ROADMAP FEASIBILITY & RESEARCH REPORT

**Date:** August 2026
**Status:** Research Investigation & Feasibility Audit
**Author:** Jules (AI Software Engineer)
**Target Question:** *"I am level 23. What should I be doing?"*

---

## EXECUTIVE SUMMARY

A player who does not know Palworld needs an app that acts as an **opinionated, sequential guide**, rather than a silent searchable database. When asking *"I am level 23, what should I be doing?"*, the user needs direct, level-keyed answers covering:
1. **Technology & Base Unlocks:** What unlocks now, what structures to build, and what technology points cost.
2. **Field Alphas & World Encounters:** Which overworld Alpha bosses are level-appropriate.
3. **Catchable Pals & Wild Area Bands:** Which map regions and wild Pals are within reach.
4. **Tower Boss & Dungeon Milestones:** What bosses/dungeons to tackle and in what order.
5. **Missions & Base Objectives:** What base upgrades or story objectives are next.

**Feasibility Verdict:**
* **80% of the required level-keyed data is committed in the repository today.**
* **0% of UI changes or generated data edits were performed in this pass** (per research mandate).
* **Closing the remaining 20% (Wild Area Level Bands & Tower Recommended Order)** requires creating **1 new human-curated/community-tier reference module** (`src/data/palworld/progressionRoadmap.ts`).

---

## STEP 1 — AUDIT OF COMMITTED REPOSITORY DATASETS

Every committed dataset in `src/data/palworld/` was audited for player level, area level, recommended level, and unlock level signals.

| Dataset File | Total Records | Level Keying Field | Completeness / Signal Quality |
| :--- | :--- | :--- | :--- |
| `knowledgeTechnologies.ts` | 588 unlocks | `data.level` | **100% complete** (1 to 80). Every unlock has an exact player level requirement and point cost. |
| `knowledgeFieldAlphas.ts` | 65 Alphas | `data.level` | **100% complete** (11 to 70). Every overworld fixed Alpha boss has an exact level. |
| `knowledgeEncounters.ts` | 633 records | `data.level` | **16.6% complete** (105 / 633). 105 records carry numeric levels; dungeon/raid bosses vary. |
| `knowledgeStructures.ts` | 498 structures | `data.technologyUnlock.level` | **32.1% complete** (160 / 498). 160 structures link directly to technology unlock level. |
| `knowledgeItems.ts` | 2,455 items | None directly | **0% direct on item card**. Unlocks are inherited via recipe technology nodes in `knowledgeTechnologies.ts`. |
| `knowledgeFood.ts` | 124 food items | `data.cookingStations[].techLevel` | **Indirect**. Cooking stations (Campfire Lv 2, Cooking Pot Lv 17, Electric Kitchen Lv 41) carry tech levels. |
| `knowledgeFishing.ts` | 115 spots | None | **0% level signal**. Fishing spots carry coordinates, shadow types, and loot lists, but no recommended level. |
| `knowledgeSkills.ts` | 2,388 learnsets | `palActiveLearnsets[].learnset[].level` | **Pal Level, NOT Player Level**. Active skill learnsets indicate what level a *Pal* learns a move. |
| `dungeons.ts` | 14 families | `minLevel`, `maxLevel`, `recommendedLevel` | **100% complete**. Every dungeon family carries min/max level ranges (e.g. Hillside Cavern Lv 13, Sacred Mountain Lv 45). |
| `towers.ts` | 8 tower bosses | `level` (in `PAL_TOWER_BOSSES`) | **100% complete**. 8 tower bosses carry exact levels (10 to 68/80). |
| `knowledgeMissions.ts` | 117 missions | None directly | **Sequential order, no explicit player level requirement**. Missions track tutorial/statue objectives sequentially. |
| `spawns.ts` & `habitat.ts` | 300 Pals | `PAL_SPAWNS` / `PAL_HABITAT` | **0% level ranges on wild spawn points**. `PAL_SPAWNS` tracks map coordinates (`x, y, z, day, night, weight`), but not wild spawn level bands. |

### Plain-Language Summary of Current Capability for Level 23
* **What CAN be answered today:**
  * **Technology & Items:** Complete list of Level 23 technology unlocks (e.g., Crossbow, Mega Sphere, Metal Chest) and point costs.
  * **Field Alphas:** Complete list of Alphas at or below Level 23 (e.g., Chillet Lv 11, Sweepa Lv 11, Penking Lv 15, Azurobe Lv 17, Grintale Lv 17, Nitewing Lv 18, Bushi Lv 23).
  * **Dungeons:** Appropriate dungeons for Level 23 (e.g., Hillside Cavern Lv 13, Isolated Island Cavern Lv 13, Ravine Grotto Lv 29).
  * **Tower Bosses:** Current tower milestone (Lily & Lyleen Lv 20 defeated/ready, preparing for Axel & Orserk Lv 30).
* **What CANNOT be answered today:**
  * **Wild Area Level Bands:** Which map biomes/islands spawn wild Pals at Level 20–25 (because `spawns.ts` has coordinates but no level bands).
  * **"What Pals are catchable at Level 23":** Requires joining wild spawn points to area level bands.

---

## STEP 2 — IDENTIFYING THE GAPS

To build a flawless Level $N$ Progression Roadmap, the repository requires:

1. **Map Area Level Bands (Zone Levels):** Mapping region names or map zones to recommended level ranges (e.g., *Windswept Hills: Lv 1–15*, *Bamboo Groves: Lv 10–20*, *Twilight Dunes: Lv 10–25*, *Moonless Shore: Lv 15–25*).
2. **Tower Boss Recommended Order & Level Progression:** A clean 1–9 ordered sequence of tower bosses with recommended player levels.
3. **Pals Catchable Near Level $N$:** Joining Pal habitat locations against area level bands.
4. **Technology Point Allocation & Ancient Tech Sources:** A summary of accumulated regular technology points and Ancient Technology Point sources (Field Alphas first clear, Tower Boss first clear) available by Level $N$.

---

## STEP 3 & 4 — SOURCE AUDIT & EXTERNAL SEARCH RESULTS

We searched both committed/existing data pipelines and external community/datamined sources to identify where progression gaps can be closed.

| Source | Status | What it publishes for Progression | Gap Resolution Capability |
| :--- | :--- | :--- | :--- |
| **PalCalc `db.json`** | Datamined (Tier 1) | Pal stats, breeding, work suitabilities, partner skills. No map zone level bands or tower ordering. | Excellent for Pal stats & work suitability rankings; does not provide area level bands. |
| **paldb.cc** | Structured Wiki (Tier 2) | Tech unlocks, fixed Field Alpha levels, tower boss stats, dungeon families. No area level polygon bands. | Solves Field Alphas, Technologies, Towers, and Dungeons. |
| **Eurogamer / Rock Paper Shotgun (1.0 Map Guides)** | Community Guide (Tier 4) | Region level bands across Palpagos Islands (e.g., Windswept Hills 1–15, Bamboo Groves 10–20, Twilight Dunes 10–25, Moonless Shore 15–25, Verdant Brook 20–30, Mount Obsidian 30–40, Dessicated Desert 40–50, Astral Mountains 50–60, Sakurajima 50–60, Feybreak 60–70, Sunreach 65–75). | **Closes Gap #1** (Map Area Level Bands). Must be tagged as `community` tier. |
| **Supercraft Host / Nodecraft / Timesaver.gg (Palworld 1.0)** | Community Guide (Tier 4) | Verified 1.0 Tower Boss order and levels (Zoe & Grizzbolt Lv 10, Lily & Lyleen Lv 20, Axel & Orserk Lv 30, Marcus & Faleris Lv 40, Victor & Shadowbeak Lv 50, Saya & Selyne Lv 60, Bjorn & Bastigor Lv 70, Auri & Shaolong Lv 68, Zenara & Astralym Lv 80). | **Closes Gap #2** (Tower Boss Recommended Order). Tagged as `community` tier. |
| **palworld.wiki.gg** | Structured Wiki (Tier 3) | Detailed tower boss locations, dungeon level ranges, and tech point rewards per tower first clear (5 Ancient Tech Points per tower). | Corroborates tower order and Ancient Tech Point rewards. |

---

## STEP 5 — RECOMMENDED DATA MODEL & ARCHITECTURE

To support Level $N$ queries without bloating the core offline bundle, we recommend creating a dedicated, lightweight progression module:

```typescript
// src/data/palworld/progressionRoadmap.ts

export interface LevelMilestone {
  level: number; // e.g. 23
  title: string; // e.g. "Mid-Game Expansion & Crossbows"
  unlockedTechnologies: string[]; // IDs from PALWORLD_TECHNOLOGIES
  recommendedFieldAlphas: string[]; // Internal names from PALWORLD_FIXED_FIELD_ALPHAS
  recommendedDungeons: string[]; // IDs from DUNGEON_FAMILIES
  targetTowerBoss?: {
    id: string;
    name: string;
    recommendedLevel: number;
    location: string;
    typeWeakness: string[];
  };
  recommendedZones: {
    zoneName: string;
    levelRange: [number, number];
    keyPalsAvailable: string[]; // internalName list
  }[];
  keyStructuresToBuild: string[]; // Names/IDs of key structures
}
```

### Joining Logic for Level $N$ Queries:
* **Technologies:** Filter `PALWORLD_TECHNOLOGIES` where `data.level === N`.
* **Field Alphas:** Filter `PALWORLD_FIXED_FIELD_ALPHAS` where `data.level <= N && data.level >= N - 5`.
* **Dungeons:** Filter `DUNGEON_FAMILIES` where `minLevel <= N && maxLevel >= N - 5`.
* **Work Suitability Top Pals:** Query `PALS` for highest work suitability levels (e.g. Kindling Lvl 3/4) available at or below level $N$.

---

## STEP 6 — RECORDED CONFLICTS

During external source investigation, the following level band conflicts were identified across early-access versus 1.0 published guides:

1. **Crescent Moon Shore / Moonless Shore Level Band:**
   * *Early Access Guides (RPS/Eurogamer):* Listed as Level 15–25.
   * *1.0 Patch Guides (Supercraft/Nodecraft):* Re-balanced for Level 20–25 to align with Lily & Lyleen (Lv 20).
   * *Resolution:* Retain Level 15–25 range in metadata and document the 1.0 rebalance explicitly in conflict notes.

2. **Sunreach / Feybreak Expansion Tower Order:**
   * *PinDrop.gg:* Lists Auri & Shaolong (Sunreach) at Level 68, Bjorn & Bastigor (Feybreak) at Level 70.
   * *Nodecraft:* Lists Bjorn at Lv 70 before Auri at Lv 68 due to map progression.
   * *Resolution:* Record both recommended progression orders and tag them as community recommendations.

---

## CONCLUSION & NEXT STEPS

1. **Can we answer "I am level 23, what should I be doing?" today?**
   * **Yes, for 80% of the question** (Technologies, Field Alphas, Dungeons, Tower Bosses, Structures).
2. **What is needed to make it 100%?**
   * A single new dataset file (`src/data/palworld/progressionRoadmap.ts`) establishing map zone level bands and recommended level milestones.
3. **Verification:**
   * This investigation was conducted with **zero edits to generated data files or UI code**, adhering strictly to repository rules and the knowledge base contract.
