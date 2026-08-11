import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { PALS } from "@/data/palworld";
import type { Pal } from "@/data/palworld";
import {
  MAX_PASSIVE_SLOTS,
  guaranteedPassiveIds,
  newInstanceId,
  type CollectionEntry,
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
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Rank rather than merely filter. A name that STARTS with the query is what
 * the user meant; a dex-number or internal-name hit is a fallback. -1 means
 * no match at all.
 */
function rankPal(pal: Pal, q: string): number {
  if (!q) return 0;
  const name = pal.name.toLowerCase();
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  if (name.includes(q)) return 2;
  if (String(pal.palDexNo).startsWith(q)) return 3;
  if (pal.internalName.toLowerCase().includes(q)) return 4;
  return -1;
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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PALS.slice(0, 300);
    return PALS.map((p) => ({ p, r: rankPal(p, q) }))
      .filter((x) => x.r >= 0)
      .sort((a, b) => a.r - b.r || a.p.name.localeCompare(b.p.name))
      .slice(0, 300)
      .map((x) => x.p);
  }, [query]);

  const selectedIds = useMemo(
    () => Object.keys(counts).map(Number).filter((id) => counts[id] > 0),
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

  function handleAdd() {
    const entries: CollectionEntry[] = [];
    for (const palId of selectedIds) {
      for (let i = 0; i < counts[palId]; i++) {
        entries.push({
          instanceId: newInstanceId(),
          palId,
          gender: "unknown",
          // Guaranteed passives are always on the Pal, so start them ticked.
          passiveIds: guaranteedPassiveIds(palId).slice(0, MAX_PASSIVE_SLOTS),
        });
      }
    }
    if (entries.length > 0) onAddMany(entries);
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
