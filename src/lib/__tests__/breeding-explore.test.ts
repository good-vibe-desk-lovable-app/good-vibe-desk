import { describe, expect, it } from "vitest";

import { exploreTree, offspringOf, pairCount } from "../breeding-explore";
import { PALS, palById, resolveChild } from "../../data/palworld";
import { UNIQUE_COMBOS } from "../../data/palworld/uniqueCombos";

// Real ids, read out of the dataset rather than invented, so a regeneration
// that renumbers anything fails these loudly instead of quietly passing.
const LIFMUNK = 13;
const CHIKIPI = 74;
const VANWYRM = 72;
const NYAFIA = 1;
/** breedingEligible: false — excluded from breeding targets. */
const ASTRALYM = 309;

describe("offspringOf — grouping", () => {
  it("groups every resolvable partner under the child it produces", () => {
    const groups = offspringOf(LIFMUNK);
    expect(groups.length).toBeGreaterThan(0);

    // Every partner listed must genuinely resolve to the group's child.
    for (const group of groups) {
      for (const partner of group.partners) {
        const result = resolveChild(LIFMUNK, partner.id);
        expect(result).not.toBeNull();
        expect(result!.childId).toBe(group.child.id);
      }
    }
  });

  it("counts every resolvable pairing exactly once", () => {
    // The grouping must partition the pair space: no partner dropped, none
    // double-counted across two groups.
    const groups = offspringOf(LIFMUNK);
    const expected = PALS.filter((p) => resolveChild(LIFMUNK, p.id) !== null).length;
    expect(pairCount(groups)).toBe(expected);

    const seen = new Set<number>();
    for (const group of groups) {
      for (const partner of group.partners) {
        expect(seen.has(partner.id)).toBe(false);
        seen.add(partner.id);
      }
    }
    expect(seen.size).toBe(expected);
  });

  it("produces one group per distinct child", () => {
    const groups = offspringOf(CHIKIPI);
    const childIds = groups.map((g) => g.child.id);
    expect(new Set(childIds).size).toBe(childIds.length);
  });

  it("orders by partner count descending, then by name", () => {
    const groups = offspringOf(CHIKIPI);
    for (let i = 1; i < groups.length; i++) {
      const prev = groups[i - 1];
      const cur = groups[i];
      if (prev.partners.length === cur.partners.length) {
        expect(prev.child.name.localeCompare(cur.child.name)).toBeLessThanOrEqual(0);
      } else {
        expect(prev.partners.length).toBeGreaterThan(cur.partners.length);
      }
    }
  });
});

describe("offspringOf — same-species pairing", () => {
  it("marks the self pairing and resolves it to the same species", () => {
    // X + X = X is the documented same-species rule. The group carrying the
    // root itself as a partner must be the root's own species.
    const groups = offspringOf(VANWYRM);
    const selfGroups = groups.filter((g) => g.selfPair);
    expect(selfGroups).toHaveLength(1);
    expect(selfGroups[0].child.id).toBe(VANWYRM);

    const direct = resolveChild(VANWYRM, VANWYRM);
    expect(direct?.via).toBe("same-species");
    expect(direct?.childId).toBe(VANWYRM);
  });

  it("includes the root as one of its own partners exactly once", () => {
    const groups = offspringOf(VANWYRM);
    const appearances = groups.flatMap((g) => g.partners).filter((p) => p.id === VANWYRM);
    expect(appearances).toHaveLength(1);
  });
});

describe("offspringOf — unique combo overrides", () => {
  it("groups a hand-authored override under its declared child", () => {
    // Nyafia + Vanwyrm -> Shroomer Noct is a unique combo: it deliberately
    // ignores the breeding-power formula. Grouping must follow the override,
    // not the formula result.
    const combo = UNIQUE_COMBOS.find(
      (c) =>
        (c.parent1Id === NYAFIA && c.parent2Id === VANWYRM) ||
        (c.parent1Id === VANWYRM && c.parent2Id === NYAFIA),
    );
    expect(combo).toBeDefined();

    const groups = offspringOf(NYAFIA);
    const group = groups.find((g) => g.partners.some((p) => p.id === VANWYRM));
    expect(group?.child.id).toBe(combo!.childId);
  });

  it("agrees with resolveChild on every unique combo involving the root", () => {
    const groups = offspringOf(NYAFIA);
    const childOfPartner = new Map<number, number>();
    for (const group of groups) {
      for (const partner of group.partners) childOfPartner.set(partner.id, group.child.id);
    }
    for (const combo of UNIQUE_COMBOS) {
      const other =
        combo.parent1Id === NYAFIA
          ? combo.parent2Id
          : combo.parent2Id === NYAFIA
            ? combo.parent1Id
            : null;
      if (other === null) continue;
      if (!childOfPartner.has(other)) continue;
      expect(childOfPartner.get(other)).toBe(resolveChild(NYAFIA, other)!.childId);
    }
  });
});

