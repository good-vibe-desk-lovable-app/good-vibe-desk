import { useMemo, useState } from "react";
import { CornerDownRight, Network, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { palById } from "@/data/palworld";
import { normaliseQuery } from "@/lib/search-rank";
import {
  needsExistingStockForBreeding,
  unresolvedCircularBreedingMessage,
} from "@/lib/unresolved-circular-breeding";
import { offspringOf, pairCount } from "@/lib/breeding-explore";
import { cn } from "@/lib/utils";

import { PalCombo } from "./pal-combo";
import { PalIcon } from "./pal-icon";

export function BreedingExplorer() {
  /** Lineage walked so far. The last entry is the current root. */
  const [trail, setTrail] = useState<number[]>([]);
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const rootId = trail.length > 0 ? trail[trail.length - 1] : null;
  const root = rootId === null ? null : (palById.get(rootId) ?? null);

  const groups = useMemo(() => (rootId === null ? [] : offspringOf(rootId)), [rootId]);

  const visible = useMemo(() => {
    const q = normaliseQuery(filter);
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.child.name.toLowerCase().includes(q) ||
        g.partners.some((p) => p.name.toLowerCase().includes(q)),
    );
  }, [groups, filter]);

  function selectRoot(id: number) {
    setTrail([id]);
    setFilter("");
    setExpanded(null);
  }

  function drillInto(id: number) {
    setTrail((prev) => [...prev, id]);
    setFilter("");
    setExpanded(null);
  }

  function jumpTo(index: number) {
    setTrail((prev) => prev.slice(0, index + 1));
    setFilter("");
    setExpanded(null);
  }

  const totalPairs = pairCount(groups);
  const rootNeedsExistingStock = root !== null && needsExistingStockForBreeding(root);

  return (
    <section className="rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="mb-1 flex items-center gap-2">
        <Network className="size-4 text-primary" />
        <h2 className="text-base font-semibold">Breeding explorer</h2>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Pick any Pal to see everything it can produce. Tap an offspring to make it the new parent
        and keep walking down the line.
      </p>

      <PalCombo value={rootId} onChange={selectRoot} label="Pick a Pal to explore" />

      {root ? (
        <>
          {trail.length > 1 ? (
            <div className="mt-3 flex flex-wrap items-center gap-1 text-xs">
              {trail.map((id, i) => {
                const p = palById.get(id);
                const last = i === trail.length - 1;
                return (
                  <span key={`${id}:${i}`} className="flex items-center gap-1">
                    {i > 0 ? <CornerDownRight className="size-3 opacity-50" /> : null}
                    <button
                      type="button"
                      onClick={() => jumpTo(i)}
                      disabled={last}
                      className={cn(
                        "rounded px-1.5 py-0.5",
                        last
                          ? "bg-primary/15 font-medium text-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                      )}
                    >
                      {p?.name ?? `#${id}`}
                    </button>
                  </span>
                );
              })}
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-2">
            <PalIcon internalName={root.internalName} name={root.name} size={34} />
            <div className="min-w-0">
              <div className="truncate font-semibold">{root.name}</div>
              <div className="text-xs text-muted-foreground">
                {rootNeedsExistingStock
                  ? "No resolved acquisition channel to seed a breeding line"
                  : `${groups.length} different offspring from ${totalPairs} partners`}
              </div>
            </div>
          </div>

          {rootNeedsExistingStock ? (
            <p className="mt-3 rounded-lg border border-dashed border-border/70 px-4 py-4 text-sm text-muted-foreground">
              {unresolvedCircularBreedingMessage(root)} The explorer cannot start a breeding line
              from an unseeded Pal.
            </p>
          ) : (
            <>
              {groups.length > 6 ? (
                <div className="relative mt-3">
                  <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filter by offspring or partner…"
                    className="pl-8"
                  />
                </div>
              ) : null}

              {/* Offspring branch off the parent card above — the vertical rule is
              the trunk, each row a branch, mirroring the chain diagram. */}
              <ul className="mt-2 space-y-1 border-l-2 border-border/60 pl-3">
                {visible.map((group) => {
                  const isOpen = expanded === group.child.id;
                  return (
                    <li key={group.child.id} className="rounded-md">
                      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/40">
                        <PalIcon
                          internalName={group.child.internalName}
                          name={group.child.name}
                          size={28}
                        />
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : group.child.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="truncate font-medium">{group.child.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {group.partners.length}{" "}
                            {group.partners.length === 1 ? "partner" : "partners"}
                          </span>
                        </button>
                        {group.selfPair ? (
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            Self
                          </Badge>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0 px-2 text-xs"
                          onClick={() => drillInto(group.child.id)}
                        >
                          Explore
                        </Button>
                      </div>

                      {isOpen ? (
                        <div className="mb-1 ml-9 flex flex-wrap gap-1">
                          {group.partners.map((partner) => (
                            <span
                              key={partner.id}
                              className="flex items-center gap-1 rounded-full bg-muted/60 py-0.5 pl-1 pr-2 text-xs"
                            >
                              <PalIcon
                                internalName={partner.internalName}
                                name={partner.name}
                                size={18}
                              />
                              {partner.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
                {visible.length === 0 ? (
                  <li className="px-2 py-3 text-sm text-muted-foreground">
                    {groups.length === 0
                      ? `${root.name} cannot be bred with anything — it produces no offspring.`
                      : "Nothing matches that filter."}
                  </li>
                ) : null}
              </ul>
            </>
          )}
        </>
      ) : null}
    </section>
  );
}
