import { PALS, type Pal } from "@/data/palworld";
import { elementsOf } from "@/data/palworld/elements";
import { PAL_STATS } from "@/data/palworld/stats";

export const COMBAT_COMPARISON_KEY = "pbp:combat-comparison:v1";
export const COMBAT_COMPARISON_BACKUP_KEY = "pbp:combat-comparison:backup:v1";
export const COMBAT_COMPARISON_MAX_TEAM_SIZE = 5;

export const COMBAT_WEIGHT_KEYS = ["attack", "health", "defense"] as const;
export type CombatWeightKey = (typeof COMBAT_WEIGHT_KEYS)[number];

export type RosterScope = "any" | "owned" | "breedable";
export type EncounterContext = "all" | "field-alpha" | "dungeon" | "raid" | "tower";

export interface CombatWeights {
  attack: number;
  health: number;
  defense: number;
}

export interface CombatComparisonState {
  version: 1;
  weights: CombatWeights;
  scope: RosterScope;
  encounter: EncounterContext;
  selectedPalIds: number[];
}

export interface CombatPreset {
  id: string;
  label: string;
  weights: CombatWeights;
}

/**
 * These are user-preference starting points, not Palworld game data or an
 * authoritative statement that one base stat matters more than another.
 */
export const PERSONAL_COMBAT_PRESETS: readonly CombatPreset[] = [
  {
    id: "balanced",
    label: "My balanced comparison",
    weights: { attack: 34, health: 33, defense: 33 },
  },
  {
    id: "attack",
    label: "My attack-first comparison",
    weights: { attack: 60, health: 20, defense: 20 },
  },
  {
    id: "durability",
    label: "My durability-first comparison",
    weights: { attack: 20, health: 40, defense: 40 },
  },
] as const;

export interface CombatCandidate {
  pal: Pal;
  raw: CombatWeights;
  percentiles: CombatWeights;
  elements: readonly string[];
  score: number | null;
}

export const DEFAULT_COMBAT_COMPARISON_STATE: CombatComparisonState = {
  version: 1,
  // An all-zero state deliberately avoids a default universal combat ranking.
  weights: { attack: 0, health: 0, defense: 0 },
  scope: "any",
  encounter: "all",
  selectedPalIds: [],
};

const palIds = new Set(PALS.map((pal) => pal.id));

function clampWeight(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function parseScope(value: unknown): RosterScope {
  return value === "owned" || value === "breedable" || value === "any" ? value : "any";
}

function parseEncounter(value: unknown): EncounterContext {
  return value === "field-alpha" ||
    value === "dungeon" ||
    value === "raid" ||
    value === "tower" ||
    value === "all"
    ? value
    : "all";
}

function parseSelected(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(value.filter((id): id is number => typeof id === "number" && palIds.has(id))),
  ].slice(0, COMBAT_COMPARISON_MAX_TEAM_SIZE);
}

export function parseCombatComparisonState(value: unknown): CombatComparisonState | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Partial<CombatComparisonState>;
  if (raw.version !== 1 || typeof raw.weights !== "object" || raw.weights === null) return null;
  const weights = raw.weights as Partial<CombatWeights>;
  return {
    version: 1,
    weights: {
      attack: clampWeight(weights.attack),
      health: clampWeight(weights.health),
      defense: clampWeight(weights.defense),
    },
    scope: parseScope(raw.scope),
    encounter: parseEncounter(raw.encounter),
    selectedPalIds: parseSelected(raw.selectedPalIds),
  };
}

function readStorage(key: string): CombatComparisonState | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? parseCombatComparisonState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Mirrors collection persistence: a corrupt primary falls back to a backup. */
export function loadCombatComparisonState(): CombatComparisonState {
  if (typeof window === "undefined") return DEFAULT_COMBAT_COMPARISON_STATE;
  return (
    readStorage(COMBAT_COMPARISON_KEY) ??
    readStorage(COMBAT_COMPARISON_BACKUP_KEY) ??
    DEFAULT_COMBAT_COMPARISON_STATE
  );
}

/** Persists a validated user preference configuration without asserting game truth. */
export function saveCombatComparisonState(state: CombatComparisonState): boolean {
  if (typeof window === "undefined") return true;
  const parsed = parseCombatComparisonState(state);
  if (!parsed) return false;
  const payload = JSON.stringify(parsed);
  let saved = true;
  try {
    window.localStorage.setItem(COMBAT_COMPARISON_KEY, payload);
  } catch {
    saved = false;
  }
  try {
    window.localStorage.setItem(COMBAT_COMPARISON_BACKUP_KEY, payload);
  } catch {
    /* The primary result remains authoritative, as with collection storage. */
  }
  return saved;
}

export function combatWeightTotal(weights: CombatWeights): number {
  return weights.attack + weights.health + weights.defense;
}

export function hasCombatWeights(weights: CombatWeights): boolean {
  return combatWeightTotal(weights) > 0;
}

