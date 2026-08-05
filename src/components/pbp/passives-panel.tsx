import { useMemo, useState } from "react";

import { palById } from "@/data/palworld";
import { MAX_PASSIVE_SLOTS, getPassive, type CollectionEntry } from "@/lib/collection";
import { PASSIVE_CATEGORIES, categoryOfId } from "@/lib/passive-categories";
import { cn } from "@/lib/utils";
import { PassiveChip } from "./passive-chip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export function selectionKey(instanceId: string, passiveId: string) {
  return `${instanceId}:${passiveId}`;
}

interface PassivesPanelProps {
  entries: CollectionEntry[];
  selections: Set<string>;
  onChange: (next: Set<string>) => void;
}

export function PassivesPanel({ entries, selections, onChange }: PassivesPanelProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [tiers, setTiers] = useState<string[]>([]);

  /** Which of my Pals carry each passive — shown inline under the chip. */
  const carriers = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const e of entries) {
      for (const p of e.passiveIds) {
        const name = palById.get(e.palId)?.name ?? "Unknown";
        map.set(p, [...(map.get(p) ?? []), name]);
      }
    }
    return map;
  }, [entries]);

  const passiveVisible = (passiveId: string) => {
    if (categories.length && !categories.includes(categoryOfId(passiveId))) return false;
    if (tiers.length) {
      const tier = getPassive(passiveId)?.tier;
      if (!tier || !tiers.includes(tier)) return false;
    }
    return true;
  };

  const allKeys = entries.flatMap((e) => e.passiveIds.map((p) => selectionKey(e.instanceId, p)));
  const selectedCount = selections.size;
  const palCount = new Set(
    Array.from(selections).map((key) => key.slice(0, key.lastIndexOf(":"))),
  ).size;

  function toggle(key: string) {
    const next = new Set(selections);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  }

  function setMany(keys: string[], on: boolean) {
    const next = new Set(selections);
    for (const key of keys) {
      if (on) next.add(key);
      else next.delete(key);
    }
    onChange(next);
  }

  const anyPassives = allKeys.length > 0;

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">Select Passives</CardTitle>
          {anyPassives ? (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setMany(allKeys, true)}>
                Select all
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setMany(allKeys, false)}>
                Clear
              </Button>
            </div>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedCount} {selectedCount === 1 ? "passive" : "passives"} from {palCount}{" "}
          {palCount === 1 ? "Pal" : "Pals"} selected
        </p>
        {selectedCount > MAX_PASSIVE_SLOTS ? (
          <p className="text-xs text-warning">
            A Pal can hold at most {MAX_PASSIVE_SLOTS} passives — chains carrying more than{" "}
            {MAX_PASSIVE_SLOTS} will be flagged.
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {PASSIVE_CATEGORIES.map((c) => (
            <FilterChip
              key={c}
              on={categories.includes(c)}
              onClick={() =>
                setCategories((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))
              }
            >
              {c}
            </FilterChip>
          ))}
          {(["common", "rare", "epic", "legendary"] as const).map((t) => (
            <FilterChip
              key={t}
              on={tiers.includes(t)}
              onClick={() => setTiers((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))}
            >
              {t}
            </FilterChip>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Only passives your Pals already carry are listed — categories come from each passive's own
          description, and anything ambiguous sits in Other rather than being guessed.
        </p>

        {!anyPassives ? (
          <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
            None of your Pals have passives recorded yet. Edit a Pal to add the ones it carries.
          </p>
        ) : (
          entries
            .filter((entry) => entry.passiveIds.length > 0)
            .map((entry) => {
              const pal = palById.get(entry.palId);
              const keys = entry.passiveIds.map((p) => selectionKey(entry.instanceId, p));
              const allOn = keys.every((k) => selections.has(k));
              return (
                <div
                  key={entry.instanceId}
                  className="rounded-xl border border-border/70 bg-background/40 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-semibold">{pal?.name ?? "Unknown Pal"}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {entry.instanceId.slice(0, 8)}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setMany(keys, !allOn)}>
                      {allOn ? "None" : "All"}
                    </Button>
                  </div>
                  <div className="mt-2 space-y-1">
                    {entry.passiveIds.filter(passiveVisible).map((passiveId) => {
                      const key = selectionKey(entry.instanceId, passiveId);
                      return (
                        <label
                          key={key}
                          className="hover:bg-accent/50 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                        >
                          <Checkbox
                            checked={selections.has(key)}
                            onCheckedChange={() => toggle(key)}
                          />
                          <PassiveChip passiveId={passiveId} carried={selections.has(key)} />
                          <span className="ml-auto text-[10px] text-muted-foreground">
                            {categoryOfId(passiveId)} ·{" "}
                            {Array.from(new Set(carriers.get(passiveId) ?? [])).join(", ")}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })
        )}
      </CardContent>
    </Card>
  );
}

function FilterChip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "rounded-full border px-2 py-1 text-[11px] capitalize transition-colors",
        on
          ? "border-primary bg-primary/15 text-foreground"
          : "border-border/70 text-muted-foreground hover:bg-accent/60",
      )}
    >
      {children}
    </button>
  );
}
