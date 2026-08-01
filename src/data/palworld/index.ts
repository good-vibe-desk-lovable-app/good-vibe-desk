// Barrel exports + generated lookup maps for the Palworld data layer.
//
// Deliberately cheap to import: the pathfinder worker and every route pull
// this in, so nothing here may do heavy precompute at module init. The full
// pair-space tables (pairToChild / childToParents) live in ./pairMaps and are
// imported only by the /data-check diagnostics route.
export type {
  Pal,
  UniqueCombo,
  Passive,
  BreedingResult,
  BreedingVia,
  EggType,
  EggSize,
} from "./types";
export { PALS } from "./pals";
export { UNIQUE_COMBOS } from "./uniqueCombos";
export { SAME_SPECIES_ONLY } from "./sameSpeciesOnly";
export { PASSIVES } from "./passives";
export { PAL_PASSIVES } from "./palPassives";
export { DATA_VERSION } from "./version";
export { resolveChild } from "./breeding";

import { PALS } from "./pals";
import type { Pal } from "./types";

// palById — fast id -> Pal lookup
export const palById: Map<number, Pal> = new Map(PALS.map((p) => [p.id, p]));