function numericStat(pal: Pal, key: CombatWeightKey): number | null {
  const value = PAL_STATS[pal.internalName]?.stats[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const baseStatValues: Record<CombatWeightKey, readonly number[]> = {
  attack: PALS.map((pal) => numericStat(pal, "attack")).filter(
    (value): value is number => value !== null,
  ),
  health: PALS.map((pal) => numericStat(pal, "health")).filter(
    (value): value is number => value !== null,
  ),
  defense: PALS.map((pal) => numericStat(pal, "defense")).filter(
    (value): value is number => value !== null,
  ),
};

function percentile(value: number, population: readonly number[]): number {
  if (population.length <= 1) return 100;
  const atOrBelow = population.filter((candidate) => candidate <= value).length;
  return Math.round(((atOrBelow - 1) / (population.length - 1)) * 100);
}

function candidateFor(pal: Pal, weights: CombatWeights): CombatCandidate | null {
  const attack = numericStat(pal, "attack");
  const health = numericStat(pal, "health");
  const defense = numericStat(pal, "defense");
  if (attack === null || health === null || defense === null) return null;

  const raw = { attack, health, defense };
  const percentiles = {
    attack: percentile(attack, baseStatValues.attack),
    health: percentile(health, baseStatValues.health),
    defense: percentile(defense, baseStatValues.defense),
  };
  const total = combatWeightTotal(weights);
  const score =
    total === 0
      ? null
      : Number(
          (
            (percentiles.attack * weights.attack +
              percentiles.health * weights.health +
              percentiles.defense * weights.defense) /
            total
          ).toFixed(1),
        );

  return { pal, raw, percentiles, elements: elementsOf(pal.internalName), score };
}

/**
 * Sorts only the user-created weighted base-stat index. If every weight is
 * zero, alphabetic order makes the absence of a default recommendation visible.
 */
export function combatCandidates(weights: CombatWeights): CombatCandidate[] {
  return PALS.map((pal) => candidateFor(pal, weights))
    .filter((candidate): candidate is CombatCandidate => candidate !== null)
    .sort((a, b) => {
      if (a.score !== null && b.score !== null && a.score !== b.score) return b.score - a.score;
      return a.pal.name.localeCompare(b.pal.name);
    });
}

export function filterCombatCandidates(
  candidates: readonly CombatCandidate[],
  state: CombatComparisonState,
  ownedIds: ReadonlySet<number>,
  breedableIds: ReadonlySet<number>,
  encounterPalIds: ReadonlySet<number>,
): CombatCandidate[] {
  return candidates.filter((candidate) => {
    if (state.scope === "owned" && !ownedIds.has(candidate.pal.id)) return false;
    if (state.scope === "breedable" && !breedableIds.has(candidate.pal.id)) return false;
    // A context filter is a record-association filter only. It never predicts
    // matchup strength, damage, or a recommended counter-team.
    if (state.encounter !== "all" && !encounterPalIds.has(candidate.pal.id)) return false;
    return true;
  });
}

export function toggleCombatTeamMember(
  state: CombatComparisonState,
  palId: number,
): CombatComparisonState {
  if (!palIds.has(palId)) return state;
  const current = state.selectedPalIds;
  const selectedPalIds = current.includes(palId)
    ? current.filter((id) => id !== palId)
    : current.length < COMBAT_COMPARISON_MAX_TEAM_SIZE
      ? [...current, palId]
      : current;
  return { ...state, selectedPalIds };
}

export function encodeCombatComparisonState(state: CombatComparisonState): string {
  const parsed = parseCombatComparisonState(state);
  if (!parsed) return "";
  const params = new URLSearchParams({
    v: "1",
    a: String(parsed.weights.attack),
    h: String(parsed.weights.health),
    d: String(parsed.weights.defense),
    scope: parsed.scope,
    context: parsed.encounter,
  });
  if (parsed.selectedPalIds.length > 0) params.set("team", parsed.selectedPalIds.join(","));
  return params.toString();
}

export function decodeCombatComparisonState(search: string): CombatComparisonState | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (params.get("v") !== "1") return null;
  const team = (params.get("team") ?? "").split(",").filter(Boolean).map(Number);
  return parseCombatComparisonState({
    version: 1,
    weights: { attack: params.get("a"), health: params.get("h"), defense: params.get("d") },
    scope: params.get("scope"),
    encounter: params.get("context"),
    selectedPalIds: team,
  });
}

export function buildCombatComparisonShareUrl(state: CombatComparisonState): string {
  const search = encodeCombatComparisonState(state);
  const base =
    typeof window === "undefined" ? "/planner/combat" : `${window.location.origin}/planner/combat`;
  return `${base}?${search}`;
}

export function formatStat(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function formatOrdinal(value: number): string {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) return `${value}th`;
  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

export function teamElementCoverage(selectedPalIds: readonly number[]): readonly string[] {
  const elements = new Set<string>();
  for (const id of selectedPalIds) {
    const pal = PALS.find((candidate) => candidate.id === id);
    if (!pal) continue;
    for (const element of elementsOf(pal.internalName)) elements.add(element);
  }
  return [...elements].sort();
}

export function personalPreset(id: string): CombatPreset | undefined {
  return PERSONAL_COMBAT_PRESETS.find((preset) => preset.id === id);
}
