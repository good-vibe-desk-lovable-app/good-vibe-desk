import { describe, expect, it } from "vitest";

import { MAX_EXPECTED_ATTEMPTS, expectedAttempts, stepSuccessProbability } from "../inheritance";

describe("inheritance model", () => {
  it("returns certainty when nothing is desired", () => {
    expect(stepSuccessProbability({ parentPassiveCount: 8, desiredCount: 0 })).toBe(1);
    expect(expectedAttempts({ parentPassiveCount: 8, desiredCount: 0 })).toBe(1);
  });

  it("is non-increasing as more passives are desired", () => {
    for (let parents = 0; parents <= 8; parents++) {
      for (let d = 1; d <= 4; d++) {
        const a = stepSuccessProbability({ parentPassiveCount: parents, desiredCount: d - 1 });
        const b = stepSuccessProbability({ parentPassiveCount: parents, desiredCount: d });
        expect(b).toBeLessThanOrEqual(a);
      }
    }
  });

  it("is non-increasing as parents carry more passives", () => {
    for (let d = 1; d <= 4; d++) {
      for (let parents = 1; parents <= 8; parents++) {
        const a = stepSuccessProbability({ parentPassiveCount: parents - 1, desiredCount: d });
        const b = stepSuccessProbability({ parentPassiveCount: parents, desiredCount: d });
        expect(b).toBeLessThanOrEqual(a);
      }
    }
  });

  it("respects bounds", () => {
    for (let parents = 0; parents <= 12; parents++) {
      for (let d = 0; d <= 6; d++) {
        const p = stepSuccessProbability({ parentPassiveCount: parents, desiredCount: d });
        expect(p).toBeGreaterThan(0);
        expect(p).toBeLessThanOrEqual(1);
        const e = expectedAttempts({ parentPassiveCount: parents, desiredCount: d });
        expect(e).toBeGreaterThanOrEqual(1);
        expect(e).toBeLessThanOrEqual(MAX_EXPECTED_ATTEMPTS);
      }
    }
  });
});
