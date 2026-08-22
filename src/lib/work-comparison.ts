import { PALS, type Pal } from "@/data/palworld";
import type { EvidenceRecord } from "@/data/palworld/knowledge";
import type {
  WorkSuitabilityKey,
  WorkSuitabilityKnowledge,
} from "@/data/palworld/knowledgeWorkSuitability";
import { PAL_STATS } from "@/data/palworld/stats";

export const WORK_COMPARISON_KEY = "pbp:work-comparison:v1";
export const WORK_COMPARISON_BACKUP_KEY = "pbp:work-comparison:backup:v1";

export type RosterScope = "any" | "owned" | "breedable";

export const WORK_OPTIONS = [
  { key: "kindling", label: "Kindling" },
  { key: "watering", label: "Watering" },
  { key: "planting", label: "Planting" },
  { key: "generatingElectricity", label: "Generating Electricity" },
  { key: "handiwork", label: "Handiwork" },
  { key: "gathering", label: "Gathering" },
  { key: "lumbering", label: "Lumbering" },
  { key: "mining", label: "Mining" },
  { key: "medicineProduction", label: "Medicine Production" },
  { key: "cooling", label: "Cooling" },
  { key: "transporting", label: "Transporting" },
  { key: "farming", label: "Farming" },
] as const satisfies readonly { key: WorkSuitabilityKey; label: string }[];

export type WorkComparisonKey = (typeof WORK_OPTIONS)[number]["key"];

const sourceKeyForDisplayWork: Readonly<Record<string, WorkComparisonKey>> = {
  Kindling: "kindling",
  Watering: "watering",
  Planting: "planting",
  "Generating Electricity": "generatingElectricity",
  Handiwork: "handiwork",
  Gathering: "gathering",
  Lumbering: "lumbering",
  Mining: "mining",
  "Medicine Production": "medicineProduction",
  Cooling: "cooling",
  Transporting: "transporting",
  Farming: "farming",
};

export interface WorkComparisonState {
  version: 1;
  work: WorkComparisonKey | null;
  condensationRank: number;
  scope: RosterScope;
}

export interface WorkCandidate {
  pal: Pal;
  level: number | null;
  knownProgression: boolean;
  sourceRecord: EvidenceRecord<WorkSuitabilityKnowledge> | null;
}

export const DEFAULT_WORK_COMPARISON_STATE: WorkComparisonState = {
  version: 1,
  // Selecting no task preserves an alphabetical browse mode: the app does not
  // imply that one job type or a multi-job total is the universal definition of
  // a best base worker.
  work: null,
  condensationRank: 0,
  scope: "any",
};

const palIds = new Set(PALS.map((pal) => pal.id));
const workKeys = new Set<WorkComparisonKey>(WORK_OPTIONS.map((option) => option.key));

function parseRank(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(4, Math.round(numeric)));
}

function parseScope(value: unknown): RosterScope {
  return value === "owned" || value === "breedable" || value === "any" ? value : "any";
}

function parseWork(value: unknown): WorkComparisonKey | null {
  return typeof value === "string" && workKeys.has(value as WorkComparisonKey)
    ? (value as WorkComparisonKey)
    : null;
}

export function parseWorkComparisonState(value: unknown): WorkComparisonState | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Partial<WorkComparisonState>;
  if (raw.version !== 1) return null;
  return {
    version: 1,
    work: parseWork(raw.work),
    condensationRank: parseRank(raw.condensationRank),
    scope: parseScope(raw.scope),
  };
}

function readStorage(key: string): WorkComparisonState | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? parseWorkComparisonState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function loadWorkComparisonState(): WorkComparisonState {
  if (typeof window === "undefined") return DEFAULT_WORK_COMPARISON_STATE;
  return (
    readStorage(WORK_COMPARISON_KEY) ??
    readStorage(WORK_COMPARISON_BACKUP_KEY) ??
    DEFAULT_WORK_COMPARISON_STATE
  );
}

export function saveWorkComparisonState(state: WorkComparisonState): boolean {
  if (typeof window === "undefined") return true;
  const parsed = parseWorkComparisonState(state);
  if (!parsed) return false;
  const serialized = JSON.stringify(parsed);
  let saved = true;
  try {
    window.localStorage.setItem(WORK_COMPARISON_KEY, serialized);
  } catch {
    saved = false;
  }
  try {
    window.localStorage.setItem(WORK_COMPARISON_BACKUP_KEY, serialized);
  } catch {
    // Match collection/combat persistence: a primary write remains useful even
    // when a best-effort backup cannot be stored.
  }
  return saved;
}

