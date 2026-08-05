// How can a player actually get this Pal?
//
// IMPORTANT: the per-point rows in spawns.ts are incomplete (see modelGaps.ts) —
// Chikipi has no field row yet 558 habitat spawn points. Field presence is
// therefore decided by PAL_HABITAT totals, which cover all 299 Pals.
//
// There is no dungeon / tower-boss / raid-boss data in the dataset, so a Pal with
// no habitat presence is reported "unknown", never "breed only". An over-applied
// breed-only badge would tell players to breed Pals they could simply catch.
import { PALS } from "@/data/palworld";
import { PAL_HABITAT } from "@/data/palworld/habitat";
import { PAL_SPAWNS, type SpawnPoint } from "@/data/palworld/spawns";

export type Acquisition = "field" | "unknown";

export interface AcquisitionInfo {
  kind: Acquisition;
  /** Total parsed spawn points across every map and time-of-day window. */
  habitatPoints: number;
  /** Named areas we have coordinates or labels for (may be empty). */
  areas: string[];
  dayPoints: number;
  nightPoints: number;
  /** Maps the Pal appears on, with per-window counts. */
  windows: { map: string; day: number; night: number }[];
  eggOnlyRows: boolean;
  reason: string;
}

function spawnsOf(internalName: string): SpawnPoint[] {
  return PAL_SPAWNS[internalName] ?? [];
}

export function acquisitionOf(internalName: string): AcquisitionInfo {
  const windowsRaw = PAL_HABITAT[internalName] ?? [];
  const byMap = new Map<string, { map: string; day: number; night: number }>();
  let day = 0;
  let night = 0;
  for (const w of windowsRaw) {
    const row = byMap.get(w.map) ?? { map: w.map, day: 0, night: 0 };
    if (w.time === "day") {
      row.day += w.count;
      day += w.count;
    } else {
      row.night += w.count;
      night += w.count;
    }
    byMap.set(w.map, row);
  }
  const habitatPoints = day + night;
  const rows = spawnsOf(internalName);
  const areas = Array.from(
    new Set(rows.filter((r) => (r.kind ?? "field") === "field").map((r) => r.area)),
  );

  return {
    kind: habitatPoints > 0 ? "field" : "unknown",
    habitatPoints,
    areas,
    dayPoints: day,
    nightPoints: night,
    windows: Array.from(byMap.values()).filter((w) => w.day > 0 || w.night > 0),
    eggOnlyRows: rows.length > 0 && rows.every((r) => r.kind === "egg"),
    reason:
      habitatPoints > 0
        ? `${habitatPoints} spawn points recorded in the wild.`
        : "No wild spawn points recorded, and the dataset has no dungeon, tower or raid source data — how to obtain this Pal is unconfirmed.",
  };
}

export function acquisitionOfPalId(palId: number): AcquisitionInfo | null {
  const pal = PALS.find((p) => p.id === palId);
  return pal ? acquisitionOf(pal.internalName) : null;
}

/** Counts for the whole dex — used by /data-check and the audit report. */
export function acquisitionBreakdown(): Record<Acquisition, number> {
  const out: Record<Acquisition, number> = { field: 0, unknown: 0 };
  for (const pal of PALS) out[acquisitionOf(pal.internalName).kind]++;
  return out;
}

export const ACQUISITION_LABEL: Record<Acquisition, string> = {
  field: "Catchable in the wild",
  unknown: "Acquisition unknown",
};
