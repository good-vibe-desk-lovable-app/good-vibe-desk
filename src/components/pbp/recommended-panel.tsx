// One batch request on the shared pathfinder worker, streamed progress and
// persisted positive chain results. The reachability utility is also used by
// the combat comparison’s “Pals I can breed” scope, so both surfaces keep the
// same definition rather than maintaining divergent breeding logic.
import { useCallback, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { palById } from "@/data/palworld";
import { findBreedableTargets } from "@/lib/breedable-targets";
import type { BatchEntry } from "@/lib/pathfinder";
import type { CollectionEntry } from "@/lib/pathfinder/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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
  const ownedNames = useMemo(
    () =>
      new Map(entries.map((entry) => [entry.instanceId, palById.get(entry.palId)?.name ?? "?"])),
    [entries],
  );

  const run = useCallback(async () => {
    const epoch = ++runEpoch.current;
    setRunning(true);
    setProgress({ done: 0, total: 0 });
    try {
      // The underlying cache is keyed by collection + desired-source state. The
      // comparison board uses the same empty-source run for breedability.
      const result = await findBreedableTargets(entries, {
        desiredSources,
        onProgress: (done, total) => {
          if (runEpoch.current !== epoch) return;
          setProgress({ done, total });
        },
      });
      if (runEpoch.current !== epoch) return;
      setRows(result.entries);
      setTruncated(result.truncated);
    } finally {
      if (runEpoch.current === epoch) setRunning(false);
    }
  }, [desiredSources, entries, runEpoch]);

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
              {top.map((row, index) => {
                const pal = palById.get(row.targetId);
                return (
                  <li key={row.targetId}>
                    <button
                      type="button"
                      onClick={() => onPickTarget(row.targetId)}
                      className="hover:bg-accent/40 flex w-full items-center gap-3 px-3 py-2 text-left"
                    >
                      <span className="w-6 shrink-0 text-xs tabular-nums text-muted-foreground">
                        {index + 1}
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
                        {row.usedSources.map((source) => (
                          <Badge key={source} variant="secondary" className="text-[10px]">
                            {ownedNames.get(source) ?? source}
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
