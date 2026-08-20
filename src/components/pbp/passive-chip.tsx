import { useState } from "react";

import { palById } from "@/data/palworld";
import type { Passive } from "@/data/palworld";
import { getPassive, palsGuaranteeing } from "@/lib/collection";
import { categoryOfId } from "@/lib/passive-categories";
import { cn } from "@/lib/utils";
import {
  effectSign,
  PASSIVE_CATEGORY_CLASS,
  PASSIVE_CATEGORY_ICON,
  PASSIVE_TIER_CLASS,
} from "./passive-visuals";
import { PassivePolarityCue } from "./passive-polarity-cue";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PassiveChipProps {
  passiveId: string;
  /** Green treatment for passives that survive all the way to the target. */
  carried?: boolean;
  className?: string;
}

/** Every passive chip in the app is a button into the glossary dialog. */
export function PassiveChip({ passiveId, carried, className }: PassiveChipProps) {
  const [open, setOpen] = useState(false);
  const passive = getPassive(passiveId);
  const label = passive?.name ?? passiveId;
  const category = categoryOfId(passiveId);
  const CategoryIcon = PASSIVE_CATEGORY_ICON[category];
  const sign = passive ? effectSign(passive) : "neutral";

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}

        title={`What does ${label} do?`}
        className={cn(
          "inline-flex min-h-11 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
          carried
            ? "border-success/60 bg-success/15 text-success shadow-[0_0_10px_-2px_var(--success)]"
            : "border-border/70 bg-background/60 text-muted-foreground hover:text-foreground",
          className,
        )}
      >
        <span
          className={cn(
            "inline-flex size-4 shrink-0 items-center justify-center rounded-full border",
            PASSIVE_CATEGORY_CLASS[category],
          )}
          aria-label={`${category} passive`}
        >
          <CategoryIcon className="size-2.5" aria-hidden="true" />
        </span>
        <span>{label}</span>
        {passive ? (
          <span
            className={cn(
              "rounded-full border px-1 text-[9px] capitalize",
              PASSIVE_TIER_CLASS[passive.tier],
            )}
          >
            {passive.tier}
          </span>
        ) : null}
        <PassivePolarityCue sign={sign} className="text-[9px]" />
      </button>
      <PassiveGlossaryDialog passiveId={passiveId} open={open} onOpenChange={setOpen} />
    </>
  );
}

export function PassiveGlossaryDialog({
  passiveId,
  open,
  onOpenChange,
}: {
  passiveId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const passive = getPassive(passiveId);
  const guaranteedBy = open ? palsGuaranteeing(passiveId) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {passive?.name ?? passiveId}
            {passive ? (
              <Badge
                variant="outline"
                className={cn("text-[10px] capitalize", PASSIVE_TIER_CLASS[passive.tier])}
              >
                {passive.tier}
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {passive?.description ?? "No description recorded for this passive."}
          </DialogDescription>
        </DialogHeader>

        <div>
          <h4 className="text-sm font-semibold">Where it comes from</h4>
          {guaranteedBy.length > 0 ? (
            <div className="mt-2 flex max-h-40 flex-wrap gap-1 overflow-y-auto">
              {guaranteedBy.map((id) => (
                <Badge key={id} variant="secondary" className="text-[11px]">
                  {palById.get(id)?.name ?? `Pal #${id}`}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No species is guaranteed to spawn with this one — any Pal can roll it.
            </p>
          )}
        </div>

        <DialogFooter className="sm:justify-start">
          <p className="text-xs text-muted-foreground">
            Passives are inherited from the parents' combined pool; a Pal holds at most 4. Special
            Cake improves inheritance odds. Exact inheritance percentages aren't published by the
            developer.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
