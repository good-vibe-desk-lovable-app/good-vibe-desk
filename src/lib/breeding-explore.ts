// Pure offspring-space exploration. No React, no DOM.
//
// The pathfinder answers "how do I get X from what I own". This answers the
// question that comes first: given one Pal, what can it make, and what can
// those offspring go on to make.
//
// WHY GROUPED RATHER THAN A FLAT PAIR LIST
// One Pal against every partner is 300 pairs. Two generations is 300 x 300 =
// 90,000 — not renderable, and not useful if it were. Breeding power averages
// many partners onto the SAME child, so those 300 pairs collapse to far fewer
// distinct offspring. Grouping by child is what makes the space navigable.
//
// NO pairMaps IMPORT (inviolable constraint 1). resolveChild comes from the
// barrel and scans ~191 breeding-eligible Pals per call, so one expansion is
// roughly 300 x 191 ≈ 57,000 simple comparisons — low single-digit
// milliseconds, and none of the 44,851-pair table build.

import { PALS, palById, resolveChild, type Pal } from "@/data/palworld";
import type { BreedingVia } from "@/data/palworld/types";

export interface OffspringGroup {
  /** The Pal this group produces. */
  child: Pal;
  /** Every partner that, bred with the root, yields this child. */
  partners: Pal[];
  /** True when the root bred with itself produces this child. */
  selfPair: boolean;
  /**
   * How this pairing resolves. "unique" is a hand-authored override, "formula"
   * is the breeding-power midpoint, "same-species" is like-with-like. A group
   * can be reached more than one way, so this records the FIRST resolution
   * seen, which is the strongest: unique combos are checked before the formula.
   */
  via: BreedingVia;
}

/**
 * Every distinct offspring the given Pal can produce, with the partners that
 * produce each, ordered by partner count descending then by name.
 *
 * Ordering by partner count puts the offspring you are most likely to stumble
 * into first — a child reachable from 40 partners is far easier to breed than
 * one reachable from a single unique combo.
 *
 * Returns an empty array for an unknown id rather than throwing: this is fed
 * directly by user input and a bad id should render "nothing", not crash.
 */
export function offspringOf(rootId: number): OffspringGroup[] {
  if (!palById.has(rootId)) return [];

  const groups = new Map<number, OffspringGroup>();
  for (const partner of PALS) {
    const result = resolveChild(rootId, partner.id);
    if (!result) continue;
    const child = palById.get(result.childId);
    if (!child) continue;

    const existing = groups.get(child.id);
    if (existing) {
      existing.partners.push(partner);
      if (partner.id === rootId) existing.selfPair = true;
    } else {
      groups.set(child.id, {
        child,
        partners: [partner],
        selfPair: partner.id === rootId,
        via: result.via,
      });
    }
  }

  return Array.from(groups.values()).sort(
    (a, b) => b.partners.length - a.partners.length || a.child.name.localeCompare(b.child.name),
  );
}

/** Total resolvable pairings for a root — the sum of every group's partners. */
export function pairCount(groups: OffspringGroup[]): number {
  return groups.reduce((sum, g) => sum + g.partners.length, 0);
}

export interface ExploreNode {
  child: Pal;
  partners: Pal[];
  selfPair: boolean;
  via: BreedingVia;
  /**
   * What this offspring can go on to produce. Empty at the depth limit rather
   * than undefined, so consumers never branch on "is this loaded or barren".
   */
  children: ExploreNode[];
}

/**
 * Build an offspring tree `depth` generations deep.
 *
 * depth = 1 is the direct offspring of the root. depth = 2 additionally expands
 * what each of those can make. The parameter exists because the data structure
 * has to support depth even while the UI renders one or two levels — but it is
 * exponential, so callers are expected to keep it small.
 *
 * A `seen` set stops a lineage revisiting a species it already expanded on the
 * way down. Without it, same-species pairs (X + X = X) and reciprocal pairs
 * make the recursion loop forever. Note this prunes per-branch, not globally:
 * two different branches may each legitimately reach the same species.
 */
export function exploreTree(
  rootId: number,
  depth: number,
  seen: Set<number> = new Set(),
): ExploreNode[] {
  if (depth < 1) return [];
  if (seen.has(rootId)) return [];

  const nextSeen = new Set(seen);
  nextSeen.add(rootId);

  return offspringOf(rootId).map((group) => ({
    child: group.child,
    partners: group.partners,
    selfPair: group.selfPair,
    via: group.via,
    children: depth > 1 ? exploreTree(group.child.id, depth - 1, nextSeen) : [],
  }));
}
