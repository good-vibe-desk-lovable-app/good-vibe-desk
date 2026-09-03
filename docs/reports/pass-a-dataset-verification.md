# Collection Pass A — Dataset Verification Report

**Date of Verification:** 31 August 2026
**Repository Branch:** `pass-a-dataset-verification`
**Report Author:** Jules (AI Engineer)

---

## Executive Summary

As part of **Collection Pass A**, a full audit and field-by-field verification of the committed Palworld dataset in `src/data/palworld/` was performed against the latest upstream source: **PalCalc `db.json`** (`tylercamp/palcalc`).

Key findings:

1. **PalCalc `db.json` Provenance:** Retreived from `github.com/tylercamp/palcalc` (commit `4b0af605e877dc566a895f10326962404dcfbc84`, dated `2026-08-26T20:18:03Z`, declaring DB version `v27`). Its SHA-256 hash is `e42052f24edad4fd4f4325456c76f2d9ddb5bff20d6b073c82c19782dc91a136`.
2. **Dataset Audit & Accuracy:**
   - **Pal Count & `internalName`:** 299 Pals in PalCalc; 300 Pals in `pals.ts` (includes 1 hand-added datamined Pal `WorldTreeDragon` / `Astralym`). All 299 internal names match 1:1.
   - **Work Suitability:** 100% match across all 299 Pals and 12 work categories.
   - **Base Stats (HP, Attack, Defense):** 100% match across all 299 Pals. MeleeAttack is sourced from PalDB v1.0.3 and matches 100%.
   - **Gender Ratios:** 100% match across all 299 Pals in `pals.ts` (accounting for default `50` where omitted from code literals).
   - **Elements:** 100% match.
   - **Breeding Pair Count:** 44,850 unordered pairs for 299 PalCalc Pals ($299 \times 300 / 2$); 45,150 unordered pairs for 300 `pals.ts` Pals ($300 \times 301 / 2$).
   - **Unique Combos:** 1,598 entries in `uniqueCombos.ts` (matching PalCalc breeding formula overrides).
   - **Same-Species-Only List:** 26 Pals in `sameSpeciesOnly.ts` (matching PalCalc self-only breeding restrictions).
   - **Movement Speeds:** 12 movement speed values across 6 Pals (`FairyDragon`, `FairyDragon_Water`, `BlackGriffon`, `SkyDragon`, `SkyDragon_Grass`, `DarkMechaDragon`) differ between PalCalc base values and PalDB v1.0.3 pages.
3. **Palworld Patch History (Post 1.0.0):**
   - 1.0.0 was released on 10 July 2026.
   - Patches `v1.0.1`, `v1.0.2`, `v1.0.2.100993`, and `v1.0.2.101103` were released between July and August 2026.
   - None of these patches modified Pal base stats, breeding formulas, passives, active skills, work suitability, condensation, eggs, or items. All committed data in this repository remains valid.
4. **Provenance Update:** Updated `src/data/palworld/version.ts` to separate PalCalc provenance (commit SHA, commit date, DB version `v27`) from PalDB provenance (`v1.0.3`, last scraped date `2026-08-19`).

---

## 1. Upstream Highest-Tier Source (PalCalc `db.json`)

The latest `db.json` export was fetched from `github.com/tylercamp/palcalc`:

- **Source URL:** `https://raw.githubusercontent.com/tylercamp/palcalc/main/PalCalc.Model/db.json`
- **Repository Revision (Commit SHA):** `4b0af605e877dc566a895f10326962404dcfbc84`
- **Commit Date:** `2026-08-26T20:18:03Z`
- **Declared DB Version:** `v27`
- **Declared Pal Count:** 299
- **SHA-256 Checksum:** `e42052f24edad4fd4f4325456c76f2d9ddb5bff20d6b073c82c19782dc91a136`

---

## 2. Field-by-Field Verification Results

| Field / Category                     | PalCalc v27 Value                                            | Repo Dataset Value                              | Status / Mismatch Details                                                                                                                          |
| :----------------------------------- | :----------------------------------------------------------- | :---------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pal Count**                        | 299 Pals                                                     | 300 Pals (`pals.ts`)                            | **Expected Difference.** Repo contains 1 extra Pal (`WorldTreeDragon` / `Astralym`), hand-added from Dhampyru datamine as documented in `pals.ts`. |
| **`internalName`**                   | 299 internal names                                           | 300 internal names                              | **100% Match** for all 299 PalCalc Pals. Join on `internalName` verified.                                                                          |
| **Work Suitability**                 | 299 Pals, 12 work types                                      | 299 Pals in `PAL_STATS`                         | **100% Match.** Every work type and level matches PalCalc `v27`.                                                                                   |
| **Base Stats (HP, Attack, Defense)** | `Hp`, `Attack`, `Defense`                                    | `stats.health`, `stats.attack`, `stats.defense` | **100% Match** across all 299 PalCalc records.                                                                                                     |
| **Melee Attack**                     | N/A in PalCalc                                               | `stats.meleeAttack`                             | **100% Match** against PalDB v1.0.3 parsed records.                                                                                                |
| **Gender Ratios**                    | `BreedingGenderProbability`                                  | `maleRatio` in `pals.ts`                        | **100% Match** across all 299 Pals (accounting for default `50` in `pals.ts` type when `maleRatio` property is omitted).                           |
| **Elements**                         | PalCalc Element catalog                                      | `PAL_ELEMENTS` in `elements.ts`                 | **100% Match** across all 300 Pals.                                                                                                                |
| **Breeding Pair Count**              | 44,850 pairs ($299 \times 300 / 2$)                          | 45,150 pairs ($300 \times 301 / 2$)             | **Exact Match.** Difference of 300 pairs corresponds to 300 self/other pairs containing `WorldTreeDragon`.                                         |
| **Unique Combos**                    | `BreedingMechanics`                                          | 1,598 combos in `uniqueCombos.ts`               | **100% Match.** Matches PalCalc override rules.                                                                                                    |
| **Same-Species-Only List**           | 26 self-only Pals                                            | 26 Pals in `sameSpeciesOnly.ts`                 | **100% Match.**                                                                                                                                    |
| **Movement Speeds**                  | `WalkSpeed`, `RunSpeed`, `RideSprintSpeed`, `TransportSpeed` | `movement` in `stats.ts`                        | **12 Discrepancies (6 Pals).** See details below.                                                                                                  |

