# Cross-Verification Pass — Independent Collections

**Date:** August 2026
**Status:** Complete Investigation Report
**Target Branch:** `cross-verification-report` -> `main`
**Rules Applied:** No generated data files modified; values joined on `internalName`; source tiers explicitly identified and evaluated.

---

## 1. The Incubator Question (Priority Item)

### Background & Discovery

Both independent collections previously recorded only **two** incubators (Egg Incubator and Ancient Hatchery). A player noted that in-game progression features **four** incubators and that jumping from Level 7 to Level 76 with no intermediate structures is illogical.

### Repository Audit of `knowledgeTechnologies.ts`

A query matching `incubator`, `hatchery`, `egg`, `breeding`, or `brooding` in `src/data/palworld/knowledgeTechnologies.ts` (which records 588 technology unlock rows from PalDB v1.0.3) returned **6 technology entries**:

| Technology ID                                     | Level  | Category   | Tech Point Cost | Name                                   |
| :------------------------------------------------ | :----: | :--------- | :-------------: | :------------------------------------- |
| `technology:Special_HatchingPalEgg`               | **10** | Structures |        1        | **Egg Incubator**                      |
| `technology:BreedFarm`                            | **19** | Structures |        2        | **Breeding Farm**                      |
| `technology:Special_ElectricHatchingPalEgg`       | **36** | Structures |        5        | **Electric Egg Incubator**             |
| `technology:MultiHatchingPalEgg`                  | **48** | Structures |        5        | **Large Incubator**                    |
| `technology:MultiElectricHatchingPalEgg`          | **58** | Structures |        5        | **Large-Scale Electric Egg Incubator** |
| `technology:MultiElectricHatchingPalEggWithBreed` | **76** | Structures |        8        | **Ancient Hatchery**                   |

### Reconciliation & Conclusion

- **Both collections' previous 2-incubator summary was WRONG.**
- The player's recollection of 4 incubators (or 5 including the Ancient Hatchery) is confirmed by game data.
- The actual progression spans **5 egg incubation/hatching structures** across Levels 10, 36, 48, 58, and 76 (plus the Level 19 Breeding Farm structure).
- **Correct Incubator List:**
  1. **Egg Incubator** (Level 10, 1 point, basic incubator)
  2. **Electric Egg Incubator** (Level 36, 5 points, powered incubator)
  3. **Large Incubator** (Level 48, 5 points, multi-egg capacity)
  4. **Large-Scale Electric Egg Incubator** (Level 58, 5 points, powered multi-egg incubator)
  5. **Ancient Hatchery** (Level 76, 8 points, 10 egg capacity, +100% speed, rare skill inheritance bonus)

---

## 2. Compare Overlapping Subjects

| Subject                  | This Repository                                                                                                     | Other Effort                                                                                              | Agreement / Difference Status | Source Tier & Analysis                                                                                                                                                                                                                                                                                                                                                |
| :----------------------- | :------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------- | :---------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Technology Rows**      | 588 total rows (217 Structures, 371 Items) across levels 1–80                                                       | 588 total rows (217 Structures, 371 Items) across levels 1–80                                             | **EXACT MATCH**               | Both datasets extracted the identical 588 technology unlock tiles from PalDB (`https://paldb.cc/en/Technologies`).                                                                                                                                                                                                                                                    |
| **Encounters Breakdown** | 207 encounter records (`PALWORLD_ENCOUNTERS`: 190 dungeon, 9 raid, 8 tower). `dungeons.ts` holds 150 boss profiles. | 10 raid bosses, 23 tower boss rows, 71 field Alpha rows, 240 ordinary hostile encounter rows (344 total). | **DIFFERENT CATEGORISATION**  | **Repo:** Focuses on fixed boss encounter points (dungeons, raids, towers).<br>**Other Effort:** Scraped overworld hostile encounters (240), field Alphas (71), and broken-down difficulty tiers for tower bosses (23 vs 8 unique Pal entities). Neither is a superset; they filter different encounter scopes.                                                       |
| **Field Alphas**         | 65 fixed Field Alpha records (`PALWORLD_FIXED_FIELD_ALPHAS`)                                                        | 71 Field Alpha rows                                                                                       | **6 DIFFERENCE ROWS**         | **Repo Source:** Scraped directly from PalDB's `map_data_en.js` `fixedDungeon` records tagged as `Field Boss`.<br>**Other Effort:** Included 6 roaming/event/conditional Alphas (such as the Necromus/Paladius dual spawn breakdown or event variants).<br>**Tier:** Repo's fixed map data (65) is higher tier (Tier 2 structured map JS) for fixed overworld spawns. |
| **Eggs**                 | 754 wild egg spawn rows, 27 egg pools                                                                               | 754 wild egg spawn rows, 27 egg pools                                                                     | **EXACT MATCH**               | Confirmed identical data collected from PalDB `/en/Eggs` table.                                                                                                                                                                                                                                                                                                       |
| **Active Skills**        | 307 distinct active skill display names (2,388 learnset rows across 300 Pals)                                       | 395 active skill catalogue rows, 2,380 learnset rows                                                      | **RECONCILED**                | **Catalogue:** 395 in other effort includes internal/NPC/boss variants and unused game-code skills. 307 in repo represents all unique active skills learned naturally by roster Pals (PalCalc db.json has 320 internal entries).<br>**Learnsets:** 2,388 vs 2,380 differ by only 8 rows due to variant Pal learnset handling.                                         |
| **Passives**             | 115 passives (`passives.ts`)                                                                                        | 412 catalogue rows                                                                                        | **RECONCILED**                | **Repo:** Cleaned catalogue of player-obtainable/inheritable passives (Tier 1 PalCalc / Tier 2 PalDB).<br>**Other Effort:** Raw datamine catalogue including developer test traits, NPC passives, stat buff internal markers (e.g., `Test_PalEgg_HatchingSpeed_Up`), and unused code entries.                                                                         |

