import { useEffect, useMemo, useState } from "react";
import { Check, Hammer, Search, Footprints, Sparkles, Swords } from "lucide-react";

import { PALS } from "@/data/palworld";
import type { Pal, Passive } from "@/data/palworld";
import {
  MAX_PASSIVE_SLOTS,
  genderRatioNote,
  guaranteedPassiveIds,
  newInstanceId,
  passivesForPal,
  type CollectionEntry,
  type Gender,
} from "@/lib/collection";
import { categoryOfId, PASSIVE_CATEGORIES, type PassiveCategory } from "@/lib/passive-categories";
import { RANK_NO_MATCH, normaliseQuery, rankPassive, searchPals } from "@/lib/search-rank";
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
import { PalIcon } from "./pal-icon";

const GENDERS: Array<{ value: Gender; label: string }> = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "unknown", label: "Not sure" },
];

const TIERS = ["common", "rare", "epic", "legendary"] as const;
type Tier = (typeof TIERS)[number];

/** Matches the tier colours already used by PassiveChip. */
const TIER_CLASS: Record<Tier, string> = {
  common: "border-border/70 text-muted-foreground",
  rare: "border-info/50 text-info",
  epic: "border-primary/50 text-primary",
  legendary: "border-warning/60 text-warning",
};

const CATEGORY_ICON: Record<PassiveCategory, typeof Swords> = {
  Combat: Swords,
  Work: Hammer,
  Movement: Footprints,
  Other: Sparkles,
};

/**
 * A passive is a downside when its description carries a negative percentage
 * ("Work Speed -10%"). Read off the text rather than guessed, so anything
 * without a clear sign renders neutral.
 */
function effectSign(passive: Passive): "positive" | "negative" | "neutral" {
  if (/-\s*\d/.test(passive.description)) return "negative";
  if (/\+\s*\d/.test(passive.description)) return "positive";
  return "neutral";
}

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

  // Passive picker state — reset whenever the dialog opens or the species changes.
  const [passiveQuery, setPassiveQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<PassiveCategory | null>(null);
  const [tierFilter, setTierFilter] = useState<Tier | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setPalId(editing?.palId ?? null);
    setGender(editing?.gender ?? "unknown");
    setPassiveIds(editing?.passiveIds ?? []);
    setPassiveQuery("");
    setCategoryFilter(null);
    setTierFilter(null);
  }, [open, editing]);

  // Ranking lives in @/lib/search-rank (pure, unit-tested).
  const results = useMemo(
    () => searchPals(PALS, normaliseQuery(query), { limit: 200 }),
    [query],
  );

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

  /**
   * Search + chips compose: the chips narrow the pool, the query ranks what's
   * left. With no query the original order is preserved, which keeps the
   * guaranteed passives hoisted to the top where passivesForPal put them.
   */
  const visiblePassives = useMemo(() => {
    const q = normaliseQuery(passiveQuery);
    const pool = availablePassives.filter((p) => {
      if (categoryFilter && categoryOfId(p.id) !== categoryFilter) return false;
      if (tierFilter && p.tier !== tierFilter) return false;
      return true;
    });
    if (!q) return pool;
    return pool
      .map((p, i) => ({ p, r: rankPassive(p, q), i }))
      .filter((x) => x.r !== RANK_NO_MATCH)
      .sort((a, b) => a.r - b.r || a.i - b.i)
      .map((x) => x.p);
  }, [availablePassives, passiveQuery, categoryFilter, tierFilter]);

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
                          // A new species means a new passive pool — clear the filters.
                          setPassiveQuery("");
                          setCategoryFilter(null);
                          setTierFilter(null);
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
                        <PalIcon internalName={pal.internalName} name={pal.name} size={28} />
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
            <p className="text-xs text-muted-foreground">
              {query.trim()
                ? `${results.length} of ${PALS.length} Pals shown.`
                : `${PALS.length} Pals.`}
            </p>
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
                <Label htmlFor="passive-search">Passives on this {selected.name}</Label>
                <span className="text-xs text-muted-foreground">
                  Pals have {MAX_PASSIVE_SLOTS} passive slots · {passiveIds.length}/
                  {MAX_PASSIVE_SLOTS} used
                </span>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="passive-search"
                  value={passiveQuery}
                  onChange={(e) => setPassiveQuery(e.target.value)}
                  placeholder="Search passives by name or effect…"
                  className="pl-9"
                  autoComplete="off"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {PASSIVE_CATEGORIES.map((c) => {
                  const Icon = CATEGORY_ICON[c];
                  const active = categoryFilter === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategoryFilter(active ? null : c)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                        active
                          ? "border-primary/60 bg-primary/15 text-foreground"
                          : "border-border/70 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="size-3" />
                      {c}
                    </button>
                  );
                })}
                {TIERS.map((t) => {
                  const active = tierFilter === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTierFilter(active ? null : t)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs capitalize transition-colors",
                        TIER_CLASS[t],
                        active ? "bg-accent/60 text-foreground" : "hover:text-foreground",
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>

              <ScrollArea className="h-56 rounded-lg border">
                <div className="grid gap-1 p-2 sm:grid-cols-2">
                  {visiblePassives.map((passive) => {
                    const checked = passiveIds.includes(passive.id);
                    const Icon = CATEGORY_ICON[categoryOfId(passive.id)];
                    const sign = effectSign(passive);
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
                          <span className="flex flex-wrap items-center gap-1.5">
                            <Icon className="size-3 shrink-0 text-muted-foreground" />
                            <span className="font-medium">{passive.name}</span>
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] capitalize", TIER_CLASS[passive.tier])}
                            >
                              {passive.tier}
                            </Badge>
                            {guaranteed.has(passive.id) ? (
                              <Badge variant="outline" className="text-[10px]">
                                always has
                              </Badge>
                            ) : null}
                          </span>
                          <span
                            className={cn(
                              "block text-xs",
                              sign === "negative"
                                ? "text-destructive"
                                : sign === "positive"
                                  ? "text-success"
                                  : "text-muted-foreground",
                            )}
                          >
                            {passive.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                  {visiblePassives.length === 0 ? (
                    <p className="col-span-full px-3 py-6 text-center text-sm text-muted-foreground">
                      No passives match those filters.
                    </p>
                  ) : null}
                </div>
              </ScrollArea>

              <p className="text-xs text-muted-foreground">
                Showing {visiblePassives.length} of {availablePassives.length} passives. Any Pal
                can roll any passive, so the full list is always offered — the ones this species
                is guaranteed to have are ticked and sorted first.
              </p>
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
