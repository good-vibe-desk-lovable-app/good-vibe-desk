// Passive categories, derived from the existing passive descriptions.
// Nothing is guessed: anything whose description doesn't clearly match a
// category falls through to "Other".
import { PASSIVES } from "@/data/palworld";
import type { Passive } from "@/data/palworld";

export const PASSIVE_CATEGORIES = ["Combat", "Work", "Movement", "Other"] as const;
export type PassiveCategory = (typeof PASSIVE_CATEGORIES)[number];

const COMBAT = /attack|defen[cs]e|damage|element|shield|critical|hp\b|health/i;
const WORK = /work speed|work suitability|crafting|gathering|mining|logging|planting|watering|kindling|handiwork|sanity|hunger|food/i;
const MOVEMENT = /movement speed|walk|run|sprint|mount|riding|stamina|carry|weight/i;

export function categoryOf(passive: Passive): PassiveCategory {
  const text = `${passive.name} ${passive.description}`;
  if (MOVEMENT.test(text)) return "Movement";
  if (WORK.test(text)) return "Work";
  if (COMBAT.test(text)) return "Combat";
  return "Other";
}

const cache = new Map<string, PassiveCategory>(
  PASSIVES.map((p) => [p.id, categoryOf(p)] as const),
);

export function categoryOfId(passiveId: string): PassiveCategory {
  return cache.get(passiveId) ?? "Other";
}
