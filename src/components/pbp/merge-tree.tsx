import { Star } from "lucide-react";

import { palById } from "@/data/palworld";
import { HATCH_TIME } from "@/lib/collection";
import type { Step } from "@/lib/pathfinder";
import { formulaTarget, layoutTree, NODE_H, NODE_W } from "@/lib/pathfinder/tree-layout";
import type { TreeNode } from "@/lib/pathfinder/tree-layout";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PalIcon } from "./pal-icon";

const PAD = 24;

function palName(id: number) {
  return palById.get(id)?.name ?? `Pal #${id}`;
}

function edgeLabel(via: Step["via"], parent1: number, parent2: number): string {
  if (via === "unique") return "Unique";
  if (via === "same-species") return "Same species";
  const a = palById.get(parent1)?.combiRank;
  const b = palById.get(parent2)?.combiRank;
  if (a === undefined || b === undefined) return "Breeding power";
  return `→ ${formulaTarget(a, b)}`;
}

const KIND_CLASS: Record<TreeNode["kind"], string> = {
  leaf: "border-success/70 bg-success/10",
  intermediate: "border-info/60 bg-info/10",
  root: "border-warning bg-warning/15 shadow-[0_0_24px_-6px_var(--warning)]",
};

interface MergeTreeProps {
  steps: Step[];
  targetId: number | null;
  /** instanceId -> readable label for carried source Pals. */
  sourceName: (instanceId: string) => string;
  sourcePassives: (instanceId: string) => string[];
}

export function MergeTree({ steps, targetId, sourceName, sourcePassives }: MergeTreeProps) {
  const layout = layoutTree(steps, targetId);
  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
  const width = layout.width + PAD * 2;
  const height = layout.height + PAD * 2;

  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-background/40 p-2">
      <div className="relative mx-auto" style={{ width, height }}>
        <svg
          className="absolute inset-0"
          width={width}
          height={height}
          aria-hidden="true"
          focusable="false"
        >
          {layout.edges.map((edge) => {
            const from = byId.get(edge.from)!;
            const to = byId.get(edge.to)!;
            const x1 = PAD + from.x + NODE_W / 2;
            const y1 = PAD + from.y + NODE_H;
            const x2 = PAD + to.x + NODE_W / 2;
            const y2 = PAD + to.y;

            // Cubic curve with vertical control points. Straight diagonals from
            // several parents converging on one child arrive at the same point
            // at similar angles and read as a single scribble; curves that
            // leave and arrive vertically stay visually separate, and the eye
            // can follow one strand through a crossing.
            const bend = Math.max(24, (y2 - y1) * 0.45);
            const path = `M ${x1} ${y1} C ${x1} ${y1 + bend}, ${x2} ${y2 - bend}, ${x2} ${y2}`;

            return (
              <path
                key={edge.id}
                d={path}
                fill="none"
                stroke="currentColor"
                className="text-border"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {layout.nodes.map((node) => {
          const pal = palById.get(node.palId);
          const carried = node.carriedSources;
          return (
            <Tooltip key={node.id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "absolute flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 text-center",
                    KIND_CLASS[node.kind],
                  )}
                  style={{ left: PAD + node.x, top: PAD + node.y, width: NODE_W, height: NODE_H }}
                >
                  {pal ? (
                    <PalIcon internalName={pal.internalName} name={pal.name} size={28} />
                  ) : null}
                  <span className="flex items-center gap-1 text-sm leading-tight font-semibold">
                    {node.kind === "root" ? <Star className="size-3.5 text-warning" /> : null}
                    {pal?.name ?? `Pal #${node.palId}`}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {node.kind === "leaf"
                      ? "you own this"
                      : `Step ${node.stepIndex} · ${pal?.eggSize ?? "?"} egg`}
                  </span>
                  {/*
                    The merge rule, shown ONCE on the child. It used to be drawn
                    on each edge — but both edges of a merge derive their label
                    from the same step, so every rule was painted twice at two
                    different midpoints. Half the text on the diagram was a
                    duplicate competing for the same space.
                  */}
                  {node.kind !== "leaf" && node.via ? (
                    <span className="text-[9px] leading-none text-muted-foreground/80">
                      {edgeLabel(node.via, node.parent1 ?? 0, node.parent2 ?? 0)}
                    </span>
                  ) : null}
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-64">
                <p className="font-semibold">{pal?.name ?? `Pal #${node.palId}`}</p>
                <p className="text-xs">
                  Breeding power {pal?.combiRank ?? "?"} · {pal?.eggType ?? "?"} egg ·{" "}
                  {pal?.eggSize ?? "?"} ({HATCH_TIME[pal?.eggSize ?? ""] ?? "—"})
                </p>
                {carried.length > 0 ? (
                  <p className="mt-1 text-xs">
                    Carries:{" "}
                    {carried.flatMap((id) => sourcePassives(id)).join(", ") ||
                      carried.map(sourceName).join(", ")}
                  </p>
                ) : null}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
