import { ArrowDown, ArrowUp } from "lucide-react";

import type { PassiveEffectSign } from "./passive-visuals";
import { cn } from "@/lib/utils";

export function PassivePolarityCue({
  sign,
  className,
}: {
  sign: PassiveEffectSign;
  className?: string;
}) {
  if (sign === "neutral") return null;

  const positive = sign === "positive";
  const Icon = positive ? ArrowUp : ArrowDown;
  const label = positive ? "boost" : "penalty";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium",
        positive ? "text-success" : "text-destructive",
        className,
      )}
      title={`${positive ? "Positive" : "Negative"} percentage effect`}
    >
      <Icon className="size-3" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
