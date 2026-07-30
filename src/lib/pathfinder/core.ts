// Pure search core. Takes its data through `deps` so tests can run on tiny
// fixtures without importing the full Palworld dataset.
import type {
  BreedingVia,
  CollectionEntry,
  PathfinderOptions,
  Result,
  Step,
} from "./types";

export interface ResolverPal {
  id: number;
  name?: string;
  combiRank: number;
  breedingPowerPriority: number;
  indexOrder: number;
  breedingEligible: boolean;
  isVariant: boolean;
}

export interface ResolverCombo {
  parent1Id: number;
  parent2Id: number;
  childId: number;
  orderSensitive?: boolean;
}

export type Resolve = (a: number, b: number) => { childId: number; via: BreedingVia } | null;

export interface SearchDeps {
  resolve: Resolve;
  sameSpeciesOnly: Set<number>;
  nameOf: (palId: number) => string;
  /** Breeding power, used to steer the beam toward the target species. */
  rankOf?: (palId: number) => number;
}


/**
 * Mirrors src/data/palworld/breeding.ts exactly, but over supplied fixtures.
 * Used by the tests; production code passes the generated resolver instead.
 */
export function createResolver(pals: ResolverPal[], combos: ResolverCombo[] = []): Resolve {
  const byId = new Map(pals.map((p) => [p.id, p]));
  const eligible = pals.filter((p) => p.breedingEligible);
  const ordered = new Map<string, ResolverCombo>();
  const symmetric = new Map<string, ResolverCombo>();
  for (const c of combos) {
    if (c.orderSensitive) ordered.set(`${c.parent1Id}:${c.parent2Id}`, c);
    else
      symmetric.set(
        `${Math.min(c.parent1Id, c.parent2Id)}:${Math.max(c.parent1Id, c.parent2Id)}`,
        c,
      );
  }

  return (parent1Id, parent2Id) => {
    const p1 = byId.get(parent1Id);
    const p2 = byId.get(parent2Id);
    if (!p1 || !p2) return null;

    const ordA = ordered.get(`${parent1Id}:${parent2Id}`);
    if (ordA) return { childId: ordA.childId, via: "unique" };
    const ordB = ordered.get(`${parent2Id}:${parent1Id}`);
    if (ordB) return { childId: ordB.childId, via: "unique" };
    const sym = symmetric.get(
      `${Math.min(parent1Id, parent2Id)}:${Math.max(parent1Id, parent2Id)}`,
    );
    if (sym) return { childId: sym.childId, via: "unique" };

    if (parent1Id === parent2Id) return { childId: parent1Id, via: "same-species" };

    const target = Math.floor((p1.combiRank + p2.combiRank + 1) / 2);
    let best: ResolverPal | null = null;
    let bestDiff = Infinity;
    let bestPri = -Infinity;
    let bestVariant = 2;
    let bestIdx = Infinity;
    for (const p of eligible) {
      const diff = Math.abs(p.combiRank - target);
      const variant = p.isVariant ? 1 : 0;
      if (
        diff < bestDiff ||
        (diff === bestDiff && p.breedingPowerPriority > bestPri) ||
        (diff === bestDiff && p.breedingPowerPriority === bestPri && variant < bestVariant) ||
        (diff === bestDiff &&
          p.breedingPowerPriority === bestPri &&
          variant === bestVariant &&
          p.indexOrder < bestIdx)
      ) {
        best = p;
        bestDiff = diff;
        bestPri = p.breedingPowerPriority;
        bestVariant = variant;
        bestIdx = p.indexOrder;
      }
    }
    return best ? { childId: best.id, via: "formula" } : null;
  };
}

