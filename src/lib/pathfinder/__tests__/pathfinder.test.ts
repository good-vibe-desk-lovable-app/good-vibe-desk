import { describe, expect, it } from "vitest";

import { createResolver, search, type ResolverPal, type SearchDeps } from "../core";
import type { CollectionEntry } from "../types";

function pal(id: number, combiRank: number, extra: Partial<ResolverPal> = {}): ResolverPal {
  return {
    id,
    name: `P${id}`,
    combiRank,
    breedingPowerPriority: 0,
    indexOrder: id,
    breedingEligible: true,
    isVariant: false,
    ...extra,
  };
}

function entry(
  instanceId: string,
  palId: number,
  gender: CollectionEntry["gender"] = "unknown",
): CollectionEntry {
  return { instanceId, palId, gender, passiveIds: ["p"] };
}

function makeDeps(
  pals: ResolverPal[],
  combos: Parameters<typeof createResolver>[1] = [],
  locked: number[] = [],
): SearchDeps {
  const names = new Map(pals.map((p) => [p.id, p.name!]));
  return {
    resolve: createResolver(pals, combos),
    sameSpeciesOnly: new Set(locked),
    nameOf: (id) => names.get(id) ?? `Pal #${id}`,
  };
}

describe("pathfinder", () => {
  it("(a) returns ok with no steps when the target already carries everything", () => {
    const deps = makeDeps([pal(1, 100), pal(2, 200)]);
    const collection = [entry("i1", 1)];
    const res = search(deps, 1, collection, ["i1"]);
    expect(res.status).toBe("ok");
    expect(res.steps).toHaveLength(0);
    expect(res.coveredSources).toEqual(["i1"]);
  });

  it("(b) finds a one-step chain when a pair yields the target", () => {
    const pals = [pal(1, 100), pal(2, 300), pal(3, 200)];
    const deps = makeDeps(pals);
    const collection = [entry("i1", 1), entry("i2", 2)];
    const res = search(deps, 3, collection, ["i1", "i2"]);
    expect(res.status).toBe("ok");
    expect(res.steps).toHaveLength(1);
    expect(res.steps[0].child).toBe(3);
    expect(res.steps[0].via).toBe("formula");
    expect(res.steps[0].carriedSources.sort()).toEqual(["i1", "i2"]);
  });

  it("(c) merges three sources onto the target", () => {
    // Unique combos keep the fixture fully deterministic.
    const pals = [pal(1, 10), pal(2, 20), pal(3, 30), pal(9, 999, { breedingEligible: false })];
    const combos = [
      { parent1Id: 1, parent2Id: 2, childId: 3 },
      { parent1Id: 3, parent2Id: 3, childId: 9 },
    ];
    const deps = makeDeps(pals, combos);
    const collection = [entry("i1", 1), entry("i2", 2), entry("i3", 3)];
    const res = search(deps, 9, collection, ["i1", "i2", "i3"]);
    expect(res.status).toBe("ok");
    expect(res.coveredSources.sort()).toEqual(["i1", "i2", "i3"]);
    expect(res.steps.length).toBeGreaterThanOrEqual(2);
  });

  it("(d) reports impossible for a same-species-locked target that is absent", () => {
    const deps = makeDeps([pal(1, 100), pal(7, 700)], [], [7]);
    const res = search(deps, 7, [entry("i1", 1)], ["i1"]);
    expect(res.status).toBe("impossible");
    expect(res.warnings[0]).toBe(
      "P7 can only be produced by breeding two P7s — none in your collection.",
    );
  });

  it("(e) returns partial when maxDepth is too tight", () => {
    const pals = [pal(1, 10), pal(2, 20), pal(3, 30), pal(9, 999, { breedingEligible: false })];
    const combos = [
      { parent1Id: 1, parent2Id: 2, childId: 3 },
      { parent1Id: 3, parent2Id: 3, childId: 9 },
    ];
    const deps = makeDeps(pals, combos);
    const collection = [entry("i1", 1), entry("i2", 2), entry("i3", 3), entry("i4", 3)];
    const res = search(deps, 9, collection, ["i1", "i2", "i3", "i4"], { maxDepth: 1 });
    expect(res.status).toBe("partial");
    expect(res.coveredSources.length).toBeGreaterThan(0);
    expect(res.missingSources.length).toBeGreaterThan(0);
  });

  it("(f) applies the rank formula and its tie-breaks", () => {
    // floor((570 + 1460 + 1) / 2) = 1015 -> 1010 is the closer candidate.
    const resolveA = createResolver([pal(1, 570), pal(2, 1460), pal(3, 1010), pal(4, 1030)]);
    expect(resolveA(1, 2)).toEqual({ childId: 3, via: "formula" });

    // Equidistant candidates (1010 and 1020 around 1015) -> lower indexOrder wins.
    const resolveB = createResolver([
      pal(1, 570),
      pal(2, 1460),
      pal(5, 1020, { indexOrder: 5 }),
      pal(6, 1010, { indexOrder: 6 }),
    ]);
    expect(resolveB(1, 2)).toEqual({ childId: 5, via: "formula" });
  });
});
