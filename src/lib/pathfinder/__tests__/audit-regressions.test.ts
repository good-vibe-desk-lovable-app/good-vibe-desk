import { describe, expect, it } from "vitest";

import { parseCollectionFileDetailed, MAX_ENTRIES } from "@/lib/collection";
import { deps } from "../pathfinder";
import { search } from "../core";

describe("collection import hardening (audit regressions)", () => {
  it("(a) repairs duplicate instanceIds and the repaired collection still solves", () => {
    const parsed = parseCollectionFileDetailed({
      version: 1,
      entries: [
        { instanceId: "DUP", palId: 171, gender: "unknown", passiveIds: ["Rare"] },
        { instanceId: "DUP", palId: 70, gender: "unknown", passiveIds: ["Witch"] },
      ],
    });

    expect(parsed).not.toBeNull();
    const entries = parsed!.entries;
    expect(entries).toHaveLength(2);
    expect(new Set(entries.map((e) => e.instanceId)).size).toBe(2);
    expect(parsed!.notes).toHaveLength(1);

    const res = search(
      deps,
      37,
      entries,
      entries.map((e) => e.instanceId),
      { timeoutMs: 5000 },
    );
    expect(res.status).toBe("ok");
    expect(res.coveredSources).toHaveLength(2);
  });

  it("(b) caps the entry count", () => {
    const entries = Array.from({ length: 700 }, (_, i) => ({
      instanceId: `id-${i}`,
      palId: 1,
      gender: "unknown" as const,
      passiveIds: [] as string[],
    }));
    const parsed = parseCollectionFileDetailed({ version: 1, entries });
    expect(parsed).not.toBeNull();
    expect(parsed!.entries).toHaveLength(MAX_ENTRIES);
    expect(parsed!.notes.length).toBeGreaterThanOrEqual(1);
  });

  it("(c) regenerates oversized instanceIds", () => {
    const parsed = parseCollectionFileDetailed({
      version: 1,
      entries: [{ instanceId: "x".repeat(500), palId: 1, gender: "unknown", passiveIds: [] }],
    });
    expect(parsed).not.toBeNull();
    const id = parsed!.entries[0].instanceId;
    expect(id).not.toBe("x".repeat(500));
    expect(id.length).toBeLessThanOrEqual(64);
    expect(parsed!.notes.length).toBeGreaterThanOrEqual(1);
  });

  it("(d) rejects the whole file on an unknown palId", () => {
    const parsed = parseCollectionFileDetailed({
      version: 1,
      entries: [{ instanceId: "a", palId: 999999, gender: "unknown", passiveIds: [] }],
    });
    expect(parsed).toBeNull();
  });

  it("(e) drops unknown passives without failing the import", () => {
    const parsed = parseCollectionFileDetailed({
      version: 1,
      entries: [
        { instanceId: "a", palId: 1, gender: "unknown", passiveIds: ["Rare", "NotARealPassive"] },
      ],
    });
    expect(parsed).not.toBeNull();
    expect(parsed!.entries[0].passiveIds).toEqual(["Rare"]);
  });
});