---

## 3. Check Three Specific Claims Against This Repository

### Claim 3.1: Condensation 4/8/12/24 = 48 total

- **Status:** **CONFIRMED**
- **Details:** `docs/PALWORLD-1.0-REFERENCE.md` and `docs/ENCYCLOPEDIA-PLAN.md` (Pass J) confirm that post-1.0 condensation requires 4, 8, 12, and 24 sacrifices (48 total) for ranks 1–4, conferring +5% HP/Attack/Defense per rank (and +1 to all work suitabilities at rank 4). Pre-1.0 values were 4/16/32/64 = 116 total. The 48 total figure remains accurate.

### Claim 3.2: Work Speed 0–10 Range vs `MAX_BASE_WORK_LEVEL = 8`

- **Status:** **CONSISTENT (NO CONTRADICTION)**
- **Details:**
  - `MAX_BASE_WORK_LEVEL = 8` in `src/lib/tiers.ts` defines the maximum **base** work suitability level inherent to any Pal species.
  - In-game work suitability levels can reach **Level 10** via max condensation rank (+1) and Applied Handbooks (+1).
  - The other effort's 0–10 range describes the full reachable UI level spectrum for a Pal, whereas `MAX_BASE_WORK_LEVEL = 8` models species base tier bounds.
  - **Rule Enforcement:** `MAX_BASE_WORK_LEVEL` remains **8**.

### Claim 3.3: Awakening +3% per level to +60% at level 20

- **Status:** **CONFIRMED GENUINE GAP**
- **Details:** Pal Stat Awakening (Pal Soul stat enhancement up to level 20) is currently **not modelled** in this repository. It is a genuine feature gap and is documented as such.

---

## 4. Formula Gaps Check

The other effort identified several formulas as unobtainable from public sources. Below is the reconciliation with this repository's documented model gaps (`modelGaps.ts`, `dataGaps.ts`, `manualDataGaps.ts`, and `PALWORLD-1.0-REFERENCE.md`):

| Formula / Mechanic                    | Reported Unobtainable by Other Effort | Documented in This Repo? | Repository Gap Details & Action                                                          |
| :------------------------------------ | :-----------------------------------: | :----------------------: | :--------------------------------------------------------------------------------------- |
| **Numeric Element Matrix**            |                  Yes                  |         **Yes**          | Recorded in `modelGaps.ts` ("combat/element effectiveness matrix").                      |
| **Level-Scaling Formula**             |                  Yes                  |         **Yes**          | Recorded in `modelGaps.ts` ("encounter-specific combat").                                |
| **Boss Stat Profiles & Move Damage**  |                  Yes                  |         **Yes**          | Recorded in `modelGaps.ts` ("encounter-specific combat").                                |
| **Work-Speed Throughput Formula**     |                  Yes                  |         **Yes**          | Recorded in `modelGaps.ts` ("base-work throughput").                                     |
| **Mutation Species Selection Matrix** |                  Yes                  |         **Yes**          | Recorded in `modelGaps.ts` ("mutation breeding v1.0").                                   |
| **Capture Probability Formula**       |                  Yes                  |     **No (New Gap)**     | Not explicitly listed in `modelGaps.ts`. Should be added to gap inventory.               |
| **Experience Award & Level Curve**    |                  Yes                  |     **No (New Gap)**     | Not explicitly listed in `modelGaps.ts`. Should be added to gap inventory.               |
| **IV-to-Stat Potential Formula**      |                  Yes                  |     **No (New Gap)**     | `PALWORLD-1.0-REFERENCE.md` notes IVs as unmodeled, but absent from `modelGaps.ts`.      |
| **Breeding Time & Incubation Temp**   |                  Yes                  |     **No (New Gap)**     | `PALWORLD-1.0-REFERENCE.md` notes incubation estimates, but missing from `modelGaps.ts`. |
| **Hunger & SAN Depletion Rates**      |                  Yes                  |     **No (New Gap)**     | Not explicitly listed in `modelGaps.ts`. Should be added to gap inventory.               |

---

## Summary & Deliverable Checklist

- [x] Section 1: Incubator question resolved leading the report.
- [x] Section 2: Reconciled 6 overlapping subjects with source tiers.
- [x] Section 3: Checked 3 specific claims (Condensation, Work Speed, Awakening).
- [x] Section 4: Validated formula gaps against `modelGaps.ts`.
- [x] Zero generated data files modified.
