import { AlertTriangle, CheckCircle2, Copy, Shuffle } from "lucide-react";

import { palById } from "@/data/palworld";
import type { CollectionEntry } from "@/lib/collection";
import type { Result, Step } from "@/lib/pathfinder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  onAlternative,
  alternativeLoading,
}: ResultsPanelProps) {
  const sourceName = (instanceId: string) => {
    const entry = entries.find((e) => e.instanceId === instanceId);
    return entry ? palName(entry.palId) : instanceId.slice(0, 8);
  };

  async function copyChain() {
    try {
      await navigator.clipboard.writeText(chainToText(result, targetId));
    } catch {
      /* clipboard blocked — nothing to do */
    }
  }

  return (
    <Card className="mt-8 border-border/70 bg-card/80">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">Breeding chain</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onAlternative} disabled={alternativeLoading}>
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
            Partial chain — these passives couldn't be carried over:{" "}
            {result.missingSources.map(sourceName).join(", ")}.
          </p>
        ) : (
          <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {result.warnings[0] ??
              "No chain found. Try adding more Pals or selecting fewer passives."}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {result.steps.length > 0 ? (
          <ol className="space-y-2">
            {result.steps.map((step) => (
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
                </div>
                {step.carriedSources.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {step.carriedSources.map((id) => (
                      <Badge key={id} variant="secondary" className="text-[11px]">
                        {sourceName(id)}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
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

        <p className="text-xs text-muted-foreground">Search took {Math.round(result.elapsedMs)}ms.</p>
      </CardContent>
    </Card>
  );
}
