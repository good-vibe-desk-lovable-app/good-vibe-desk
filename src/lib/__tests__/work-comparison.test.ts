import { describe, expect, it } from "vitest";

import { PALS } from "@/data/palworld";
import type { EvidenceRecord } from "@/data/palworld/knowledge";
import type { WorkSuitabilityKnowledge } from "@/data/palworld/knowledgeWorkSuitability";
import {
  DEFAULT_WORK_COMPARISON_STATE,
  decodeWorkComparisonState,
  encodeWorkComparisonState,
  parseWorkComparisonState,
  workCandidates,
} from "@/lib/work-comparison";

const lamball = PALS.find((pal) => pal.internalName === "SheepBall");
const gumossFlower = PALS.find((pal) => pal.internalName === "PlantSlime_Flower");
if (!lamball || !gumossFlower) throw new Error("Expected fixture Pals are absent from the roster.");

const lamballProgression: EvidenceRecord<WorkSuitabilityKnowledge> = {
  id: "work-suitability:SheepBall",
  data: {
    internalName: "SheepBall",
    sourceId: "sheepball",
    levels: [
      { handiwork: 1, transporting: 1, farming: 1 },
      { handiwork: 1, transporting: 1, farming: 2 },
      { handiwork: 2, transporting: 1, farming: 2 },
      { handiwork: 2, transporting: 2, farming: 2 },
      { handiwork: 3, transporting: 3, farming: 3 },
    ],
  },
  version: { gameVersion: "v1.0.3", emittedAt: "2026-08-22T00:00:00Z" },
  sources: [],
  provenance: [],
};

describe("work comparison", () => {
  it("uses the source-backed per-Pal condensation order instead of guessing tied work levels", () => {
    const candidates = workCandidates(
      { version: 1, work: "handiwork", condensationRank: 2, scope: "any" },
      [lamballProgression],
    );
    const candidate = candidates.find((entry) => entry.pal.id === lamball.id);
    expect(candidate).toMatchObject({ level: 2, knownProgression: true });
  });

  it("does not present an unsourced rank-1 progression for Gumoss Flower", () => {
    const rankZero = workCandidates(
      { version: 1, work: "planting", condensationRank: 0, scope: "any" },
      [lamballProgression],
    );
    expect(rankZero.find((entry) => entry.pal.id === gumossFlower.id)).toMatchObject({
      level: 1,
      knownProgression: false,
    });

    const rankOne = workCandidates(
      { version: 1, work: "planting", condensationRank: 1, scope: "any" },
      [lamballProgression],
    );
    expect(rankOne.find((entry) => entry.pal.id === gumossFlower.id)).toBeUndefined();
  });

  it("keeps no-work-selection browse mode unranked", () => {
    const candidates = workCandidates(DEFAULT_WORK_COMPARISON_STATE, [lamballProgression]);
    expect(candidates.every((candidate) => candidate.level === null)).toBe(true);
  });

  it("round-trips a validated share configuration and rejects unknown work keys", () => {
    const state = {
      version: 1 as const,
      work: "mining" as const,
      condensationRank: 4,
      scope: "owned" as const,
    };
    expect(decodeWorkComparisonState(`?${encodeWorkComparisonState(state)}`)).toEqual(state);
    expect(
      parseWorkComparisonState({ version: 1, work: "not-real", condensationRank: 99, scope: "no" }),
    ).toEqual({
      version: 1,
      work: null,
      condensationRank: 4,
      scope: "any",
    });
  });
});
