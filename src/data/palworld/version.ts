export const DATA_VERSION = {
  dataVersion: "2.0.0",
  gameVersionTargeted: "1.0 (post-Feybreak, Yakushima)",
  sourcedAt: "2026-07-28",
  source: "tylercamp/palcalc db.json (v27) + breeding.json cross-checked in-place",
  upstreamDatasetVersion: "palcalc main @ db.json Version 'v27'",
  gaps: [
    "Element affinities are NOT in palcalc db.json — every Pal ships elements: [] and the SPOT-CHECK page marks this as an open gap.",
    "Egg types are NOT in palcalc db.json — every Pal ships eggType: 'Common' as a neutral placeholder.",
    "Egg sizes are approximated from palcalc Size (XS/S -> Normal, M/L -> Large, XL -> Huge); exact game egg-size table not sourced.",
    "Passive-inheritance and IV-inheritance constants ARE in palcalc BreedingMechanics but are not surfaced here — this data layer only exposes the resolver.",
    "PAL_PASSIVES only lists guaranteed passives; unrestricted pals use the 'any' marker.",
  ],
} as const;
