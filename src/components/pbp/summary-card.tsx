import { Cake, Egg, Star } from "lucide-react";

import { palById } from "@/data/palworld";
import { HATCH_HOURS } from "@/lib/collection";
import type { Result } from "@/lib/pathfinder";
import { PassiveChip } from "./passive-chip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SummaryCardProps {
  result: Result;
  targetId: number;
  /** Passive ids that reach the target, in display order. */
  carriedPassiveIds: string[];
}

export function SummaryCard({ result, targetId, carriedPassiveIds }: SummaryCardProps) {
  const target = palById.get(targetId);
  const eggs = result.steps.length;

  // Single-pass incubation (one egg per step) and the retry-weighted total.
  let lo = 0;
  let hi = 0;
  let retryLo = 0;
  let retryHi = 0;
  for (const step of result.steps) {
    const size = palById.get(step.child)?.eggSize ?? "Normal";
    const [a, b] = HATCH_HOURS[size] ?? [0, 0];
    lo += a;
    hi += b;
    const tries = Math.max(1, step.expectedAttempts);
    retryLo += a * tries;
    retryHi += b * tries;
  }
  const hours = (n: number) => Math.round(n);
  const days = (n: number) => (Math.round((n / 24) * 10) / 10).toFixed(1);


  return (
    <Card className="border-warning/40 bg-card/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Star className="size-4 text-warning" />
          {target?.name ?? `Pal #${targetId}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="flex h-28 items-center justify-center rounded-xl border border-dashed border-border/70 bg-background/40 text-xs text-muted-foreground"
          aria-hidden="true"
        >
          {target?.eggType ?? "Common"} egg · {target?.eggSize ?? "Normal"}
        </div>

        {carriedPassiveIds.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {carriedPassiveIds.map((id) => (
              <PassiveChip key={id} passiveId={id} carried />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No passives make it to the target.</p>
        )}

        <p className="flex items-center gap-2 text-sm">
          <Egg className="size-4 text-muted-foreground" />
          <span className="tabular-nums">
            {eggs} {eggs === 1 ? "step" : "steps"} · ~{Math.round(result.totalExpectedEggs)} total
            eggs expected · ~{lo}h–{hi}h total incubation
          </span>
        </p>

        <p className="text-xs text-muted-foreground">
          Egg estimates use provisional inheritance odds.
        </p>


        <p className="flex gap-2 rounded-lg border border-border/70 bg-background/40 p-3 text-xs text-muted-foreground">
          <Cake className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            <strong className="text-foreground">Cakes you'll want:</strong> Special Cake to improve
            passive inheritance, Vegetable Cake for two eggs per breed, and Extravagant Vegetable
            Cake for better stats and mutation odds.
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
