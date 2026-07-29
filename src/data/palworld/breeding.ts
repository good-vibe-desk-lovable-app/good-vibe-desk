// AUTO-GENERATED. Pure resolver for offspring given two parent ids.
// Rules (mirrors tylercamp/palcalc PalBreedingCalculator):
//  a) Unique combo override (respecting orderSensitive rows).
//  b) Same species -> that species (via "same-species").
//  c) Rank formula: target = floor((r1 + r2 + 1) / 2). Among pals with
//     breedingEligible=true, pick minimum |combiRank - target|. Ties break on
//     highest breedingPowerPriority, then non-variant preferred, then lowest indexOrder.
//  d) Returns null only when either parent id is unknown.
import { PALS } from "./pals";
import { UNIQUE_COMBOS } from "./uniqueCombos";
import type { BreedingResult, Pal, UniqueCombo } from "./types";

const palById: Map<number, Pal> = new Map(PALS.map((p) => [p.id, p]));
const eligiblePals: readonly Pal[] = PALS.filter((p) => p.breedingEligible);

// Split unique combos into order-sensitive (direction-specific) and symmetric.
const orderedCombos: Map<string, UniqueCombo> = new Map();
const symmetricCombos: Map<string, UniqueCombo> = new Map();
for (const c of UNIQUE_COMBOS) {
  if (c.orderSensitive) {
    orderedCombos.set(`${c.parent1Id}:${c.parent2Id}`, c);
  } else {
    const a = Math.min(c.parent1Id, c.parent2Id);
    const b = Math.max(c.parent1Id, c.parent2Id);
    symmetricCombos.set(`${a}:${b}`, c);
  }
}

export function resolveChild(
  parent1Id: number,
  parent2Id: number,
): BreedingResult | null {
  const p1 = palById.get(parent1Id);
  const p2 = palById.get(parent2Id);
  if (!p1 || !p2) return null;

  // a) unique combo — try both directions for order-sensitive
  const ordA = orderedCombos.get(`${parent1Id}:${parent2Id}`);
  if (ordA) return { childId: ordA.childId, via: "unique" };
  const ordB = orderedCombos.get(`${parent2Id}:${parent1Id}`);
  if (ordB) return { childId: ordB.childId, via: "unique" };
  const key = `${Math.min(parent1Id, parent2Id)}:${Math.max(parent1Id, parent2Id)}`;
  const sym = symmetricCombos.get(key);
  if (sym) return { childId: sym.childId, via: "unique" };

  // b) same species
  if (parent1Id === parent2Id) {
    return { childId: parent1Id, via: "same-species" };
  }

  // c) rank formula
  const target = Math.floor((p1.combiRank + p2.combiRank + 1) / 2);
  let best: Pal | null = null;
  let bestDiff = Number.POSITIVE_INFINITY;
  let bestPri = -Infinity;
  let bestVariantScore = 2;
  let bestIdx = Number.POSITIVE_INFINITY;
  for (const p of eligiblePals) {
    const diff = Math.abs(p.combiRank - target);
    const pri = p.breedingPowerPriority;
    const variantScore = p.isVariant ? 1 : 0;
    const idx = p.indexOrder;
    if (
      diff < bestDiff ||
      (diff === bestDiff && pri > bestPri) ||
      (diff === bestDiff && pri === bestPri && variantScore < bestVariantScore) ||
      (diff === bestDiff && pri === bestPri && variantScore === bestVariantScore && idx < bestIdx)
    ) {
      best = p;
      bestDiff = diff;
      bestPri = pri;
      bestVariantScore = variantScore;
      bestIdx = idx;
    }
  }
  if (!best) return null;
  return { childId: best.id, via: "formula" };
}
