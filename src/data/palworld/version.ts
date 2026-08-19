export const DATA_VERSION = {
  dataVersion: "2.0.1",
  gameVersionTargeted: "1.0 (post-Feybreak, Yakushima)",
  sourcedAt: "2026-08-19",
  source: "PalCalc db.json (v27) for breeding/work + PalDB v1.0.3 pages for page-derived fields",
  upstreamDatasetVersion: "PalCalc main @ db.json Version 'v27' (retrieved 2026-08-19)",
  palcalcFetchedAt: "2026-08-19",
  paldbScrapedAt: "2026-08-19",
  paldbDisplayedVersion: "v1.0.3 (2026/8/12)",
  gaps: [
    "Egg types are NOT in the current PalCalc export — pals.ts retains the existing neutral placeholder where no exact source table is available.",
    "Egg sizes are approximated from PalCalc Size (XS/S -> Normal, M/L -> Large, XL -> Huge); exact game egg-size table not sourced.",
    "PalCalc contains complete twelve-type work rows for 299 Pals but has no WorldTreeDragon record. Astralym therefore remains uncomputable instead of receiving an inferred stats block.",
    "PalCalc contains an active-skill catalog, not per-Pal learnsets. skills.ts is sourced from the section-bounded PalDB page parser.",
    "Passive-inheritance and IV-inheritance constants exist in PalCalc BreedingMechanics but are not surfaced here — this data layer only exposes the resolver.",
    "PAL_PASSIVES only lists guaranteed passives; unrestricted pals use the 'any' marker.",
  ],
} as const;
