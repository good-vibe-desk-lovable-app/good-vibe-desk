// Pure layout maths for the merge tree. No React, no DOM, no dataset imports.
import type { Step } from "./types";

export type NodeKind = "leaf" | "intermediate" | "root";

export interface TreeNode {
  id: string;
  palId: number;
  kind: NodeKind;
  /** 1-based step index that produced this node; undefined for leaves. */
  stepIndex?: number;
  via?: Step["via"];
  carriedSources: string[];
  depth: number;
  x: number;
  y: number;
}

export interface TreeEdge {
  id: string;
  from: string;
  to: string;
  via: Step["via"];
  parent1: number;
  parent2: number;
}

export interface TreeLayout {
  nodes: TreeNode[];
  edges: TreeEdge[];
  width: number;
  height: number;
  rootId: string | null;
}

export const NODE_W = 168;
// 66 was sized for a two-line text node; the icon added above the name needs
// another ~28px plus its gap.
export const NODE_H = 96;
export const COL_GAP = 32;
export const ROW_GAP = 66;

/**
 * Steps come out of the search in topological order, so a single forward pass
 * resolves every parent: a parent is either a previously produced node or a
 * Pal straight out of the collection (a leaf).
 */
export function layoutTree(steps: Step[], targetId: number | null): TreeLayout {
  const nodes = new Map<string, TreeNode>();
  const edges: TreeEdge[] = [];
  const producedByPal = new Map<number, string>();

  const leafFor = (palId: number): string => {
    const id = `leaf:${palId}`;
    if (!nodes.has(id)) {
      nodes.set(id, { id, palId, kind: "leaf", carriedSources: [], depth: 0, x: 0, y: 0 });
    }
    return id;
  };

  const parentNode = (palId: number): string => producedByPal.get(palId) ?? leafFor(palId);

  for (const step of steps) {
    const aId = parentNode(step.parent1);
    const bId = parentNode(step.parent2);
    const depth = Math.max(nodes.get(aId)!.depth, nodes.get(bId)!.depth) + 1;
    const id = `step:${step.index}`;
    nodes.set(id, {
      id,
      palId: step.child,
      kind: "intermediate",
      stepIndex: step.index,
      via: step.via,
      carriedSources: step.carriedSources,
      depth,
      x: 0,
      y: 0,
    });
    edges.push({ id: `${id}:a`, from: aId, to: id, via: step.via, parent1: step.parent1, parent2: step.parent2 });
    if (bId !== aId) {
      edges.push({ id: `${id}:b`, from: bId, to: id, via: step.via, parent1: step.parent1, parent2: step.parent2 });
    }
    producedByPal.set(step.child, id);
  }

  let rootId: string | null = null;
  if (steps.length > 0) {
    rootId = `step:${steps[steps.length - 1].index}`;
  } else if (targetId !== null) {
    rootId = leafFor(targetId);
  }
  if (rootId && nodes.has(rootId)) nodes.get(rootId)!.kind = "root";

  // Assign coordinates: one row per depth, nodes spread evenly within the row.
  const byDepth = new Map<number, TreeNode[]>();
  for (const node of nodes.values()) {
    const list = byDepth.get(node.depth) ?? [];
    list.push(node);
    byDepth.set(node.depth, list);
  }
  const maxDepth = Math.max(0, ...byDepth.keys());
  const widest = Math.max(1, ...Array.from(byDepth.values(), (l) => l.length));
  const rowWidth = widest * NODE_W + (widest - 1) * COL_GAP;

  for (const [depth, list] of byDepth) {
    list.sort((a, b) => (a.stepIndex ?? -1) - (b.stepIndex ?? -1) || a.palId - b.palId);
    const total = list.length * NODE_W + (list.length - 1) * COL_GAP;
    const offset = (rowWidth - total) / 2;
    list.forEach((node, i) => {
      node.x = offset + i * (NODE_W + COL_GAP);
      node.y = depth * (NODE_H + ROW_GAP);
    });
  }

  return {
    nodes: Array.from(nodes.values()),
    edges,
    width: rowWidth,
    height: (maxDepth + 1) * NODE_H + maxDepth * ROW_GAP,
    rootId,
  };
}

/** Breeding-power target the formula aimed at, for edge labels. */
export function formulaTarget(rankA: number, rankB: number): number {
  return Math.floor((rankA + rankB + 1) / 2);
}
