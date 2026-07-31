import { DATA_VERSION, PALS, PASSIVES, PAL_PASSIVES } from "@/data/palworld";
import type { Passive } from "@/data/palworld";

export type Gender = "male" | "female" | "unknown";

export interface CollectionEntry {
  instanceId: string;
  palId: number;
  gender: Gender;
  passiveIds: string[];
}

export interface CollectionFile {
  version: 1;
  dataVersion?: string;
  entries: CollectionEntry[];
}

export const COLLECTION_KEY = "pbp:collection:v1";
export const LAST_TARGET_KEY = "pbp:lastTarget:v1";
export const FAVORITES_KEY = "pbp:favorites:v1";

export const MAX_PASSIVE_SLOTS = 4;

/**
 * Import hardening. instanceId is load-bearing: the search's self-breeding
 * guard treats equal instanceIds as the same physical Pal, and the desired-
 * source bitmask is keyed on it. Duplicates therefore deadlock the search
 * ("impossible" on reachable targets) or silently mis-assign mask bits, and
 * unbounded lengths can blow the localStorage quota so saves silently stop.
 */
export const MAX_ENTRIES = 500;
const MAX_INSTANCE_ID_LENGTH = 64;

/** Egg-size driven hatch estimates at default server settings. */
export const HATCH_TIME: Record<string, string> = {
  Normal: "3–6h",
  Large: "18–36h",
  Huge: "36–72h",
};

/** Same estimates as numbers, for summing a whole chain. */
export const HATCH_HOURS: Record<string, [number, number]> = {
  Normal: [3, 6],
  Large: [18, 36],
  Huge: [36, 72],
};


const passiveById = new Map<string, Passive>(PASSIVES.map((p) => [p.id, p]));
const palIds = new Set<number>(PALS.map((p) => p.id));

export function getPassive(id: string): Passive | undefined {
  return passiveById.get(id);
}

/**
 * Every Pal can roll any passive, so the picker always offers the full list.
 * Guaranteed ones are surfaced separately.
 */
export function passivesForPal(palId: number): Passive[] {
  const guaranteed = guaranteedPassiveIds(palId);
  if (guaranteed.length === 0) return PASSIVES;
  const first = guaranteed
    .map((id) => passiveById.get(id))
    .filter((p): p is Passive => !!p);
  const rest = PASSIVES.filter((p) => !guaranteed.includes(p.id));
  return [...first, ...rest];
}

/** Passives this species always spawns with, per palcalc's guaranteed list. */
export function guaranteedPassiveIds(palId: number): string[] {
  const entry = PAL_PASSIVES[palId];
  return !entry || entry === "any" ? [] : entry;
}


function isGender(value: unknown): value is Gender {
  return value === "male" || value === "female" || value === "unknown";
}

export interface ParseCollectionResult {
  entries: CollectionEntry[];
  /** Human-readable notes about anything the parser had to repair or drop. */
  notes: string[];
}

/**
 * Tolerant parse: v1 files predating the gender field default to "unknown".
 * Repairs rather than rejects where safe: duplicate / oversized / missing
 * instanceIds are regenerated, unknown passives are dropped, and the entry
 * count is capped. Only a structurally wrong file or an unknown palId returns
 * null (an unknown palId means the file targets a different dataset version —
 * silently repairing that would fabricate a collection the user doesn't own).
 */