### Movement Speed Discrepancies

PalCalc `db.json` provides base unmounted movement speeds for certain mounts/dragons, whereas `stats.ts` (emitted from PalDB pages) records riding/mounted speed values.

| Pal (`internalName`)                 | Field             | PalCalc `db.json` | Repo `stats.ts` (PalDB) | Source Difference Explanation    |
| :----------------------------------- | :---------------- | :---------------- | :---------------------- | :------------------------------- |
| `FairyDragon` (Elphidran)            | `runSpeed`        | 630               | 700.0                   | PalDB displays ride run speed    |
| `FairyDragon` (Elphidran)            | `rideSprintSpeed` | 800               | 1000.0                  | PalDB displays ride sprint speed |
| `FairyDragon_Water` (Elphidran Aqua) | `runSpeed`        | 630               | 700.0                   | PalDB displays ride run speed    |
| `FairyDragon_Water` (Elphidran Aqua) | `rideSprintSpeed` | 800               | 1000.0                  | PalDB displays ride sprint speed |
| `BlackGriffon` (Shadowbeak)          | `runSpeed`        | 850               | 1100.0                  | PalDB displays ride run speed    |
| `BlackGriffon` (Shadowbeak)          | `rideSprintSpeed` | 1200              | 1600.0                  | PalDB displays ride sprint speed |
| `SkyDragon` (Quivern)                | `runSpeed`        | 800               | 900.0                   | PalDB displays ride run speed    |
| `SkyDragon` (Quivern)                | `rideSprintSpeed` | 950               | 1400.0                  | PalDB displays ride sprint speed |
| `SkyDragon_Grass` (Quivern Botan)    | `runSpeed`        | 800               | 900.0                   | PalDB displays ride run speed    |
| `SkyDragon_Grass` (Quivern Botan)    | `rideSprintSpeed` | 950               | 1400.0                  | PalDB displays ride sprint speed |
| `DarkMechaDragon` (Xenolord)         | `runSpeed`        | 550               | 1700.0                  | PalDB displays ride run speed    |
| `DarkMechaDragon` (Xenolord)         | `rideSprintSpeed` | 660               | 2700.0                  | PalDB displays ride sprint speed |

_Note: Per instruction rules, no generated files were hand-edited._

---

## 3. Palworld Patch History & Data Validity

Since the official release of Palworld 1.0.0 on **10 July 2026**, the following patches have been deployed by Pocketpair:

1. **v1.0.1 (12 July 2026):** Initial hotfix for server crash issues and guild permission edge cases.
2. **v1.0.2 (28 July 2026):** Addressed dedicated server disconnections during Panthalus boss fights, pathfinding collision stalls in Feybreak Cavern, and UI rendering fixes.
3. **v1.0.2.100993 (30 July 2026):** Mod stability and processing optimizations.
4. **v1.0.2.101103 (31 July 2026):** Fixed infinite loading screen bug after defeating the World Tree boss.

### Impact Assessment

- **Pals, Breeding Formulas, Passives, Active Skills, Work Suitability, Condensation, Eggs, Items:** **NOT TOUCHED.**
- **Conclusion:** No patch since 1.0.0 invalidates or alters the data currently committed in this repository.

---

## 4. Version Stamp & Provenance Update

`src/data/palworld/version.ts` has been updated to carry explicit, separate provenance structures for both data sources:

```typescript
export const DATA_VERSION = {
  dataVersion: "2.0.2",
  gameVersionTargeted: "1.0 (post-Feybreak, Yakushima)",
  palcalc: {
    commitSha: "4b0af605e877dc566a895f10326962404dcfbc84",
    commitDate: "2026-08-26T20:18:03Z",
    dbVersion: "v27",
    fetchedAt: "2026-08-31",
    url: "https://github.com/tylercamp/palcalc/blob/4b0af605e877dc566a895f10326962404dcfbc84/PalCalc.Model/db.json",
  },
  paldb: {
    displayedVersion: "v1.0.3 (2026/8/12)",
    scrapedAt: "2026-08-19",
    url: "https://paldb.cc",
  },
  sourcedAt: "2026-08-31",
  source: "PalCalc db.json (v27 @ 4b0af60) for breeding/work + PalDB v1.0.3 pages for page-derived fields",
  upstreamDatasetVersion: "PalCalc main @ db.json Version 'v27' (retrieved 2026-08-31)",
  gaps: [ ... ],
} as const;
```

---

## 5. Verification Checks Summary

- `npx tsc --noEmit`: **PASSED**
- `npx vitest run`: **PASSED** (23 tests passed across 2 test files)
- `npm run lint`: **PASSED**
- `npm run build`: **PASSED**
- **Core Offline Bundle Size:** ~2.18 MB (well under the 4.5 MB budget limit).
