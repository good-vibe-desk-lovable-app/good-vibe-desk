import { PALS } from "@/data/palworld";
import { runBatchPathfinder, type BatchEntry } from "@/lib/pathfinder";
import type { CollectionEntry } from "@/lib/pathfinder/types";

const BREEDABLE_TARGET_IDS = PALS.filter((pal) => pal.breedingEligible).map((pal) => pal.id);
const PERSIST_KEY = "pbp:breedable-targets:v1";
const PERSIST_MAX = 3;

export interface BreedableTargetRun {
  entries: BatchEntry[];
  truncated: boolean;
}

/** Same collection identity used by the existing batch recommendation search. */
export function breedableTargetsKey(
  collection: CollectionEntry[],
  desiredSources: string[] = [],
): string {
  return (
    collection
      .map(
        (entry) => `${entry.instanceId}:${entry.palId}:${[...entry.passiveIds].sort().join(",")}`,
      )
      .sort()
      .join("|") +
    "#" +
    [...desiredSources].sort().join(",")
  );
}

function readPersisted(): Record<string, BreedableTargetRun> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    return raw ? (JSON.parse(raw) as Record<string, BreedableTargetRun>) : {};
  } catch {
    return {};
  }
}

function writePersisted(key: string, value: BreedableTargetRun) {
  if (typeof window === "undefined") return;
  try {
    const all = readPersisted();
    all[key] = value;
    const keys = Object.keys(all);
    while (keys.length > PERSIST_MAX) {
      const oldest = keys.shift();
      if (oldest) delete all[oldest];
    }
    window.localStorage.setItem(PERSIST_KEY, JSON.stringify(all));
  } catch {
    /* Cached results are an optimization; the completed in-memory result remains useful. */
  }
}

/**
 * Reuses the pathfinder’s one-worker batch search to surface only species with
 * a positive fully-resolved chain. A missing result is never treated as a
 * negative claim: it can reflect an empty collection, a timeout, or search
 * scope. Callers expose `truncated` rather than labeling omitted species
 * unbreedable.
 */
export async function findBreedableTargets(
  collection: CollectionEntry[],
  {
    desiredSources = [],
    onProgress,
  }: {
    desiredSources?: string[];
    onProgress?: (done: number, total: number) => void;
  } = {},
): Promise<BreedableTargetRun> {
  const key = breedableTargetsKey(collection, desiredSources);
  const cached = readPersisted()[key];
  if (cached) return cached;

  const result = await runBatchPathfinder(
    {
      collection,
      desiredSources,
      targetIds: BREEDABLE_TARGET_IDS,
      perTargetTimeoutMs: 200,
    },
    { budgetMs: 10_000, onProgress },
  );
  writePersisted(key, result);
  return result;
}

/** Positive, non-partial pathfinder results only. */
export function confirmedBreedableTargetIds(run: BreedableTargetRun): Set<number> {
  return new Set(
    run.entries.filter((entry) => entry.status === "ok").map((entry) => entry.targetId),
  );
}
