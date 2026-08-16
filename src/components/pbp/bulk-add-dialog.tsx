import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { PALS, PASSIVES } from "@/data/palworld";
import {
  MAX_PASSIVE_SLOTS,
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
import { normaliseQuery, searchPals } from "@/lib/search-rank";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PalIcon } from "./pal-icon";

const passiveNameById = new Map(PASSIVES.map((p) => [p.id, p.name]));

/** Display name for a passive id, falling back to the raw id if unknown. */
function passiveNameOf(id: string): string {
  return passiveNameById.get(id) ?? id;
}

/**
 * Compact passive chooser for one species in the bulk list.
 *
 * Deliberately a popover rather than an inline list: 115 passives inline, on
 * every selected row, would bury the Pal list this dialog exists for. Ranked
 * with the shared search module so typing behaves the same as everywhere else.
 */
function PassivePicker({
  palId,
  chosen,
  onToggle,
}: {
  palId: number;
  chosen: string[];
  onToggle: (passiveId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const guaranteed = guaranteedPassiveIds(palId);
  const room = Math.max(0, MAX_PASSIVE_SLOTS - guaranteed.length);
  const full = chosen.length >= room;

  const options = useMemo(() => {
    const q = normaliseQuery(query);
    const all = passivesForPal(palId).filter((p) => !guaranteed.includes(p.id));
    if (!q) return all.slice(0, 60);
    return all
      .filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
      .slice(0, 60);
  }, [palId, query, guaranteed]);

  if (room === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-[11px]">
          + Add passive
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(20rem,92vw)] p-2" align="start">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search passives…"
          className="mb-2 h-8"
          autoComplete="off"
        />
        {full ? (
          <p className="mb-2 text-[11px] text-muted-foreground">
            All {MAX_PASSIVE_SLOTS} slots used. Remove one to add another.
          </p>
        ) : null}
        <ul className="max-h-56 space-y-0.5 overflow-y-auto">
          {options.map((p) => {
            const picked = chosen.includes(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={full && !picked}
                  onClick={() => onToggle(p.id)}
                  className={cn(
                    "w-full rounded px-2 py-1 text-left text-xs",
                    picked ? "bg-primary/15 font-medium" : "hover:bg-accent/60",
                    full && !picked ? "cursor-not-allowed opacity-40" : "",
                  )}
                >
                  {p.name}
                </button>
              </li>
            );
          })}
          {options.length === 0 ? (
            <li className="px-2 py-2 text-xs text-muted-foreground">No passive matches that.</li>
          ) : null}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

interface BulkAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once with every entry to append. */
  onAddMany: (entries: CollectionEntry[]) => void;
}

/**
 * Bulk species entry. Adding Pals one dialog at a time is the slowest part of
 * building a collection, so this lets the user tick many species at once and
 * fill in gender and passives afterwards by editing individual rows.
 *
 * Selecting the same species twice is meaningful — players own duplicates —
 * so selection is a counted list, not a set.
 */
export function BulkAddDialog({ open, onOpenChange, onAddMany }: BulkAddDialogProps) {
  const [query, setQuery] = useState("");
  const [counts, setCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCounts({});
  }, [open]);

  // Ranking lives in @/lib/search-rank (pure, unit-tested): prefix beats
  // substring beats dex number beats internal name, alphabetical within a band.
  const results = useMemo(() => searchPals(PALS, normaliseQuery(query), { limit: 300 }), [query]);

  const selectedIds = useMemo(
    () =>
      Object.keys(counts)
        .map(Number)
        .filter((id) => counts[id] > 0),
    [counts],
  );

  const totalSelected = useMemo(
    () => selectedIds.reduce((n, id) => n + counts[id], 0),
    [selectedIds, counts],
  );

  function bump(palId: number, delta: number) {
    setCounts((prev) => {
      const next = { ...prev };
      const value = (next[palId] ?? 0) + delta;
      if (value <= 0) delete next[palId];
      else next[palId] = value;
      return next;
    });
  }

  /**
   * Gender chosen per species, applied to every copy of it being added.
   *
   * Bulk add used to hardcode "unknown" with no way to change it, so a bulk
   * import produced a collection the search could never warn about: core.ts
   * only raises the same-gender warning when BOTH parents have a known gender
   * (see genderWarning, core.ts:312). Everything unknown means the warning can
   * never fire. It does not change which chains are found — gender is advisory,
   * not a constraint — but it is the difference between being told "these are
   * both male" and finding out at the breeding pen.
   */
  const [genders, setGenders] = useState<Record<number, Gender>>({});

  /**
   * Extra passives per species, on top of the guaranteed ones. Applied to every
   * copy. Bulk add previously assigned ONLY guaranteed passives, and most
   * species have none, so bulk-added Pals arrived with an empty passive list
   * and were invisible to the pathfinder — passives can only come from Pals in
   * the collection, so a Pal carrying none contributes nothing to a chain.
   */
  const [extraPassives, setExtraPassives] = useState<Record<number, string[]>>({});

  function toggleExtraPassive(palId: number, passiveId: string) {
    setExtraPassives((prev) => {
      const current = prev[palId] ?? [];
      const guaranteed = guaranteedPassiveIds(palId);
      const next = current.includes(passiveId)
        ? current.filter((id) => id !== passiveId)
        : [...current, passiveId];
      // MAX_PASSIVE_SLOTS is the in-game cap and the collection invariant;
      // guaranteed passives already occupy slots, so budget against both.
      const room = Math.max(0, MAX_PASSIVE_SLOTS - guaranteed.length);
      return { ...prev, [palId]: next.slice(0, room) };
    });
  }

  function handleAdd() {
    const entries: CollectionEntry[] = [];
    for (const palId of selectedIds) {
      const guaranteed = guaranteedPassiveIds(palId);
      const passiveIds = [...guaranteed, ...(extraPassives[palId] ?? [])].slice(
        0,
        MAX_PASSIVE_SLOTS,
      );
      for (let i = 0; i < counts[palId]; i++) {
        entries.push({
          instanceId: newInstanceId(),
          palId,
          gender: genders[palId] ?? "unknown",
          passiveIds,
        });
      }
    }
    if (entries.length > 0) onAddMany(entries);
    setGenders({});
    setExtraPassives({});
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add several Pals</DialogTitle>
          <DialogDescription>
            Tick every species you own — tap a row more than once if you own duplicates. Gender and
            passives can be filled in afterwards by editing each Pal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {selectedIds.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-border/70 bg-background/40 p-2">
              {selectedIds.map((id) => {
                const pal = PALS.find((p) => p.id === id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => bump(id, -counts[id])}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/50 bg-primary/15 px-2.5 py-1 text-xs"
                  >
                    {pal?.name ?? "Unknown"}
                    {counts[id] > 1 ? <span className="opacity-70">×{counts[id]}</span> : null}
                    <X className="size-3 opacity-70" />
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Pals by name or Paldeck number…"
              className="pl-9"
              autoComplete="off"
            />
          </div>

          <ScrollArea className="h-72 rounded-lg border">
            <ul className="p-1">
              {results.map((pal) => {
                const count = counts[pal.id] ?? 0;
                return (
                  <li key={pal.id}>
                    <div
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                        count > 0 ? "bg-primary/10" : "hover:bg-accent/60",
                      )}
                    >
                      <Checkbox
                        checked={count > 0}
                        onCheckedChange={() => bump(pal.id, count > 0 ? -count : 1)}
                        aria-label={`Select ${pal.name}`}
                      />
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
                      {count > 0 ? (
                        <span className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => bump(pal.id, -1)}
                            aria-label={`One fewer ${pal.name}`}
                          >
                            −
                          </Button>
                          <span className="w-4 text-center text-xs tabular-nums">{count}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => bump(pal.id, 1)}
                            aria-label={`One more ${pal.name}`}
                          >
                            +
                          </Button>
                        </span>
                      ) : null}
                    </div>

                    {count > 0 ? (
                      <div className="mb-1 ml-9 space-y-2 rounded-md bg-muted/30 p-2">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="mr-1 text-xs text-muted-foreground">Gender</span>
                          {(["female", "male", "unknown"] as const).map((g) => (
                            <Button
                              key={g}
                              type="button"
                              size="sm"
                              variant={(genders[pal.id] ?? "unknown") === g ? "default" : "outline"}
                              className="h-6 px-2 text-[11px] capitalize"
                              onClick={() => setGenders((prev) => ({ ...prev, [pal.id]: g }))}
                            >
                              {g}
                            </Button>
                          ))}
                          {count > 1 ? (
                            <span className="text-[11px] text-muted-foreground">
                              applies to all {count}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-1">
                          <span className="mr-1 text-xs text-muted-foreground">Passives</span>
                          {guaranteedPassiveIds(pal.id).map((id) => (
                            <Badge key={id} variant="secondary" className="text-[10px]">
                              {passiveNameOf(id)}
                            </Badge>
                          ))}
                          {(extraPassives[pal.id] ?? []).map((id) => (
                            <Button
                              key={id}
                              type="button"
                              size="sm"
                              variant="default"
                              className="h-6 px-2 text-[11px]"
                              onClick={() => toggleExtraPassive(pal.id, id)}
                            >
                              {passiveNameOf(id)} ×
                            </Button>
                          ))}
                          <PassivePicker
                            palId={pal.id}
                            chosen={extraPassives[pal.id] ?? []}
                            onToggle={(id) => toggleExtraPassive(pal.id, id)}
                          />
                        </div>
                      </div>
                    ) : null}
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

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={totalSelected === 0}>
            {totalSelected === 0
              ? "Add to collection"
              : `Add ${totalSelected} ${totalSelected === 1 ? "Pal" : "Pals"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Also export a named alias so either import style works. */
export default BulkAddDialog;
