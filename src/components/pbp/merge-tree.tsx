import { Star } from "lucide-react";

import { palById } from "@/data/palworld";
import { HATCH_TIME } from "@/lib/collection";
import type { Step } from "@/lib/pathfinder";
import { formulaTarget, layoutTree, NODE_H, NODE_W } from "@/lib/pathfinder/tree-layout";
import type { TreeNode } from "@/lib/pathfinder/tree-layout";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
            return (
              <g key={edge.id}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  className="text-border"
                  strokeWidth={1.5}
                />
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 4}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  {edgeLabel(edge.via, edge.parent1, edge.parent2)}
                </text>
              </g>
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
                  <span className="flex items-center gap-1 text-sm leading-tight font-semibold">
                    {node.kind === "root" ? <Star className="size-3.5 text-warning" /> : null}
                    {pal?.name ?? `Pal #${node.palId}`}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {node.kind === "leaf"
                      ? "you own this"
                      : `Step ${node.stepIndex} · ${pal?.eggSize ?? "?"} egg`}
                  </span>
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
                    {carried
                      .flatMap((id) => sourcePassives(id))
                      .join(", ") || carried.map(sourceName).join(", ")}
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
