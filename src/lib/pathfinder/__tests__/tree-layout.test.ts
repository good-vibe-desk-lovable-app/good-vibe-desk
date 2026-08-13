import { describe, expect, it } from "vitest";

import { formulaTarget, layoutTree } from "../tree-layout";
import type { Step } from "../types";

function step(index: number, parent1: number, parent2: number, child: number): Step {
  return {
    index,
    parent1,
    parent2,
    child,
    via: "formula",
    carriedSources: [],
    expectedAttempts: 1,
  };
}

describe("layoutTree", () => {
  it("returns a single leaf when there are no steps", () => {
    const l = layoutTree([], 7);
    expect(l.nodes).toHaveLength(1);
    expect(l.nodes[0].kind).toBe("root");
    expect(l.rootId).toBe("leaf:7");
  });

  it("wires parents to children and marks the last child as the root", () => {
    const steps = [step(1, 1, 2, 3), step(2, 3, 4, 5)];
    const l = layoutTree(steps, 5);
    expect(l.nodes.map((n) => n.id).sort()).toEqual(
      ["leaf:1", "leaf:2", "leaf:4", "step:1", "step:2"].sort(),
    );
    expect(l.rootId).toBe("step:2");
    expect(l.nodes.find((n) => n.id === "step:2")!.kind).toBe("root");
    expect(l.nodes.find((n) => n.id === "leaf:1")!.depth).toBe(0);
    expect(l.nodes.find((n) => n.id === "step:1")!.depth).toBe(1);
    expect(l.nodes.find((n) => n.id === "step:2")!.depth).toBe(2);
    expect(l.edges).toHaveLength(4);
  });

  it("emits one edge for a self-pairing step", () => {
    const l = layoutTree([step(1, 3, 3, 3)], 3);
    expect(l.edges).toHaveLength(1);
  });

  it("gives every node a positive-area canvas", () => {
    const l = layoutTree([step(1, 1, 2, 3)], 3);
    expect(l.width).toBeGreaterThan(0);
    expect(l.height).toBeGreaterThan(0);
    expect(l.nodes.every((n) => n.x >= 0 && n.y >= 0)).toBe(true);
  });

  it("computes the formula target rank", () => {
    expect(formulaTarget(570, 1460)).toBe(1015);
  });
});
