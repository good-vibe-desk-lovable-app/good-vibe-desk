import { describe, expect, it } from "vitest";

import { acquisitionOf } from "../acquisition";
import { DUNGEON_FAMILIES, PAL_DUNGEON_BOSSES, dungeonBossesOf } from "@/data/palworld/dungeons";
import { NON_ROSTER_RAID_CARDS, PAL_RAID_BOSSES, raidBossesOf } from "@/data/palworld/raid";
import {
  PAL_TOWER_BOSSES,
  TOWER_PROVENANCE,
  TOWER_SOURCE_EXCLUSIONS,
  towerBossesOf,
} from "@/data/palworld/towers";

describe("independent raid, dungeon, and tower acquisition evidence", () => {
  it("retains exactly the eight corroborated tower Pals with explicit provenance", () => {
    expect(Object.keys(PAL_TOWER_BOSSES).sort()).toEqual([
      "BlackGriffon",
      "BlueSkyDragon",
      "ElecPanda",
      "Horus",
      "LilyQueen",
      "MoonQueen",
      "SnowTigerBeastman",
      "ThunderDragonMan",
    ]);
    expect(TOWER_PROVENANCE).toMatchObject({
      sourceTier: 3,
      sourceKind: "wiki-corroborated",
      sourceCount: 2,
      entryCount: 8,
    });
    expect(TOWER_SOURCE_EXCLUSIONS).toMatchObject({
      game8Only: ["Zenara and Astralym"],
      palworldWikiOnly: [],
      levelDisagreements: [],
    });
    expect(towerBossesOf("ElecPanda")[0].sources).toEqual([
      { name: "Palworld Wiki", url: "https://palworld.wiki.gg/wiki/Tower" },
      { name: "Game8", url: "https://game8.co/games/Palworld/archives/440436" },
    ]);
  });

  it("preserves all PalDB Summoning Altar encounters and non-roster cards", () => {
    expect(Object.keys(PAL_RAID_BOSSES).sort()).toEqual([
      "DarkMechaDragon",
      "KingBahamut_Dragon",
      "LegendDeer",
      "NightLady",
      "NightLady_Dark",
    ]);
    expect(Object.values(PAL_RAID_BOSSES).flat()).toHaveLength(9);
    expect(raidBossesOf("NightLady_Dark").map((entry) => entry.level)).toEqual([45, 80]);
    expect(NON_ROSTER_RAID_CARDS.map((entry) => entry.sourceId)).toEqual([
      "RAID_YakushimaBoss002",
      "RAID_YakushimaBoss002_2",
    ]);
  });

  it("retains the hard-validated PalDB Dungeons source shape and exact joins", () => {
    expect(DUNGEON_FAMILIES).toHaveLength(14);
    expect(DUNGEON_FAMILIES.every((family) => family.bossCount > 0)).toBe(true);
    expect(Object.values(PAL_DUNGEON_BOSSES).flat()).toHaveLength(190);
    expect(Object.keys(PAL_DUNGEON_BOSSES)).toHaveLength(150);
    expect(dungeonBossesOf("Bastet_Ice")).toMatchObject([
      {
        sourceId: "BOSS_Bastet_Ice",
        dungeon: "Astral Mountains Cavern",
        sourceUrl: "https://paldb.cc/en/Astral_Mountains_Cavern",
      },
    ]);
  });

  it("keeps raid, dungeon, and tower flags independent without changing established channels", () => {
    const bellanoir = acquisitionOf("NightLady");
    expect(bellanoir.channel).toBe("raid_altar");
    expect(bellanoir.raidBoss).toBe(true);
    expect(bellanoir.dungeonBossSourceCount).toBe(0);
    expect(bellanoir.towerBoss).toBe(false);

    const mauCryst = acquisitionOf("Bastet_Ice");
    expect(mauCryst.channel).toBe("dungeon");
    expect(mauCryst.raidBoss).toBe(false);
    expect(mauCryst.dungeonBossSourceCount).toBe(1);
    expect(mauCryst.towerBoss).toBe(false);

    const grizzbolt = acquisitionOf("ElecPanda");
    expect(grizzbolt.raidBoss).toBe(false);
    expect(grizzbolt.dungeonBossSourceCount).toBe(0);
    expect(grizzbolt.towerBoss).toBe(true);
    expect(grizzbolt.towerBosses[0].sourceKind).toBe("wiki-corroborated");

    const eyeOfCthulhu = acquisitionOf("YakushimaBoss001");
    expect(eyeOfCthulhu.channel).toBe("sealed_realm");
    expect(eyeOfCthulhu.dungeonBossSourceCount).toBe(1);
  });
});