export function workLabel(work: WorkComparisonKey | null): string {
  return WORK_OPTIONS.find((option) => option.key === work)?.label ?? "No work selected";
}

function baseFallbackLevel(pal: Pal, work: WorkComparisonKey): number | null {
  const displayWork = Object.entries(sourceKeyForDisplayWork).find(
    ([, sourceKey]) => sourceKey === work,
  )?.[0];
  if (!displayWork) return null;
  const known = PAL_STATS[pal.internalName]?.work.find(
    (entry) => entry.work === displayWork,
  )?.level;
  return typeof known === "number" && known > 0 ? known : null;
}

function candidateFor(
  pal: Pal,
  state: WorkComparisonState,
  recordsByInternalName: ReadonlyMap<string, EvidenceRecord<WorkSuitabilityKnowledge>>,
): WorkCandidate | null {
  if (state.work === null) {
    const record = recordsByInternalName.get(pal.internalName) ?? null;
    const hasAnyBaseWork =
      PAL_STATS[pal.internalName]?.work.some((entry) => entry.level > 0) ?? false;
    if (!record && !hasAnyBaseWork) return null;
    return { pal, level: null, knownProgression: record !== null, sourceRecord: record };
  }

  const record = recordsByInternalName.get(pal.internalName) ?? null;
  if (record) {
    const level = record.data.levels[state.condensationRank]?.[state.work] ?? null;
    if (level === null || level <= 0) return null;
    return { pal, level, knownProgression: true, sourceRecord: record };
  }

  // No per-rank source exists for Gumoss Flower. Its rank-0 base value remains
  // source-backed by the existing PalCalc data, but a later rank is explicitly
  // unknown rather than copied from the base Gumoss or derived by an alias.
  if (state.condensationRank !== 0) return null;
  const level = baseFallbackLevel(pal, state.work);
  if (level === null) return null;
  return { pal, level, knownProgression: false, sourceRecord: null };
}

export function workCandidates(
  state: WorkComparisonState,
  records: readonly EvidenceRecord<WorkSuitabilityKnowledge>[],
): WorkCandidate[] {
  const recordsByInternalName = new Map(
    records.map((record) => [record.data.internalName, record]),
  );
  return PALS.map((pal) => candidateFor(pal, state, recordsByInternalName))
    .filter((candidate): candidate is WorkCandidate => candidate !== null)
    .sort((left, right) => {
      if (left.level !== null && right.level !== null && left.level !== right.level) {
        return right.level - left.level;
      }
      return left.pal.name.localeCompare(right.pal.name);
    });
}

export function filterWorkCandidates(
  candidates: readonly WorkCandidate[],
  state: WorkComparisonState,
  ownedIds: ReadonlySet<number>,
  breedableIds: ReadonlySet<number>,
): WorkCandidate[] {
  return candidates.filter((candidate) => {
    if (state.scope === "owned" && !ownedIds.has(candidate.pal.id)) return false;
    if (state.scope === "breedable" && !breedableIds.has(candidate.pal.id)) return false;
    return true;
  });
}

export function countUnknownProgressions(
  state: WorkComparisonState,
  records: readonly EvidenceRecord<WorkSuitabilityKnowledge>[],
): number {
  const work = state.work;
  if (work === null || state.condensationRank === 0) return 0;
  const known = new Set(records.map((record) => record.data.internalName));
  return PALS.filter((pal) => !known.has(pal.internalName) && baseFallbackLevel(pal, work) !== null)
    .length;
}

export function encodeWorkComparisonState(state: WorkComparisonState): string {
  const parsed = parseWorkComparisonState(state);
  if (!parsed) return "";
  const params = new URLSearchParams({
    v: "1",
    rank: String(parsed.condensationRank),
    scope: parsed.scope,
  });
  if (parsed.work) params.set("work", parsed.work);
  return params.toString();
}

export function decodeWorkComparisonState(search: string): WorkComparisonState | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (params.get("v") !== "1") return null;
  return parseWorkComparisonState({
    version: 1,
    work: params.get("work"),
    condensationRank: params.get("rank"),
    scope: params.get("scope"),
  });
}

export function buildWorkComparisonShareUrl(state: WorkComparisonState): string {
  const query = encodeWorkComparisonState(state);
  const base =
    typeof window === "undefined" ? "/planner/work" : `${window.location.origin}/planner/work`;
  return `${base}?${query}`;
}

export function validCollectionPalIds(value: readonly number[]): number[] {
  return [...new Set(value.filter((id) => palIds.has(id)))];
}
