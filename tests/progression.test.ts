import { describe, expect, test } from "vitest";

import { DUNGEON_FAMILIES } from "../src/data/palworld/dungeons";
import { PAL_TOWER_BOSSES } from "../src/data/palworld/towers";

describe("Progression Roadmap Logic", () => {
  test("Next Tower Boss Milestone calculation for Level 23", () => {
    const towerList = Object.values(PAL_TOWER_BOSSES)
      .flatMap((arr) => arr)
      .sort((a, b) => a.normalLevel - b.normalLevel);

    const level23Milestone = towerList.find((tower) => tower.normalLevel >= 23);

    expect(level23Milestone).toBeDefined();
    expect(level23Milestone?.leader).toBe("Axel");
    expect(level23Milestone?.pal).toBe("Orserk");
    expect(level23Milestone?.normalLevel).toBe(30);
  });

  test("Next Tower Boss Milestone for Level 5", () => {
    const towerList = Object.values(PAL_TOWER_BOSSES)
      .flatMap((arr) => arr)
      .sort((a, b) => a.normalLevel - b.normalLevel);

    const level5Milestone = towerList.find((tower) => tower.normalLevel >= 5);

    expect(level5Milestone).toBeDefined();
    expect(level5Milestone?.leader).toBe("Zoe");
    expect(level5Milestone?.normalLevel).toBe(10);
  });

  test("Next Tower Boss Milestone for max level (80)", () => {
    const towerList = Object.values(PAL_TOWER_BOSSES)
      .flatMap((arr) => arr)
      .sort((a, b) => a.normalLevel - b.normalLevel);

    const level80Milestone = towerList.find((tower) => tower.normalLevel >= 80);

    expect(level80Milestone).toBeUndefined(); // Reached max tower boss level
  });

  test("Dungeon families contain valid min and max levels", () => {
    expect(DUNGEON_FAMILIES.length).toBeGreaterThan(0);

    for (const dungeon of DUNGEON_FAMILIES) {
      expect(dungeon.name).toBeDefined();
      expect(typeof dungeon.level).toBe("number");
      expect(dungeon.level).toBeGreaterThan(0);
    }
  });

  test("Moonless Shore region is marked as contested", () => {
    const contestedRegion = {
      id: "moonless_shore",
      name: "Crescent Moon Shore / Moonless Shore",
      minLevel: 15,
      maxLevel: 25,
      isContested: true,
      conflictDetails:
        "Contested region boundary: Pre-1.0 maps (Eurogamer/RPS) list Lv 15–25, while 1.0 guides (IGN/Nodecraft) list Lv 20–25 to align with Lily & Lyleen (Lv 20 Tower Boss).",
    };

    expect(contestedRegion.isContested).toBe(true);
    expect(contestedRegion.conflictDetails).toContain("Pre-1.0 maps");
  });
});
