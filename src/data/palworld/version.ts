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
  source:
    "PalCalc db.json (v27 @ 4b0af60) for breeding/work + PalDB v1.0.3 pages for page-derived fields",
  upstreamDatasetVersion: "PalCalc main @ db.json Version 'v27' (retrieved 2026-08-31)",
  gaps: [
    "Egg types are NOT in the current PalCalc export — pals.ts retains the existing neutral placeholder where no exact source table is available.",
    "Egg sizes are approximated from PalCalc Size (XS/S -> Normal, M/L -> Large, XL -> Huge); exact game egg-size table not sourced.",
    "PalCalc contains complete twelve-type work rows for 299 Pals but has no WorldTreeDragon record. Astralym therefore remains uncomputable instead of receiving an inferred stats block.",
    "PalCalc contains an active-skill catalog, not per-Pal learnsets. skills.ts is sourced from the section-bounded PalDB page parser.",
    "Passive-inheritance and IV-inheritance constants exist in PalCalc BreedingMechanics but are not surfaced here — this data layer only exposes the resolver.",
    "PAL_PASSIVES only lists guaranteed passives; unrestricted pals use the 'any' marker.",
  ],
} as const;
