import { describe, expect, it } from "vitest";

import {
  combatCandidates,
  decodeCombatComparisonState,
  DEFAULT_COMBAT_COMPARISON_STATE,
  encodeCombatComparisonState,
  filterCombatCandidates,
  formatOrdinal,
  parseCombatComparisonState,
  toggleCombatTeamMember,
} from "@/lib/combat-comparison";

describe("combat comparison state", () => {
  it("keeps the zero-weight default unranked and alphabetical", () => {
    const candidates = combatCandidates(DEFAULT_COMBAT_COMPARISON_STATE.weights);
    expect(candidates.length).toBeGreaterThan(250);
    expect(candidates.every((candidate) => candidate.score === null)).toBe(true);
    expect(candidates.map((candidate) => candidate.pal.name)).toEqual(
      [...candidates.map((candidate) => candidate.pal.name)].sort((a, b) => a.localeCompare(b)),
    );
  });

  it("calculates a user-weighted percentile index only after a user provides weights", () => {
    const candidates = combatCandidates({ attack: 100, health: 0, defense: 0 });
    expect(candidates[0]?.score).not.toBeNull();
    expect(candidates[0]!.score).toBe(candidates[0]!.percentiles.attack);
    expect(candidates[0]!.score).toBeGreaterThanOrEqual(candidates[1]!.score ?? 0);
  });

  it("round-trips a compact share state without collection contents", () => {
    const state = {
      version: 1 as const,
      weights: { attack: 60, health: 20, defense: 20 },
      scope: "owned" as const,
      encounter: "raid" as const,
      selectedPalIds: [1, 2],
    };
    const decoded = decodeCombatComparisonState(encodeCombatComparisonState(state));
    expect(decoded).toEqual(state);
  });

  it("rejects incompatible share state and clamps untrusted values", () => {
    expect(decodeCombatComparisonState("v=2&a=100")).toBeNull();
    expect(
      parseCombatComparisonState({
        version: 1,
        weights: { attack: 9999, health: -12, defense: "bad" },
        scope: "invented",
        encounter: "pvp",
        selectedPalIds: [Number.NaN, -1, 999999],
      }),
    ).toEqual({
      version: 1,
      weights: { attack: 100, health: 0, defense: 0 },
      scope: "any",
      encounter: "all",
      selectedPalIds: [],
    });
  });

  it("formats roster percentiles with correct ordinal suffixes", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 72, 94].map(formatOrdinal)).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "12th",
      "13th",
      "21st",
      "22nd",
      "23rd",
      "72nd",
      "94th",
    ]);
  });

  it("caps team selection at five and lets a selected member be removed", () => {
    const candidates = combatCandidates(DEFAULT_COMBAT_COMPARISON_STATE.weights);
    const ids = candidates.slice(0, 6).map((candidate) => candidate.pal.id);
    let state = DEFAULT_COMBAT_COMPARISON_STATE;
    for (const id of ids) state = toggleCombatTeamMember(state, id);
    expect(state.selectedPalIds).toHaveLength(5);
    state = toggleCombatTeamMember(state, ids[0]!);
    expect(state.selectedPalIds).toHaveLength(4);
    expect(state.selectedPalIds).not.toContain(ids[0]!);
  });

  it("uses roster and encounter sets only as positive filters", () => {
    const candidates = combatCandidates(DEFAULT_COMBAT_COMPARISON_STATE.weights).slice(0, 3);
    const owned = new Set([candidates[0]!.pal.id]);
    const matches = filterCombatCandidates(
      candidates,
      { ...DEFAULT_COMBAT_COMPARISON_STATE, scope: "owned", encounter: "raid" },
      owned,
      new Set(),
      owned,
    );
    expect(matches.map((candidate) => candidate.pal.id)).toEqual([candidates[0]!.pal.id]);
  });
});
