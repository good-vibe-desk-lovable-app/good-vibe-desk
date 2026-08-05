import { AlertTriangle, Target } from "lucide-react";

import { SAME_SPECIES_ONLY } from "@/data/palworld";
import type { Pal } from "@/data/palworld";
import { HATCH_TIME, genderRatioNote } from "@/lib/collection";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HabitatCard } from "./habitat-card";
import { PalPicker } from "./pal-picker";

interface TargetPanelProps {
  target: Pal | null;
  onSelect: (palId: number) => void;
  favorites: number[];
  onToggleFavorite: (palId: number) => void;
  ownedIds?: number[];
}

export function TargetPanel({
  target,
  onSelect,
  favorites,
  onToggleFavorite,
  ownedIds = [],
}: TargetPanelProps) {
  const locked = target ? SAME_SPECIES_ONLY.has(target.id) : false;
  const ratioNote = target ? genderRatioNote(target.name, target.maleRatio) : null;

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="text-lg">Target Pal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <PalPicker
          selectedId={target?.id ?? null}
          onSelect={onSelect}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          ownedIds={ownedIds}
        />

        {target ? (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Target className="size-4 text-primary" />
              <h3 className="text-base font-semibold">{target.name}</h3>
              <span className="text-xs text-muted-foreground">#{target.palDexNo}</span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Egg size</dt>
                <dd className="font-medium">{target.eggSize}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Hatch time</dt>
                <dd className="font-medium">{HATCH_TIME[target.eggSize] ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Breeding power</dt>
                <dd className="font-medium tabular-nums">{target.combiRank}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Bred by formula</dt>
                <dd className="font-medium">{target.breedingEligible ? "Yes" : "Unique only"}</dd>
              </div>
            </dl>
            {target.elements.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1">
                {target.elements.map((el) => (
                  <Badge key={el} variant="secondary" className="text-[11px]">
                    {el}
                  </Badge>
                ))}
              </div>
            ) : null}
            {ratioNote ? <p className="mt-3 text-xs text-warning">{ratioNote}</p> : null}
            <div className="mt-3">
              <HabitatCard pal={target} />
            </div>
            {locked ? (
              <p className="mt-3 flex gap-2 rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm text-warning">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  {target.name} can only be bred from two {target.name}s — you'll need to catch at
                  least one male and one female.
                </span>
              </p>
            ) : null}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
            Pick the Pal you want to breed.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
