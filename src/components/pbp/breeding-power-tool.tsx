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

export function BreedingPowerTool() {
  const [open, setOpen] = useState(false);
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
              <Calculator className="size-4" /> What do X + Y make?
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
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
