import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { palById, type Pal } from "@/data/palworld";
import { normaliseQuery } from "@/lib/search-rank";
import {
  isUnresolvedCircularSelfPair,
  unresolvedCircularBreedingMessage,
} from "@/lib/unresolved-circular-breeding";

import { PalIcon } from "./pal-icon";

/**
 * pairMaps builds 44,851-pair tables at module init (~160ms desktop, several
 * hundred ms on mobile). Inviolable constraint 1: it is NEVER statically
 * imported outside data-check.tsx. One lazy promise, shared across mounts, so
 * flipping targets does not rebuild the tables.
 */
let pairMapsPromise: Promise<typeof import("@/data/palworld/pairMaps")> | null = null;
function loadPairMaps() {
  pairMapsPromise ??= import("@/data/palworld/pairMaps");
  return pairMapsPromise;
}

export interface TargetParentsPanelProps {
  target: Pal | null;
  /** Pal ids already in the collection, so pairs you can act on float to the top. */
  ownedIds: Set<number>;
}

/**
 * "Every way to breed X."
 *
 * The pathfinder answers "how do I get X from what I own". This answers the
 * question that comes first: what makes X *at all*. Without it, picking a
 * target you cannot yet reach shows only "cheapest targets for your
 * collection" — a list of other Pals, which is not what was asked.
 *
 * The same data was already reachable through Breeding lookup → "What makes
 * this Pal?", but that panel sits collapsed at the bottom of the page and asks
 * you to select the target a second time. This is the same lookup, attached to
 * the target already chosen.
 */
export function TargetParentsPanel({ target, ownedIds }: TargetParentsPanelProps) {
  const [pairs, setPairs] = useState<Array<[number, number]> | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!target) {
      setPairs(null);
      return;
    }
    // Same discipline as constraint 4: a slow dynamic import must not write
    // results for a target the user has since moved off.
    let cancelled = false;
    setPairs(null);
    loadPairMaps()
      .then(({ childToParents }) => {
        if (cancelled) return;
        setPairs(childToParents.get(target.id) ?? []);
      })
      .catch(() => {
        if (!cancelled) setPairs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [target]);

  const actionablePairs = useMemo(() => {
    if (!pairs || !target) return null;
    return pairs.filter(
      ([parent1Id, parent2Id]) => !isUnresolvedCircularSelfPair(target, parent1Id, parent2Id),
    );
  }, [pairs, target]);

  const rows = useMemo(() => {
    if (!actionablePairs) return [];
    const q = normaliseQuery(query);
    const scored = actionablePairs.map(([p1, p2]) => {
      const a = palById.get(p1);
      const b = palById.get(p2);
      // Pairs you can breed right now are the useful ones; a pair where you own
      // one half is the next most useful. Ordering by that beats alphabetical.
      const owned = (ownedIds.has(p1) ? 1 : 0) + (ownedIds.has(p2) ? 1 : 0);
      return { p1, p2, a, b, owned };
    });
    const filtered = q
      ? scored.filter(
          (r) =>
            (r.a?.name.toLowerCase().includes(q) ?? false) ||
            (r.b?.name.toLowerCase().includes(q) ?? false),
        )
      : scored;
    return filtered.sort(
      (x, y) =>
        y.owned - x.owned || (x.a?.name ?? "").localeCompare(y.a?.name ?? "") || x.p2 - y.p2,
    );
  }, [actionablePairs, query, ownedIds]);

  if (!target) return null;

  const onlyCircularPairs =
    pairs !== null && pairs.length > 0 && actionablePairs !== null && actionablePairs.length === 0;
  const readyCount = rows.filter((r) => r.owned === 2).length;

  return (
    <section className="rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="mb-1 flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-base font-semibold">Every way to breed {target.name}</h2>
      </div>

      {pairs === null ? (
        <p className="text-sm text-muted-foreground">Loading pair tables…</p>
      ) : onlyCircularPairs ? (
        <p className="text-sm text-muted-foreground">{unresolvedCircularBreedingMessage(target)}</p>
      ) : pairs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No pair produces {target.name}. It has to be caught or obtained another way — check the
          acquisition details above.
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            {actionablePairs!.length}{" "}
            {actionablePairs!.length === 1 ? "pair produces" : "pairs produce"} {target.name}
            {readyCount > 0
              ? ` · you can breed ${readyCount} of them right now`
              : " · none of them from Pals you own yet"}
          </p>

          {pairs.length > 8 ? (
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by parent name…"
                className="pl-8"
              />
            </div>
          ) : null}

          <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
            {rows.map(({ p1, p2, a, b, owned }) => (
              <li
                key={`${p1}:${p2}`}
                className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm ${
                  owned === 2 ? "bg-primary/10" : "hover:bg-accent/50"
                }`}
              >
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  {a ? <PalIcon internalName={a.internalName} name={a.name} size={24} /> : null}
                  <span className="truncate">{a?.name ?? `#${p1}`}</span>
                  <span className="shrink-0 text-muted-foreground">+</span>
                  {b ? <PalIcon internalName={b.internalName} name={b.name} size={24} /> : null}
                  <span className="truncate">{b?.name ?? `#${p2}`}</span>
                </span>
                {owned === 2 ? (
                  <Badge className="shrink-0 text-[10px]">You own both</Badge>
                ) : owned === 1 ? (
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    Own one
                  </Badge>
                ) : p1 === p2 ? (
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    Same species
                  </Badge>
                ) : null}
              </li>
            ))}
            {rows.length === 0 ? (
              <li className="px-2 py-3 text-sm text-muted-foreground">No parent matches that.</li>
            ) : null}
          </ul>
        </>
      )}
    </section>
  );
}
