import { Loader2, Shuffle } from "lucide-react";

import type { Result } from "@/lib/pathfinder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AlternativesPanelProps {
  alternatives: Result[];
  loading: boolean;
  onUse: (result: Result) => void;
}

export function AlternativesPanel({ alternatives, loading, onUse }: AlternativesPanelProps) {
  if (!loading && alternatives.length === 0) return null;

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shuffle className="size-4" /> Alternative chains
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Looking for other routes…
          </p>
        ) : null}
        {alternatives.map((alt, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/40 p-3 text-sm"
          >
            <span>
              <strong>Alt {i + 1}</strong> — {alt.steps.length}{" "}
              {alt.steps.length === 1 ? "step" : "steps"}, {alt.coveredSources.length}{" "}
              {alt.coveredSources.length === 1 ? "passive" : "passives"} covered
            </span>
            <Button variant="outline" size="sm" onClick={() => onUse(alt)}>
              Use this chain
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
