// How can a player actually get this Pal?
//
// There is no "breed only" Pal: every roster entry has at least one spawner or
// boss row, and the twelve Pals with no habitat presence all carry
// CaptureRateCorrect 1.0. So this module reports an ACQUISITION CHANNEL, never a
// breed-only flag.
//
// Two sources feed it:
//   1. ACQUISITION_CHANNELS — hand-maintained, datamine/guide sourced, for the
//      Pals whose channel is not a plain overworld spawn.
//   2. PAL_HABITAT totals — the reliable signal for wild presence. The per-point
//      rows in spawns.ts are incomplete (see modelGaps.ts): Chikipi has no field
//      row yet 558 habitat spawn points.
//
// Dungeon acquisition is UNDER-COUNTED (see manualDataGaps.ts), so a Pal with no
// channel and no habitat presence reports "unknown" — never "not obtainable".
import { PALS } from "@/data/palworld";
import { PAL_HABITAT } from "@/data/palworld/habitat";
import { PAL_SPAWNS, type SpawnPoint } from "@/data/palworld/spawns";
import { raidBossesOf, type RaidBossEvidence } from "@/data/palworld/raid";
import { towerBossesOf, type TowerBossEvidence } from "@/data/palworld/towers";
import {
  ACQUISITION_CHANNELS,
  CHANNEL_LABEL,
  type AcquisitionChannel,
} from "@/data/palworld/acquisitionChannels";

export type { AcquisitionChannel };
export { CHANNEL_LABEL };

export interface AcquisitionInfo {
  channel: AcquisitionChannel;
  label: string;
  /** What the player has to do to get it. */
  requirement: string;
  /** 1 = datamine, 3 = guide site. null when derived from habitat counts alone. */
  sourceTier: 1 | 3 | null;
  notes: string[];
  guaranteedCapture: boolean;
  /** Total parsed spawn points across every map and time-of-day window. */
  habitatPoints: number;
  /** Named areas we have coordinates or labels for (may be empty). */
  areas: string[];
  dayPoints: number;
  nightPoints: number;
  /** Maps the Pal appears on, with per-window counts. */
  windows: { map: string; day: number; night: number }[];
  eggOnlyRows: boolean;
  /** Independently generated PalDB Summoning Altar evidence; not a field-spawn substitute. */
  raidBoss: boolean;
  raidBosses: readonly RaidBossEvidence[];
  /** Two-source wiki-corroborated tower evidence; distinct from spawn and raid data. */
  towerBoss: boolean;
  towerBosses: readonly TowerBossEvidence[];
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

  const known = ACQUISITION_CHANNELS[internalName];
  const raidBosses = raidBossesOf(internalName);
  const towerBosses = towerBossesOf(internalName);
  const channel: AcquisitionChannel = known
    ? known.channel
    : raidBosses.length > 0
      ? "raid_altar"
      : habitatPoints > 0
        ? "wild_spawn"
        : "unknown";

  const requirement = known
    ? known.requirement
    : raidBosses.length > 0
      ? "Summoning Altar raid — see the recorded PalDB encounter variants."
      : habitatPoints > 0
        ? `Catchable in the overworld — ${habitatPoints} spawn points recorded.`
        : "No channel resolved. Dungeon spawn tables key through group IDs and could not be matched, so this is unconfirmed rather than unobtainable.";

  return {
    channel,
    label: CHANNEL_LABEL[channel],
    requirement,
    sourceTier: known?.sourceTier ?? null,
    notes: known?.notes ?? [],
    guaranteedCapture: known?.guaranteedCapture ?? false,
    habitatPoints,
    areas,
    dayPoints: day,
    nightPoints: night,
    windows: Array.from(byMap.values()).filter((w) => w.day > 0 || w.night > 0),
    eggOnlyRows: rows.length > 0 && rows.every((r) => r.kind === "egg"),
    raidBoss: raidBosses.length > 0,
    raidBosses,
    towerBoss: towerBosses.length > 0,
    towerBosses,
    reason: requirement,
  };
}

export function acquisitionOfPalId(palId: number): AcquisitionInfo | null {
  const pal = PALS.find((p) => p.id === palId);
  return pal ? acquisitionOf(pal.internalName) : null;
}

/** Counts for the whole dex — used by /data-check and the audit report. */
export function acquisitionBreakdown(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const pal of PALS) {
    const k = acquisitionOf(pal.internalName).channel;
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/** Channels present in the roster, for filter chips. */
export function channelsInUse(): AcquisitionChannel[] {
  return Object.keys(acquisitionBreakdown()).sort() as AcquisitionChannel[];
}
