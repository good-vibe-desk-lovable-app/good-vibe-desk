import type { Pal } from "@/data/palworld";

import { acquisitionOf } from "./acquisition";

/**
 * Whether the app lacks a non-breeding way to seed this Pal into a collection.
 *
 * `breedingEligible` only limits rank-formula children: ineligible Pals can
 * still be legitimate unique-combo children and can act as parents. This rule
 * is deliberately narrower. It applies only when an ineligible Pal also has no
 * resolved acquisition channel, where presenting X + X = X as a way to obtain
 * X would be circular.
 */
export function needsExistingStockForBreeding(pal: Pal): boolean {
  return !pal.breedingEligible && acquisitionOf(pal.internalName).channel === "unknown";
}

/** True only for the circular X + X = X presentation case. */
export function isUnresolvedCircularSelfPair(
  target: Pal,
  parent1Id: number,
  parent2Id: number,
): boolean {
  return (
    needsExistingStockForBreeding(target) && parent1Id === target.id && parent2Id === target.id
  );
}

export function unresolvedCircularBreedingMessage(pal: Pal): string {
  return `${pal.name} is not a rank-formula breeding target and has no resolved acquisition channel. Breeding two ${pal.name}s would require already owning them, so that circular self-pair is not shown as a way to obtain one.`;
}
