import { describe, expect, it } from "vitest";

import { COL_GAP, NODE_W, countCrossings, formulaTarget, layoutTree } from "../tree-layout";
import type { TreeNode } from "../tree-layout";
import type { Step } from "../types";

function step(index: number, parent1: number, parent2: number, child: number): Step {
  return { index, parent1, parent2, child, via: "formula", carriedSources: [], expectedAttempts: 1 };
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

function asMap(nodes: TreeNode[]): Map<string, TreeNode> {
  return new Map(nodes.map((n) => [n.id, n]));
}

/**
 * A chain the OLD row ordering laid out badly. Rows used to be sorted by step
 * index then pal id — neither says anything about where a node's parents sit,
 * so step 1's parents landing far right and step 2's far left dragged edges
 * across the whole diagram. Measured at 9 crossings before barycentre ordering.
 */
const TANGLED: Step[] = [
  step(1, 90, 20, 301),
  step(2, 10, 80, 302),
  step(3, 70, 30, 303),
  step(4, 301, 303, 304),
  step(5, 302, 304, 305),
];

describe("layoutTree — crossing reduction", () => {
  it("keeps the tangled fixture far below the 9 crossings the old order gave", () => {
    const l = layoutTree(TANGLED, 305);
    expect(countCrossings(asMap(l.nodes), l.edges)).toBeLessThanOrEqual(2);
  });

  it("is deterministic — the same steps always lay out identically", () => {
    // Barycentre ordering keeps the best of several sweeps. If that selection
    // were unstable, the same chain would reshuffle between renders and look
    // like the answer had changed.
    const a = layoutTree(TANGLED, 305);
    const b = layoutTree(TANGLED, 305);
    expect(a.nodes.map((n) => [n.id, n.x, n.y])).toEqual(b.nodes.map((n) => [n.id, n.x, n.y]));
  });

  it("never overlaps two nodes in the same row", () => {
    const l = layoutTree(TANGLED, 305);
    const rows = new Map<number, TreeNode[]>();
    for (const node of l.nodes) {
      const list = rows.get(node.y) ?? [];
      list.push(node);
      rows.set(node.y, list);
    }
    for (const list of rows.values()) {
      const xs = list.map((n) => n.x).sort((p, q) => p - q);
      for (let i = 1; i < xs.length; i++) {
        expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(NODE_W + COL_GAP);
      }
    }
  });

  it("carries the merge parents onto the child so the label renders once", () => {
    // The merge rule used to be drawn on BOTH edges of a step, painting
    // identical text at two midpoints. It now renders once, on the child.
    const l = layoutTree(TANGLED, 305);
    const child = l.nodes.find((n) => n.stepIndex === 4);
    expect(child?.parent1).toBe(301);
    expect(child?.parent2).toBe(303);
    expect(l.nodes.find((n) => n.kind === "leaf")?.parent1).toBeUndefined();
  });

  it("does not count edges that merely share a node as crossing", () => {
    // Two parents feeding one child always meet at the child. Counting that as
    // a crossing would make every single merge look tangled by definition.
    const l = layoutTree([step(1, 10, 20, 30)], 30);
    expect(l.edges).toHaveLength(2);
    expect(countCrossings(asMap(l.nodes), l.edges)).toBe(0);
  });

  it("leaves a single-edge tree untouched", () => {
    const l = layoutTree([step(1, 3, 3, 3)], 3);
    expect(countCrossings(asMap(l.nodes), l.edges)).toBe(0);
  });
});
