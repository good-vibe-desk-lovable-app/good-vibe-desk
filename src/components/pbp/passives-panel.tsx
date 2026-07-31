import { palById } from "@/data/palworld";
import { MAX_PASSIVE_SLOTS, type CollectionEntry } from "@/lib/collection";
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
                    {entry.passiveIds.map((passiveId) => {
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
