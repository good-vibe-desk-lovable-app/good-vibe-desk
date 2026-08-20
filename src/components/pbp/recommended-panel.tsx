// Part 5 — cheapest targets from the collection you already own.
//
// One batch request on the SHARED worker (Knowledge constraint 3): a single
// requestId, streamed progress, partial ranked results if the budget runs out.
// Results are cached by a hash of the collection + desired sources, and the
// caller's runEpoch guard (constraint 4) protects every state write.
import { useCallback, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { PALS, palById } from "@/data/palworld";
import { runBatchPathfinder, type BatchEntry } from "@/lib/pathfinder";
import type { CollectionEntry } from "@/lib/pathfinder/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

/**
 * Targets worth suggesting. `breedingEligible: false` marks the IgnoreCombi
 * Pals (Astralym, the raid bosses) — they can never be produced by breeding two
 * other Pals, so proposing them is worse than proposing nothing.
 */
const BREEDABLE_TARGET_IDS = PALS.filter((p) => p.breedingEligible).map((p) => p.id);

/** Cap the session cache so a long session can't grow it without bound. */
const MAX_CACHE_ENTRIES = 10;

function hashOf(collection: CollectionEntry[], desiredSources: string[]): string {
  return (
    collection
      .map((e) => `${e.instanceId}:${e.palId}:${[...e.passiveIds].sort().join(",")}`)
      .sort()
      .join("|") +
    "#" +
    [...desiredSources].sort().join(",")
  );
}

/**
 * Results survive a reload.
 *
 * The batch search runs against every breedable target with a 10s budget, so
 * an in-memory cache meant paying that wait again on every page load even
 * though the answer only changes when the collection does. Keyed by the same
 * collection hash, so invalidation is unchanged — it is purely a longer-lived
 * store behind the existing key.
 */
const PERSIST_KEY = "pbp:recommended:v1";
/** Keep a couple of recent collection states; anything older is not worth the quota. */
const PERSIST_MAX = 3;

type CachedRun = { entries: BatchEntry[]; truncated: boolean };

function readPersisted(): Record<string, CachedRun> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CachedRun>) : {};
  } catch {
    return {};
  }
}

function writePersisted(key: string, value: CachedRun) {
  if (typeof window === "undefined") return;
  try {
    const all = readPersisted();
    all[key] = value;
    // Trim oldest-first so a long session cannot grow this without bound.
    const keys = Object.keys(all);
    while (keys.length > PERSIST_MAX) {
      const oldest = keys.shift();
      if (oldest) delete all[oldest];
    }
    window.localStorage.setItem(PERSIST_KEY, JSON.stringify(all));
  } catch {
    /* quota — the in-memory cache still serves this session */
  }
}

export function RecommendedPanel({
  entries,
  desiredSources,
  onPickTarget,
  runEpoch,
}: {
  entries: CollectionEntry[];
  desiredSources: string[];
  onPickTarget: (palId: number) => void;
  runEpoch: React.MutableRefObject<number>;
}) {
  const [rows, setRows] = useState<BatchEntry[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  // Seeded from localStorage so a reload does not re-run a 10-second search.
  const cache = useRef(new Map<string, CachedRun>(Object.entries(readPersisted())));

  const key = useMemo(() => hashOf(entries, desiredSources), [entries, desiredSources]);
  const ownedNames = useMemo(
    () => new Map(entries.map((e) => [e.instanceId, palById.get(e.palId)?.name ?? "?"])),
    [entries],
  );

  const run = useCallback(async () => {
    // Check the cache BEFORE bumping runEpoch. The epoch is shared with the
    // main pathfinder search, so bumping it on a cache hit would silently
    // cancel a running "Find breeding chain" while doing no work of our own.
    const cached = cache.current.get(key);
    if (cached) {
      setRows(cached.entries);
      setTruncated(cached.truncated);
      return;
    }

    const epoch = ++runEpoch.current;
    setRunning(true);
    setProgress({ done: 0, total: BREEDABLE_TARGET_IDS.length });
    try {
      const result = await runBatchPathfinder(
        {
          collection: entries,
          desiredSources,
          targetIds: BREEDABLE_TARGET_IDS,
          perTargetTimeoutMs: 200,
        },
        {
          budgetMs: 10000,
          onProgress: (done, total) => {
            if (runEpoch.current !== epoch) return;
            setProgress({ done, total });
          },
        },
      );
      if (runEpoch.current !== epoch) return; // superseded by a collection edit
      if (cache.current.size >= MAX_CACHE_ENTRIES) {
        const oldest = cache.current.keys().next().value;
        if (oldest !== undefined) cache.current.delete(oldest);
      }
      cache.current.set(key, result);
      // Mirror to storage so the next page load is instant.
      writePersisted(key, result);
      setRows(result.entries);
      setTruncated(result.truncated);
    } finally {
      // Must run even on the superseded path, or the button stays disabled
      // and the progress bar sticks until a page reload.
      if (runEpoch.current === epoch) setRunning(false);
    }
  }, [entries, desiredSources, key, runEpoch]);

  const top = (rows ?? []).slice(0, 20);

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" /> Cheapest targets for your collection
        </CardTitle>
        <Button size="sm" onClick={run} disabled={running || entries.length === 0}>
          {running ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : null}
          {rows ? "Recompute" : "Compute"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Add a few Pals to your collection and this will rank every breedable species by how many
            eggs it would take you.
          </p>
        ) : null}

        {running ? (
          <div className="space-y-1">
            <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
            <p className="text-xs tabular-nums text-muted-foreground">
              {progress.done} / {progress.total} targets searched
            </p>
          </div>
        ) : null}

        {rows && top.length === 0 && !running ? (
          <p className="text-xs text-muted-foreground">
            No target was reachable from this collection within the search budget.
          </p>
        ) : null}

        {top.length > 0 ? (
          <>
            <ul className="divide-y divide-border/60 rounded-xl border border-border/70">
              {top.map((row, i) => {
                const pal = palById.get(row.targetId);
                return (
                  <li key={row.targetId}>
                    <button
                      type="button"
                      onClick={() => onPickTarget(row.targetId)}
                      className="hover:bg-accent/40 flex w-full items-center gap-3 px-3 py-2 text-left"
                    >
                      <span className="w-6 shrink-0 text-xs tabular-nums text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {pal?.name ?? `Pal #${row.targetId}`}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        ~{row.totalExpectedEggs.toFixed(1)} eggs · {row.stepCount} steps
                      </span>
                    </button>
                    {row.usedSources.length > 0 ? (
                      <p className="flex flex-wrap gap-1 px-3 pb-2">
                        {row.usedSources.map((s) => (
                          <Badge key={s} variant="secondary" className="text-[10px]">
                            {ownedNames.get(s) ?? s}
                          </Badge>
                        ))}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-muted-foreground">
              Egg counts are approximate — random passives can enlarge a later pool, duplicate one
              already present, or supply a desired trait, so no universal direction is guaranteed.
              {truncated ? " The budget ran out, so this is a partial ranking." : ""}
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
