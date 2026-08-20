import { describe, expect, it } from "vitest";

import { PALS, palById } from "@/data/palworld";
import { childToParents } from "@/data/palworld/pairMaps";

import {
  isUnresolvedCircularSelfPair,
  needsExistingStockForBreeding,
} from "../unresolved-circular-breeding";

const GRIZZBOLT = 19;
const ASTRALYM = 309;

describe("unresolved circular breeding", () => {
  it("suppresses only Astralym's circular self-pair while it has no resolved acquisition channel", () => {
    const astralym = palById.get(ASTRALYM)!;
    const parents = childToParents.get(ASTRALYM) ?? [];

    expect(astralym.breedingEligible).toBe(false);
    expect(PALS.filter(needsExistingStockForBreeding).map((pal) => pal.id)).toEqual([ASTRALYM]);
    expect(needsExistingStockForBreeding(astralym)).toBe(true);
    expect(parents).toEqual([[ASTRALYM, ASTRALYM]]);
    expect(
      parents.filter(
        ([parent1Id, parent2Id]) => !isUnresolvedCircularSelfPair(astralym, parent1Id, parent2Id),
      ),
    ).toEqual([]);
  });

  it("keeps a supported same-species-only Pal visible as a legitimate existing-stock recipe", () => {
    const grizzbolt = palById.get(GRIZZBOLT)!;

    expect(grizzbolt.breedingEligible).toBe(false);
    expect(needsExistingStockForBreeding(grizzbolt)).toBe(false);
    expect(isUnresolvedCircularSelfPair(grizzbolt, GRIZZBOLT, GRIZZBOLT)).toBe(false);
  });
});
