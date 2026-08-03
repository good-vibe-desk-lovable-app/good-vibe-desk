import { AlertTriangle, CheckCircle2, Copy, Shuffle } from "lucide-react";

import { palById } from "@/data/palworld";
import { HATCH_TIME, getPassive, type CollectionEntry } from "@/lib/collection";
import type { Result, Step } from "@/lib/pathfinder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MergeTree } from "./merge-tree";
import { PassiveChip } from "./passive-chip";
import { SummaryCard } from "./summary-card";

const VIA_LABEL: Record<Step["via"], string> = {
  unique: "Unique combo",
  "same-species": "Same species",
  formula: "Breeding power",
};

function palName(id: number) {
  return palById.get(id)?.name ?? `Pal #${id}`;
}

interface ResultsPanelProps {
  result: Result;
  entries: CollectionEntry[];
  targetId: number;
  /** Passive ids the player picked from a given collection Pal. */
  selectedPassives: (instanceId: string) => string[];
  onAlternative: () => void;
  alternativeLoading?: boolean;
}

export function chainToText(result: Result, targetId: number) {
  const lines = [
    `Breeding chain for ${palName(targetId)} (${result.steps.length} steps)`,
    ...result.steps.map(
      (s) =>
        `${s.index}. ${palName(s.parent1)} + ${palName(s.parent2)} = ${palName(s.child)}  [${VIA_LABEL[s.via]}]`,
    ),
  ];
  if (result.warnings.length) lines.push("", "Warnings:", ...result.warnings.map((w) => `- ${w}`));
  return lines.join("\n");
}

export function ResultsPanel({
  result,
  entries,
  targetId,
  selectedPassives,
  onAlternative,
  alternativeLoading,
}: ResultsPanelProps) {
  const sourceName = (instanceId: string) => {
    const entry = entries.find((e) => e.instanceId === instanceId);
    return entry ? palName(entry.palId) : instanceId.slice(0, 8);
  };

  const sourcePassiveNames = (instanceId: string) =>
    selectedPassives(instanceId).map((id) => getPassive(id)?.name ?? id);

  const carriedPassiveIds = Array.from(
    new Set(result.coveredSources.flatMap((id) => selectedPassives(id))),
  );

  async function copyChain() {
    try {
      await navigator.clipboard.writeText(chainToText(result, targetId));
    } catch {
      /* clipboard blocked — nothing to do */
    }
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Card className="mt-8 border-border/70 bg-card/80">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">Breeding chain</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onAlternative}
                disabled={alternativeLoading}
              >
                <Shuffle className="size-4" /> Show alternative chain
              </Button>
              <Button variant="outline" size="sm" onClick={copyChain}>
                <Copy className="size-4" /> Copy chain
              </Button>
            </div>
          </div>

          {result.status === "ok" ? (
            <p className="flex items-center gap-2 rounded-lg border border-success/50 bg-success/10 p-3 text-sm text-success">
              <CheckCircle2 className="size-4 shrink-0" />
              Found chain in {result.steps.length} {result.steps.length === 1 ? "step" : "steps"}.
            </p>
          ) : result.status === "partial" ? (
            <p className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm text-warning">
              Partial chain — the passives from these Pals didn't make it:{" "}
              {result.missingSources.map(sourceName).join(", ")}.
            </p>
          ) : (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-medium">
                {result.warnings[0] ?? "No chain reaches that Pal from your collection."}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-destructive/90">
                <li>Untick a couple of passives — fewer traits means far more routes.</li>
                <li>
                  Add another Pal you own to the collection, ideally one closer in breeding power to{" "}
                  {palName(targetId)}.
                </li>
              </ul>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {result.steps.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <MergeTree
                steps={result.steps}
                targetId={targetId}
                sourceName={sourceName}
                sourcePassives={sourcePassiveNames}
              />
              <SummaryCard
                result={result}
                targetId={targetId}
                carriedPassiveIds={carriedPassiveIds}
              />
            </div>
          ) : null}

          {result.steps.length > 0 ? (
            <ol className="space-y-2">
              {result.steps.map((step) => {
                const child = palById.get(step.child);
                return (
                  <li
                    key={step.index}
                    className="rounded-xl border border-border/70 bg-background/40 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs tabular-nums text-muted-foreground">
                        Step {step.index}
                      </span>
                      <span className="font-medium">
                        {palName(step.parent1)} + {palName(step.parent2)} = {palName(step.child)}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {VIA_LABEL[step.via]}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {child?.eggType ?? "Common"} · {child?.eggSize ?? "Normal"} egg ·{" "}
                        {HATCH_TIME[child?.eggSize ?? ""] ?? "—"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] tabular-nums">
                        ~{Math.max(1, Math.round(step.expectedAttempts))} tries
                      </Badge>

                    </div>
                    {step.carriedSources.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Array.from(
                          new Set(step.carriedSources.flatMap((id) => selectedPassives(id))),
                        ).map((passiveId) => (
                          <PassiveChip key={passiveId} passiveId={passiveId} carried />
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          ) : null}

          {result.warnings.length > 0 ? (
            <ul className="space-y-1 rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm text-warning">
              {result.warnings.map((w, i) => (
                <li key={i} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Search took {Math.round(result.elapsedMs)}ms.
          </p>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
