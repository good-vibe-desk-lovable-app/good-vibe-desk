import { describe, expect, it } from "vitest";

import { acquisitionOf } from "../acquisition";
import {
  PAL_TOWER_BOSSES,
  TOWER_PROVENANCE,
  TOWER_SOURCE_EXCLUSIONS,
  towerBossesOf,
} from "@/data/palworld/towers";

describe("two-source tower acquisition evidence", () => {
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

  it("retains two source URLs on each record and does not flatten the source kind", () => {
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

  it("retains source-only pairs as exclusions and exposes tower evidence independently", () => {
    expect(TOWER_SOURCE_EXCLUSIONS).toMatchObject({
      game8Only: ["Zenara and Astralym"],
      palworldWikiOnly: [],
      levelDisagreements: [],
    });

    const grizzbolt = acquisitionOf("ElecPanda");
    expect(grizzbolt.towerBoss).toBe(true);
    expect(grizzbolt.towerBosses[0].sourceKind).toBe("wiki-corroborated");
  });
});
