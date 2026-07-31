import { useMemo, useState } from "react";
import { AlertTriangle, Search, Star, Target } from "lucide-react";

import { PALS, SAME_SPECIES_ONLY } from "@/data/palworld";
import type { Pal } from "@/data/palworld";
import { HATCH_TIME, genderRatioNote } from "@/lib/collection";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TargetPanelProps {
  target: Pal | null;
  onSelect: (palId: number) => void;
  favorites: number[];
  onToggleFavorite: (palId: number) => void;
}

export function TargetPanel({
  target,
  onSelect,
  favorites,
  onToggleFavorite,
}: TargetPanelProps) {
  const [query, setQuery] = useState("");
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? PALS.filter((p) => p.name.toLowerCase().includes(q) || String(p.palDexNo).startsWith(q))
      : PALS;
    // Favourites float to the top, otherwise the dataset order is preserved.
    const sorted = [...list].sort(
      (a, b) => Number(favoriteSet.has(b.id)) - Number(favoriteSet.has(a.id)),
    );
    return sorted.slice(0, 200);
  }, [query, favoriteSet]);


  const locked = target ? SAME_SPECIES_ONLY.has(target.id) : false;
  const ratioNote = target ? genderRatioNote(target.name, target.maleRatio) : null;

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="text-lg">Target Pal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Which Pal are you breeding for?"
            className="pl-9"
            aria-label="Search for a target Pal"
            autoComplete="off"
          />
        </div>

        <ScrollArea className="h-52 rounded-lg border">
          <ul className="p-1">
            {results.map((pal) => (
              <li key={pal.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => onToggleFavorite(pal.id)}
                  aria-label={
                    favoriteSet.has(pal.id)
                      ? `Remove ${pal.name} from favourites`
                      : `Add ${pal.name} to favourites`
                  }
                  aria-pressed={favoriteSet.has(pal.id)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-warning"
                >
                  <Star
                    className={cn(
                      "size-4",
                      favoriteSet.has(pal.id) ? "fill-warning text-warning" : "",
                    )}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onSelect(pal.id)}
                  className={cn(
                    "flex flex-1 items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                    pal.id === target?.id
                      ? "bg-primary/15 text-foreground"
                      : "hover:bg-accent/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="w-12 shrink-0 text-xs tabular-nums opacity-70">
                    #{pal.palDexNo}
                  </span>
                  <span className="flex-1 font-medium">{pal.name}</span>
                  {SAME_SPECIES_ONLY.has(pal.id) ? (
                    <Badge variant="outline" className="text-[10px]">
                      self only
                    </Badge>
                  ) : null}
                </button>
              </li>
            ))}

            {results.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                No Pals match “{query}”.
              </li>
            ) : null}
          </ul>
        </ScrollArea>

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
