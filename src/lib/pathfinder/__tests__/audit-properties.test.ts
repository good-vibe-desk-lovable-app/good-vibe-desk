import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { PALS, PASSIVES, palById } from "@/data/palworld";
import { deps } from "../pathfinder";
import { search } from "../core";
import type { CollectionEntry } from "../types";

const palIds = PALS.map((p) => p.id);
const passiveIds = PASSIVES.map((p) => p.id);

describe("pathfinder property invariants", () => {
  it("holds invariants across random collections", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            palId: fc.constantFrom(...palIds),
            passiveIds: fc.uniqueArray(fc.constantFrom(...passiveIds), {
              minLength: 0,
              maxLength: 4,
            }),
          }),
          { minLength: 2, maxLength: 6 },
        ),
        fc.constantFrom(...palIds),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (rows, targetId, keepRatio) => {
          const collection: CollectionEntry[] = rows.map((row, i) => ({
            instanceId: `inst-${i}`,
            palId: row.palId,
            gender: "unknown",
            passiveIds: row.passiveIds,
          }));
          const desiredSources = collection
            .map((e) => e.instanceId)
            .filter((_, i) => (i + 1) / collection.length > keepRatio || i === 0);

          const res = search(deps, targetId, collection, desiredSources, { timeoutMs: 2000 });

          res.steps.forEach((step, i) => {
            expect(step.index).toBe(i);
            expect(palById.has(step.parent1)).toBe(true);
            expect(palById.has(step.parent2)).toBe(true);
            expect(palById.has(step.child)).toBe(true);
          });

          // No step breeds one original collection Pal with itself.
          for (const step of res.steps) {
            if (step.carriedSources.length === 2) {
              expect(step.carriedSources[0]).not.toBe(step.carriedSources[1]);
            }
          }

          if (res.status === "ok") {
            for (const id of res.coveredSources) expect(desiredSources).toContain(id);
            expect(res.missingSources).toEqual([]);
          }

          expect(res.elapsedMs).toBeLessThanOrEqual(2600);
        },
      ),
      { numRuns: 50 },
    );
  }, 180_000);
});
