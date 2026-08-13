// AUTO-GENERATED SUPPORTING TYPES for Palworld Breeding data layer.
// Sourced from tylercamp/palcalc db.json + breeding.json.

export type EggType =
  "Common" | "Skilled" | "Dragon" | "Rocky" | "Damp" | "Frozen" | "Verdant" | "Scorching" | "Dark";

export type EggSize = "Normal" | "Large" | "Huge";

export interface Pal {
  id: number; // Stable internal index (unique). Paldex numbers are NOT unique across variants.
  palDexNo: number; // In-game Paldeck number (may collide with variants).
  isVariant: boolean;
  internalName: string; // Palcalc / game internal name.
  name: string;
  combiRank: number; // "Combi Rank" / BreedingPower — hidden breeding power.
  breedingPowerPriority: number; // Secondary breeding-power sort key (rare overrides for variants).
  indexOrder: number; // Internal index; used for deterministic tie-breaks only.
  breedingEligible: boolean; // Can this species be produced by the rank formula?
  elements: string[]; // Not present in palcalc db.json — see version.ts gaps.
  eggType: EggType; // Not present in palcalc db.json — see version.ts gaps.
  eggSize: EggSize; // Derived from palcalc Size (XS/S -> Normal, M/L -> Large, XL -> Huge).
  maleRatio?: number; // 0-100, omitted when 50/50.
  imageUrl?: string;
}

export interface UniqueCombo {
  parent1Id: number;
  parent2Id: number;
  childId: number;
  orderSensitive?: boolean; // when true, (parent1, parent2) is a specific direction.
}

export interface Passive {
  id: string;
  name: string;
  description: string;
  tier: "common" | "rare" | "epic" | "legendary";
}

export type BreedingVia = "unique" | "same-species" | "formula";

export interface BreedingResult {
  childId: number;
  via: BreedingVia;
}
