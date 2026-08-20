import { describe, expect, it } from "vitest";

import { acquisitionOf } from "../acquisition";
import { NON_ROSTER_RAID_CARDS, PAL_RAID_BOSSES, raidBossesOf } from "@/data/palworld/raid";
import {
  PAL_TOWER_BOSSES,
  TOWER_PROVENANCE,
  TOWER_SOURCE_EXCLUSIONS,
  towerBossesOf,
} from "@/data/palworld/towers";

describe("independent raid and tower acquisition evidence", () => {
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
  });

  it("retains two source URLs on each tower record and does not flatten the source kind", () => {
    const grizzbolt = towerBossesOf("ElecPanda");
    expect(grizzbolt).toHaveLength(1);
    expect(grizzbolt[0]).toMatchObject({
      tower: "Tower of the Rayne Syndicate",
      leader: "Zoe",
      pal: "Grizzbolt",
      normalLevel: 10,
      hardModeLevel: 55,
      sourceTier: 3,
      sourceKind: "wiki-corroborated",
    });
    expect(grizzbolt[0].sources).toEqual([
      { name: "Palworld Wiki", url: "https://palworld.wiki.gg/wiki/Tower" },
      { name: "Game8", url: "https://game8.co/games/Palworld/archives/440436" },
    ]);
  });

  it("retains source-only tower pairs as exclusions", () => {
    expect(TOWER_SOURCE_EXCLUSIONS).toMatchObject({
      game8Only: ["Zenara and Astralym"],
      palworldWikiOnly: [],
      levelDisagreements: [],
    });
  });

  it("preserves all PalDB Summoning Altar encounter variants for joined roster Pals", () => {
    expect(Object.keys(PAL_RAID_BOSSES).sort()).toEqual([
      "DarkMechaDragon",
      "KingBahamut_Dragon",
      "LegendDeer",
      "NightLady",
      "NightLady_Dark",
    ]);
    expect(Object.values(PAL_RAID_BOSSES).flat()).toHaveLength(9);
    expect(raidBossesOf("NightLady_Dark").map((entry) => entry.level)).toEqual([45, 80]);
  });

  it("retains PalDB raid cards that do not correspond to a player roster entry", () => {
    expect(NON_ROSTER_RAID_CARDS.map((entry) => entry.sourceId)).toEqual([
      "RAID_YakushimaBoss002",
      "RAID_YakushimaBoss002_2",
    ]);
  });

  it("exposes raid and tower evidence as separate flags without channel or provenance bleed", () => {
    const bellanoir = acquisitionOf("NightLady");
    expect(bellanoir.channel).toBe("raid_altar");
    expect(bellanoir.raidBoss).toBe(true);
    expect(bellanoir.raidBosses[0]).toMatchObject({
      sourceId: "RAID_NightLady",
      name: "Eclipsed Siren Bellanoir",
      level: 35,
    });
    expect(bellanoir.towerBoss).toBe(false);
    expect(bellanoir.towerBosses).toEqual([]);

    const grizzbolt = acquisitionOf("ElecPanda");
    expect(grizzbolt.towerBoss).toBe(true);
    expect(grizzbolt.towerBosses[0].sourceKind).toBe("wiki-corroborated");
    expect(grizzbolt.raidBoss).toBe(false);
    expect(grizzbolt.raidBosses).toEqual([]);

    const lamball = acquisitionOf("SheepBall");
    expect(lamball.raidBoss).toBe(false);
    expect(lamball.towerBoss).toBe(false);
  });
});