export function parseCollectionFileDetailed(raw: unknown): ParseCollectionResult | null {
  if (typeof raw !== "object" || raw === null) return null;
  const file = raw as Partial<CollectionFile>;
  if (!Array.isArray(file.entries)) return null;

  const notes: string[] = [];
  const seenIds = new Set<string>();
  const entries: CollectionEntry[] = [];

  const items =
    file.entries.length > MAX_ENTRIES ? file.entries.slice(0, MAX_ENTRIES) : file.entries;
  if (file.entries.length > MAX_ENTRIES) {
    notes.push(`File had ${file.entries.length} entries — only the first ${MAX_ENTRIES} were imported.`);
  }

  let regenerated = 0;
  for (const item of items) {
    if (typeof item !== "object" || item === null) return null;
    const e = item as Partial<CollectionEntry>;
    if (typeof e.palId !== "number" || !palIds.has(e.palId)) return null;

    const passiveIds = Array.isArray(e.passiveIds)
      ? e.passiveIds.filter((id): id is string => typeof id === "string" && passiveById.has(id))
      : [];

    let instanceId =
      typeof e.instanceId === "string" &&
      e.instanceId.length > 0 &&
      e.instanceId.length <= MAX_INSTANCE_ID_LENGTH &&
      !seenIds.has(e.instanceId)
        ? e.instanceId
        : "";
    if (!instanceId) {
      instanceId = newInstanceId();
      regenerated++;
    }
    seenIds.add(instanceId);

    entries.push({
      instanceId,
      palId: e.palId,
      gender: isGender(e.gender) ? e.gender : "unknown",
      passiveIds: passiveIds.slice(0, MAX_PASSIVE_SLOTS),
    });
  }
  if (regenerated > 0) {
    notes.push(`${regenerated} ${regenerated === 1 ? "entry" : "entries"} had missing, oversized, or duplicate ids — new ids were assigned.`);
  }
  return { entries, notes };
}

/** Back-compatible wrapper: existing callers that only want the entries. */
export function parseCollectionFile(raw: unknown): CollectionEntry[] | null {
  return parseCollectionFileDetailed(raw)?.entries ?? null;
}

export function newInstanceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `pal-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadCollection(): CollectionEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COLLECTION_KEY);
    if (!raw) return [];
    return parseCollectionFile(JSON.parse(raw)) ?? [];
  } catch {
    return [];
  }
}

export function saveCollection(entries: CollectionEntry[]) {
  if (typeof window === "undefined") return;
  const file: CollectionFile = { version: 1, dataVersion: DATA_VERSION.dataVersion, entries };
  try {
    window.localStorage.setItem(COLLECTION_KEY, JSON.stringify(file));
  } catch {
    /* quota or private mode — collection stays in memory for this session */
  }
}

export function loadLastTarget(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_TARGET_KEY);
    if (!raw) return null;
    const id = Number(JSON.parse(raw));
    return palIds.has(id) ? id : null;
  } catch {
    return null;
  }
}

export function saveLastTarget(id: number | null) {
  if (typeof window === "undefined") return;
  try {
    if (id === null) window.localStorage.removeItem(LAST_TARGET_KEY);
    else window.localStorage.setItem(LAST_TARGET_KEY, JSON.stringify(id));
  } catch {
    /* ignore */
  }
}

/** "Only 5% of wild Bellanoir are male" — only when the split is actually skewed. */
export function genderRatioNote(name: string, maleRatio?: number): string | null {
  if (typeof maleRatio !== "number" || maleRatio === 50) return null;
  return maleRatio < 50
    ? `Only ${maleRatio}% of wild ${name} are male.`
    : `Only ${100 - maleRatio}% of wild ${name} are female.`;
}

export interface FavoritesFile {
  version: 1;
  ids: number[];
}

export function loadFavorites(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<FavoritesFile>;
    if (!Array.isArray(parsed?.ids)) return [];
    return parsed.ids.filter((id): id is number => typeof id === "number" && palIds.has(id));
  } catch {
    return [];
  }
}

export function saveFavorites(ids: number[]) {
  if (typeof window === "undefined") return;
  const file: FavoritesFile = { version: 1, ids };
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(file));
  } catch {
    /* ignore */
  }
}

/** Which species guarantee a given passive — powers the glossary. */
export function palsGuaranteeing(passiveId: string): number[] {
  const out: number[] = [];
  for (const [key, value] of Object.entries(PAL_PASSIVES)) {
    if (value !== "any" && Array.isArray(value) && value.includes(passiveId)) out.push(Number(key));
  }
  return out;
}