describe("offspringOf — ineligible Pals", () => {
  it("only ever produces an ineligible Pal via a unique combo or self-pairing", () => {
    // I originally asserted that NO ineligible Pal can be offspring. The data
    // disproved it: Kelpsea Ignis, Shroomer Noct, Vanwyrm Cryst, Wumpo Botan
    // and Kitsun Noct all appear as children despite breedingEligible: false.
    //
    // The reason is that breedingEligible constrains only the FORMULA's target
    // search (resolveChild filters eligiblePals when picking the closest
    // combi-rank match). Unique combos are hand-authored overrides checked
    // BEFORE the formula, so they bypass the filter entirely. This test pins
    // that real rule down rather than the rule I assumed.
    for (const rootId of [LIFMUNK, CHIKIPI, VANWYRM, NYAFIA]) {
      for (const group of offspringOf(rootId)) {
        if (group.child.breedingEligible) continue;
        const viaOverride = group.via === "unique" || group.via === "same-species";
        expect(viaOverride).toBe(true);
      }
    }
  });

  it("never picks an ineligible Pal as a FORMULA result", () => {
    // The other half of the same rule, stated positively: whenever the formula
    // does the choosing, the child must be eligible.
    for (const rootId of [LIFMUNK, CHIKIPI, VANWYRM, NYAFIA]) {
      for (const group of offspringOf(rootId)) {
        if (group.via !== "formula") continue;
        expect(group.child.breedingEligible).toBe(true);
      }
    }
  });

  it("still lets an ineligible Pal act as a PARENT", () => {
    // breedingEligible governs being produced, not producing. Astralym pairs
    // normally; it simply never comes out of an egg.
    const astralym = palById.get(ASTRALYM);
    expect(astralym?.breedingEligible).toBe(false);

    const groups = offspringOf(LIFMUNK);
    const asPartner = groups.flatMap((g) => g.partners).some((p) => p.id === ASTRALYM);
    expect(asPartner).toBe(true);
  });

  it("returns its own species for an ineligible root's self pairing", () => {
    const groups = offspringOf(ASTRALYM);
    const self = groups.find((g) => g.selfPair);
    expect(self?.child.id).toBe(ASTRALYM);
  });
});

describe("offspringOf — bad input", () => {
  it("returns an empty array for an unknown id rather than throwing", () => {
    // Fed straight from user input; a bad id must render "nothing", not crash.
    expect(offspringOf(999999)).toEqual([]);
    expect(offspringOf(-1)).toEqual([]);
  });
});

describe("exploreTree", () => {
  it("depth 1 matches offspringOf and expands nothing further", () => {
    const tree = exploreTree(LIFMUNK, 1);
    const flat = offspringOf(LIFMUNK);
    expect(tree.map((n) => n.child.id)).toEqual(flat.map((g) => g.child.id));
    expect(tree.every((n) => n.children.length === 0)).toBe(true);
  });

  it("depth 2 expands each offspring one generation further", () => {
    const tree = exploreTree(VANWYRM, 2);
    expect(tree.length).toBeGreaterThan(0);
    // At least one branch must expand; a tree where nothing does would mean
    // the recursion silently pruned everything.
    expect(tree.some((n) => n.children.length > 0)).toBe(true);
  });

  it("does not revisit a species already expanded on the same branch", () => {
    // X + X = X and reciprocal pairs make this recurse forever without the
    // seen-set. Walking any branch must never repeat a species.
    const tree = exploreTree(VANWYRM, 3);
    const walk = (nodes: typeof tree, ancestors: number[]) => {
      for (const node of nodes) {
        expect(ancestors).not.toContain(node.child.id);
        walk(node.children, [...ancestors, node.child.id]);
      }
    };
    walk(tree, [VANWYRM]);
  });

  it("returns nothing at depth 0 or below", () => {
    expect(exploreTree(LIFMUNK, 0)).toEqual([]);
    expect(exploreTree(LIFMUNK, -3)).toEqual([]);
  });
});
