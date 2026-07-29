import { useEffect, useMemo, useState } from "react";
import { Check, Search } from "lucide-react";

import { PALS } from "@/data/palworld";
import type { Pal } from "@/data/palworld";
import {
  MAX_PASSIVE_SLOTS,
  genderRatioNote,
  guaranteedPassiveIds,
  newInstanceId,
  passivesForPal,
  type CollectionEntry,
  type Gender,
} from "@/lib/collection";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";

const GENDERS: Array<{ value: Gender; label: string }> = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "unknown", label: "Not sure" },
];

interface AddPalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing an existing collection entry. */
  editing?: CollectionEntry | null;
  onSave: (entry: CollectionEntry) => void;
}

export function AddPalDialog({ open, onOpenChange, editing, onSave }: AddPalDialogProps) {
  const [query, setQuery] = useState("");
  const [palId, setPalId] = useState<number | null>(null);
  const [gender, setGender] = useState<Gender>("unknown");
  const [passiveIds, setPassiveIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setPalId(editing?.palId ?? null);
    setGender(editing?.gender ?? "unknown");
    setPassiveIds(editing?.passiveIds ?? []);
  }, [open, editing]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? PALS.filter(
          (p) => p.name.toLowerCase().includes(q) || String(p.palDexNo).startsWith(q),
        )
      : PALS;
    return list.slice(0, 200);
  }, [query]);

  const selected: Pal | undefined = useMemo(
    () => (palId === null ? undefined : PALS.find((p) => p.id === palId)),
    [palId],
  );

  const availablePassives = useMemo(
    () => (palId === null ? [] : passivesForPal(palId)),
    [palId],
  );

  const guaranteed = useMemo(
    () => new Set(palId === null ? [] : guaranteedPassiveIds(palId)),
    [palId],
  );


  const atCap = passiveIds.length >= MAX_PASSIVE_SLOTS;
  const ratioNote = selected ? genderRatioNote(selected.name, selected.maleRatio) : null;

  function togglePassive(id: string) {
    setPassiveIds((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : prev.length >= MAX_PASSIVE_SLOTS
          ? prev
          : [...prev, id],
    );
  }

  function handleSave() {
    if (palId === null) return;
    onSave({
      instanceId: editing?.instanceId ?? newInstanceId(),
      palId,
      gender,
      passiveIds,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Pal" : "Add a Pal"}</DialogTitle>
          <DialogDescription>
            Pick the species, set its gender, and tick the passives it already has.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="pal-search">Species</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="pal-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Pals by name or Paldeck number…"
                className="pl-9"
                autoComplete="off"
              />
            </div>
            <ScrollArea className="h-52 rounded-lg border">
              <ul className="p-1">
                {results.map((pal) => {
                  const isActive = pal.id === palId;
                  return (
                    <li key={pal.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setPalId(pal.id);
                          // Guaranteed passives are always on the Pal, so start them ticked.
                          setPassiveIds(guaranteedPassiveIds(pal.id).slice(0, MAX_PASSIVE_SLOTS));
                        }}

                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                          isActive
                            ? "bg-primary/15 text-foreground"
                            : "hover:bg-accent/60 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <span className="w-12 shrink-0 text-xs tabular-nums opacity-70">
                          #{pal.palDexNo}
                        </span>
                        <span className="flex-1 font-medium">{pal.name}</span>
                        {pal.isVariant ? (
                          <Badge variant="outline" className="text-[10px]">
                            variant
                          </Badge>
                        ) : null}
                        {isActive ? <Check className="size-4 text-primary" /> : null}
                      </button>
                    </li>
                  );
                })}
                {results.length === 0 ? (
                  <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No Pals match “{query}”.
                  </li>
                ) : null}
              </ul>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <Label>Gender</Label>
            <RadioGroup
              value={gender}
              onValueChange={(v) => setGender(v as Gender)}
              className="flex flex-wrap gap-4"
            >
              {GENDERS.map((g) => (
                <div key={g.value} className="flex items-center gap-2">
                  <RadioGroupItem value={g.value} id={`gender-${g.value}`} />
                  <Label htmlFor={`gender-${g.value}`} className="font-normal">
                    {g.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {ratioNote ? <p className="text-xs text-warning">{ratioNote}</p> : null}
          </div>

          {selected ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Label>Passives on this {selected.name}</Label>
                <span className="text-xs text-muted-foreground">
                  Pals have {MAX_PASSIVE_SLOTS} passive slots · {passiveIds.length}/
                  {MAX_PASSIVE_SLOTS} used
                </span>
              </div>
              <ScrollArea className="h-56 rounded-lg border">
                <div className="grid gap-1 p-2 sm:grid-cols-2">
                  {availablePassives.map((passive) => {
                    const checked = passiveIds.includes(passive.id);
                    return (
                      <label
                        key={passive.id}
                        className={cn(
                          "flex items-start gap-2 rounded-md px-2 py-1.5 text-sm",
                          !checked && atCap
                            ? "cursor-not-allowed opacity-40"
                            : "hover:bg-accent/50 cursor-pointer",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={!checked && atCap}
                          onCheckedChange={() => togglePassive(passive.id)}
                          className="mt-0.5"
                        />
                        <span className="leading-tight">
                          <span className="font-medium">{passive.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {passive.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={palId === null}>
            {editing ? "Save changes" : "Add to collection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
