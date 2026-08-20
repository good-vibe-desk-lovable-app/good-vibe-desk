import { Footprints, Hammer, Sparkles, Swords, type LucideIcon } from "lucide-react";

import type { Passive } from "@/data/palworld";
import type { PassiveCategory } from "@/lib/passive-categories";

export type PassiveEffectSign = "positive" | "negative" | "neutral";

export const PASSIVE_CATEGORY_ICON: Record<PassiveCategory, LucideIcon> = {
  Combat: Swords,
  Work: Hammer,
  Movement: Footprints,
  Other: Sparkles,
};

export const PASSIVE_CATEGORY_CLASS: Record<PassiveCategory, string> = {
  Combat: "border-destructive/45 bg-destructive/10 text-destructive",
  Work: "border-info/45 bg-info/10 text-info",
  Movement: "border-primary/45 bg-primary/10 text-primary",
  Other: "border-border/70 bg-muted/40 text-muted-foreground",
};

export const PASSIVE_TIER_CLASS: Record<Passive["tier"], string> = {
  common: "border-border/70 text-muted-foreground",
  rare: "border-info/50 text-info",
  epic: "border-primary/50 text-primary",
  legendary: "border-warning/60 text-warning",
};

/**
 * Exposes polarity only when the source description contains one unambiguous
 * percentage direction. Trade-offs and prose-only effects intentionally remain
 * neutral rather than receiving an inferred positive or negative treatment.
 */
export function effectSign(passive: Passive): PassiveEffectSign {
  const signedModifiers = Array.from(passive.description.matchAll(/([+-])\s*\d/g));
  const signs = new Set(signedModifiers.map((match) => match[1]));
  if (signs.size !== 1 || signedModifiers.length === 0) return "neutral";

  // Direction words such as "drops", "decreases", "reduction", and
  // "extension" reverse or qualify the apparent sign. Do not infer meaning
  // from those descriptions; only surface a cue when EVERY signed modifier is
  // one of the simple direct-stat terms below.
  const directModifiers = Array.from(
    passive.description.matchAll(
      /\b(?:Attack|Defense|Work Speed|Movement Speed|Max Stamina|Life Steal|Mounted Jump Count|Farming's Work Suitability)\s*[+-]\s*\d/gi,
    ),
  );
  if (directModifiers.length !== signedModifiers.length) return "neutral";

  return signs.has("+") ? "positive" : "negative";
}
