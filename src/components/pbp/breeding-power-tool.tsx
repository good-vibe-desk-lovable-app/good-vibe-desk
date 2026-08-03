import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Calculator } from "lucide-react";

import { PALS, palById, resolveChild } from "@/data/palworld";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function PalCombo({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (id: number) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const pal = value === null ? null : palById.get(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={label}
          className="w-full justify-between"
        >
          {pal?.name ?? label}
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(20rem,90vw)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search Pals…" />
          <CommandList>
            <CommandEmpty>No Pal found.</CommandEmpty>
            {PALS.map((p) => (
              <CommandItem
                key={p.id}
                value={`${p.name} ${p.palDexNo}`}
                onSelect={() => {
                  onChange(p.id);
                  setOpen(false);
                }}
              >
                <Check className={cn("size-4", p.id === value ? "opacity-100" : "opacity-0")} />
                <span className="flex-1">{p.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground">#{p.palDexNo}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

type Mode = "forward" | "reverse";

/** Cached across activations so the ~160ms table build happens at most once. */
let pairMapsPromise: Promise<typeof import("@/data/palworld/pairMaps")> | null = null;
function loadPairMaps() {
  // Constraint 1: pairMaps is NEVER statically imported outside /data-check.
  pairMapsPromise ??= import("@/data/palworld/pairMaps");
  return pairMapsPromise;
}

function ReverseLookup() {
  const [child, setChild] = useState<number | null>(null);
  const [parents, setParents] = useState<Array<[number, number]> | null>(null);
  const [loading, setLoading] = useState(false);
  const epoch = useRef(0);

  // Start building the pair tables as soon as this mode is shown.
  useEffect(() => {
    const mine = ++epoch.current;
    setLoading(true);
    loadPairMaps()
      .then(() => {
        if (epoch.current === mine) setLoading(false);
      })
      .catch(() => {
        if (epoch.current === mine) setLoading(false);
      });
    return () => {
      epoch.current++;
    };
  }, []);

  useEffect(() => {
    if (child === null) {
      setParents(null);
      return;
    }
    const mine = ++epoch.current;
    setLoading(true);
    loadPairMaps()
      .then(({ childToParents }) => {
        if (epoch.current !== mine) return;
        setParents(childToParents.get(child) ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (epoch.current !== mine) return;
        setParents([]);
        setLoading(false);
      });
    return () => {
      epoch.current++;
    };
  }, [child]);

  return (
    <div className="space-y-4">
      <PalCombo value={child} onChange={setChild} label="Pal you want" />

      {loading ? (
        <p className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Building the pair tables…
        </p>
      ) : parents === null ? (
        <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
          Pick a Pal to see every pair that produces it.
        </p>
      ) : parents.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
          No pair produces {palById.get(child!)?.name} — it can only be caught in the wild.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {parents.length} {parents.length === 1 ? "pair produces" : "pairs produce"}{" "}
            <span className="font-medium text-foreground">{palById.get(child!)?.name}</span>
          </p>
          <ul className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border/70 p-2">
            {parents.map(([p1, p2]) => (
              <li
                key={`${p1}:${p2}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent/50"
              >
                <span>
                  {palById.get(p1)?.name ?? `#${p1}`} + {palById.get(p2)?.name ?? `#${p2}`}
                </span>
                {p1 === p2 ? (
                  <Badge variant="outline" className="text-[10px]">
                    Same species
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function BreedingPowerTool() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("forward");
  const [a, setA] = useState<number | null>(null);
  const [b, setB] = useState<number | null>(null);

  const outcome = useMemo(() => {
    if (a === null || b === null) return null;
    const res = resolveChild(a, b);
    if (!res) return null;
    const pa = palById.get(a)!;
    const pb = palById.get(b)!;
    const child = palById.get(res.childId);
    const target = Math.floor((pa.combiRank + pb.combiRank + 1) / 2);
    return { res, pa, pb, child, target };
  }, [a, b]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-8">
      <Card className="border-border/70 bg-card/80">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calculator className="size-4" /> Breeding lookup
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="inline-flex rounded-lg border border-border/70 p-1">
              <Button
                size="sm"
                variant={mode === "forward" ? "secondary" : "ghost"}
                onClick={() => setMode("forward")}
              >
                What do X + Y make?
              </Button>
              <Button
                size="sm"
                variant={mode === "reverse" ? "secondary" : "ghost"}
                onClick={() => setMode("reverse")}
              >
                What makes this Pal?
              </Button>
            </div>

            {mode === "reverse" ? (
              <ReverseLookup />
            ) : (
              <>
            <div className="grid gap-3 sm:grid-cols-2">
              <PalCombo value={a} onChange={setA} label="First parent" />
              <PalCombo value={b} onChange={setB} label="Second parent" />
            </div>


            {outcome ? (
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
                <div className="flex flex-wrap items-center gap-2 text-base font-semibold">
                  {outcome.pa.name} + {outcome.pb.name} ={" "}
                  <span className="text-primary">{outcome.child?.name ?? "?"}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {outcome.res.via === "unique"
                      ? "Unique combo"
                      : outcome.res.via === "same-species"
                        ? "Same species"
                        : "Breeding power"}
                  </Badge>
                </div>
                {outcome.res.via === "formula" ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    rank {outcome.pa.combiRank} + {outcome.pb.combiRank} → target {outcome.target} →
                    closest eligible: {outcome.child?.name} ({outcome.child?.combiRank})
                  </p>
                ) : outcome.res.via === "unique" ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    This pair is a special override — it ignores the breeding-power formula.
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Two of the same species always breed true.
                  </p>
                )}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                Pick two Pals to see what they produce.
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
