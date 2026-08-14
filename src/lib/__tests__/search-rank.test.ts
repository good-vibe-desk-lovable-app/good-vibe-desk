import { describe, expect, it } from "vitest";

import {
  MAX_PAL_RANK,
  RANK_NO_MATCH,
  normaliseQuery,
  rankPal,
  rankPassive,
  searchPals,
  type RankablePal,
} from "../search-rank";
import { PALS } from "../../data/palworld/pals";

function pal(name: string, palDexNo = 1, internalName = name): RankablePal {
  return { name, palDexNo, internalName };
}

describe("rankPal — band contract", () => {
  it("scores exact, prefix, substring, dex and internal-name hits in that order", () => {
    expect(rankPal(pal("Vanwyrm"), "vanwyrm")).toBe(0);
    expect(rankPal(pal("Vanwyrm"), "van")).toBe(1);
    expect(rankPal(pal("Lovander"), "van")).toBe(2);
    expect(rankPal(pal("Chikipi", 1), "1")).toBe(3);
    expect(rankPal(pal("Astegon", 99, "BlackMetalDragon"), "blackmetal")).toBe(4);
    expect(rankPal(pal("Chikipi", 99, "ChickenPal"), "zzz")).toBe(RANK_NO_MATCH);
  });

  it("treats an empty query as 'everything matches equally'", () => {
    expect(rankPal(pal("Anything"), "")).toBe(0);
  });

  it("uses the cached lowercase name when one is supplied", () => {
    // PalPicker lowercases all ~300 names once at init instead of per keystroke.
    // The cached value is authoritative, so a deliberately wrong cache proves
    // the parameter is actually consulted rather than silently ignored.
    expect(rankPal(pal("Vanwyrm"), "van", "vanwyrm")).toBe(1);
    expect(rankPal(pal("Vanwyrm"), "van", "zzzz")).toBe(RANK_NO_MATCH);
  });

  it("never returns a rank above MAX_PAL_RANK for a match", () => {
    for (const p of PALS) {
      const r = rankPal(p, "a");
      expect(r === RANK_NO_MATCH || (r >= 0 && r <= MAX_PAL_RANK)).toBe(true);
    }
  });
});

describe("rankPassive — band contract", () => {
  const swift = { name: "Swift", description: "Movement Speed +30%" };
  const legend = { name: "Legend", description: "Attack and Defense +20%, Movement Speed +15%" };

  it("scores exact, prefix, substring and description hits in that order", () => {
    expect(rankPassive(swift, "swift")).toBe(0);
    expect(rankPassive(swift, "swi")).toBe(1);
    expect(rankPassive({ name: "Nimble", description: "" }, "imbl")).toBe(2);
    expect(rankPassive(legend, "movement")).toBe(3);
    expect(rankPassive(swift, "zzz")).toBe(RANK_NO_MATCH);
  });

  it("scores a missing passive as no-match, except under an empty query", () => {
    // An id the dataset no longer resolves stays visible when nothing is typed,
    // so a stale collection entry is never silently hidden from its owner.
    expect(rankPassive(undefined, "swi")).toBe(RANK_NO_MATCH);
    expect(rankPassive(undefined, "")).toBe(0);
  });
});

describe("normaliseQuery", () => {
  it("trims and lowercases, because every rank compares lowercase", () => {
    expect(normaliseQuery("  VaN  ")).toBe("van");
    expect(normaliseQuery("   ")).toBe("");
  });
});

describe("searchPals — ordering against the real roster", () => {
  it("puts Vanwyrm first for the query 'van'", () => {
    // The regression this ranking was written for. Before it, a plain
    // .includes() plus an alphabetical sort ordered "van" as
    // Lovander, Silvance, Vanwyrm — the exact species being searched for
    // came third, behind two names that merely contain the letters.
    const rows = searchPals(PALS, "van");
    expect(rows[0].name).toBe("Vanwyrm");
  });

  it("ranks every prefix match above every substring match for 'va'", () => {
    // NOTE: 'va' does NOT put Vanwyrm first, and must not be asserted to.
    // Vaelet, Valentail, Vanwyrm and Vanwyrm Cryst all start with "va", so
    // they share rank 1 and the alphabetical tiebreak legitimately wins.
    // What the ranking guarantees is the BAND ordering below.
    const rows = searchPals(PALS, "va").map((p) => p.name);
    const prefixed = rows.filter((n) => n.toLowerCase().startsWith("va"));
    const rest = rows.filter((n) => !n.toLowerCase().startsWith("va"));

    expect(prefixed.length).toBeGreaterThan(0);
    expect(rest.length).toBeGreaterThan(0);

    const lastPrefixed = rows.indexOf(prefixed[prefixed.length - 1]);
    const firstRest = rows.indexOf(rest[0]);
    expect(lastPrefixed).toBeLessThan(firstRest);

    // Concretely: the species called Vanwyrm outranks every name that merely
    // contains "va" somewhere in the middle.
    expect(rows.indexOf("Vanwyrm")).toBeLessThan(rows.indexOf("Cattiva"));
    expect(rows.indexOf("Vanwyrm")).toBeLessThan(rows.indexOf("Lovander"));
    expect(rows.indexOf("Vanwyrm")).toBeLessThan(rows.indexOf("Xenovader"));
  });

  it("sorts alphabetically within a rank band", () => {
    const rows = searchPals(PALS, "va").map((p) => p.name);
    const prefixed = rows.filter((n) => n.toLowerCase().startsWith("va"));
    const sorted = [...prefixed].sort((a, b) => a.localeCompare(b));
    expect(prefixed).toEqual(sorted);
  });

  it("finds a Pal by its internal name when the display name differs", () => {
    // Astegon is BlackMetalDragon internally; the app must find it either way.
    const rows = searchPals(PALS, "blackmetaldragon");
    expect(rows.some((p) => p.name === "Astegon")).toBe(true);
  });

  it("keeps variants as distinct rows rather than collapsing them", () => {
    // 85 variants share a Paldeck number with their base form. Search must
    // never merge them — that corruption is invisible once it happens.
    const rows = searchPals(PALS, "vanwyrm").map((p) => p.name);
    expect(rows).toContain("Vanwyrm");
    expect(rows).toContain("Vanwyrm Cryst");
  });

  it("returns the head of the roster in dataset order when the query is empty", () => {
    const rows = searchPals(PALS, "", { limit: 5 });
    expect(rows.map((p) => p.id)).toEqual(PALS.slice(0, 5).map((p) => p.id));
  });

  it("applies the limit after ranking, not before", () => {
    const rows = searchPals(PALS, "a", { limit: 3 });
    expect(rows).toHaveLength(3);
    const unlimited = searchPals(PALS, "a");
    expect(rows.map((p) => p.name)).toEqual(unlimited.slice(0, 3).map((p) => p.name));
  });

  it("drops non-matching rows entirely", () => {
    expect(searchPals(PALS, "zzzzqqq")).toHaveLength(0);
  });
});
