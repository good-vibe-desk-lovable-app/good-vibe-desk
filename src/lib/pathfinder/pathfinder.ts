// Production binding: the pure core wired to the generated Palworld dataset.
import { SAME_SPECIES_ONLY, palById, resolveChild } from "@/data/palworld";
import { search, type Resolve, type SearchDeps } from "./core";
import type { CollectionEntry, PathfinderOptions, Result } from "./types";

const cache = new Map<string, ReturnType<Resolve>>();

const resolve: Resolve = (a, b) => {
  const key = a <= b ? `${a}:${b}` : `${b}:${a}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const res = resolveChild(a, b);
  cache.set(key, res);
  return res;
};

export const deps: SearchDeps = {
  resolve,
  sameSpeciesOnly: SAME_SPECIES_ONLY as Set<number>,
  nameOf: (palId) => palById.get(palId)?.name ?? `Pal #${palId}`,
};

export function findBreedingChain(
  targetId: number,
  collection: CollectionEntry[],
  desiredSources: string[],
  options?: PathfinderOptions,
  onProgress?: (partial: Result) => void,
): Result {
  return search(deps, targetId, collection, desiredSources, options, onProgress);
}
