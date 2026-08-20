// HAND-MAINTAINED acquisition channels.
//
// There is no "breed only" Pal in Palworld: every roster entry has at least one
// spawner or boss row, and all twelve previously-unexplained Pals carry
// CaptureRateCorrect 1.0. This file records how the non-obvious ones are actually
// obtained, with the source tier for each claim (T1 = datamine, T3 = guide site).
//
// Coverage caveat: DT_DungeonEnemySpawnDataTable keys through spawn-group IDs, so
// dungeon acquisition matched nothing in the datamine and is UNDER-COUNTED. A Pal
// with no channel resolves to "unknown", never "not obtainable".

export type AcquisitionChannel =
  | "wild_spawn"
  | "field_alpha"
  | "dungeon"
  | "tower_boss"
  | "raid_altar"
  | "raid_egg"
  | "meteor_event"
  | "quest_summon"
  | "sealed_realm"
  | "faction_base"
  | "pal_cage"
  | "fishing"
  | "unknown";

export const CHANNEL_LABEL: Record<AcquisitionChannel, string> = {
  wild_spawn: "Wild spawn",
  field_alpha: "Field alpha",
  dungeon: "Dungeon",
  tower_boss: "Tower boss",
  raid_altar: "Raid altar",
  raid_egg: "Raid egg drop",
  meteor_event: "Meteor event",
  quest_summon: "Quest summon",
  sealed_realm: "Sealed realm",
  faction_base: "Faction base",
  pal_cage: "Pal cage",
  fishing: "Fishing",
  unknown: "Acquisition unknown",
};

export interface ChannelEntry {
  channel: AcquisitionChannel;
  /** 1 = datamine, 3 = guide site. Shown so the reader can weight the claim. */
  sourceTier: 1 | 3;
  /** What the player actually has to do. */
  requirement: string;
  /** Extra caveats — capture guarantees, level, coordinates, timing. */
  notes?: string[];
  /** True when capture is guaranteed once the fight is won / HP is low enough. */
  guaranteedCapture?: boolean;
}

export const ACQUISITION_CHANNELS: Record<string, ChannelEntry> = {
  NightLady: {
    channel: "raid_altar",
    sourceTier: 1,
    requirement: "Summoning Altar — Bellanoir Slab",
  },
  NightLady_Dark: {
    channel: "raid_altar",
    sourceTier: 1,
    requirement: "Summoning Altar — Bellanoir Libero Slab (hard variant)",
  },
  KingBahamut_Dragon: {
    channel: "raid_altar",
    sourceTier: 1,
    requirement: "Summoning Altar — Blazamut Ryu Slab",
  },
  LegendDeer: {
    channel: "raid_altar",
    sourceTier: 3,
    requirement: "Hartalis Slab + Summoning Altar (Technology Lv33)",
    notes: [
      "Not catchable during the raid — defeating it drops a Huge Common Egg.",
      "Roughly a 10% chance the hatched Pal is an Alpha.",
      "An egg drop is loot, not breeding: Hartalis still cannot be bred.",
    ],
  },
  DarkMechaDragon: {
    channel: "raid_altar",
    sourceTier: 3,
    requirement: "Xenolord Slab + Summoning Altar",
    notes: [
      "Not catchable during the raid — defeating it drops a Huge Dark Egg.",
      "An egg drop is loot, not breeding: Xenolord still cannot be bred.",
    ],
  },
  BlackCentaur: {
    channel: "field_alpha",
    sourceTier: 3,
    requirement: "Field alpha at (446, 681), northern desert — Lv60",
    notes: [
      "Spawns paired with Paladius.",
      "Separable at night: Paladius sleeps, Necromus does not.",
    ],
  },
  SaintCentaur: {
    channel: "field_alpha",
    sourceTier: 1,
    requirement: "Field alpha in the same northern-desert arena — Lv60",
    notes: ["Spawns paired with Necromus."],
  },
  KingWhale: {
    channel: "quest_summon",
    sourceTier: 3,
    requirement:
      "Collect 4 Echobones at (122,-525), (356,-110), (-519,-548) and (-262,485) → craft the Echoing Flute → use it at the shrine",
    notes: ["Capture is guaranteed at 1 HP — its HP locks and cannot go lower."],
    guaranteedCapture: true,
  },
  WhiteAlienDragon: {
    channel: "meteor_event",
    sourceTier: 3,
    requirement: "Meteor events in the Astral Mountains, Dessicated Desert and Mount Obsidian",
    notes: ["Not guaranteed per event — shares its spawn pool with Xenovader and Selyne."],
  },
  FlowerPrince: {
    channel: "field_alpha",
    sourceTier: 3,
    requirement: 'Field alpha "Bewitching Lurker Dandilord" — Lv78',
    notes: ["Drops Rotmist Root."],
  },
  Mothman: {
    channel: "field_alpha",
    sourceTier: 3,
    requirement: 'Field alpha "Immortal Shade Silvance" — Lv78',
    notes: ["Drops Shinespore Root."],
  },
  YakushimaBoss001: {
    channel: "sealed_realm",
    sourceTier: 3,
    requirement: "Sealed Realm of Terraria, Eternal Summer Isle (-422, -795)",
    notes: [
      "Guaranteed alpha boss, roughly a 1 hour respawn.",
      "Directly capturable — no egg or summon step.",
    ],
    guaranteedCapture: true,
  },
  YakushimaBoss001_Small: {
    channel: "wild_spawn",
    sourceTier: 1,
    requirement: "Overworld spawn",
  },
};
