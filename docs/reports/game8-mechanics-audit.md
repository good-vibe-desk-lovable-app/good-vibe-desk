# Game8 Game Mechanics Hub Audit & Mechanics Analysis Report

**Date:** September 2026
**Scope:** Research audit of Game8's Game Mechanics Guides Hub (`https://game8.co/games/Palworld/archives/439875` and `https://game8.co/games/Palworld/archives/439570`), assessment of the ten unobtainable mechanics in `src/data/palworld/modelGaps.ts`, source tier classification, and comparative check of GameWith and IGN mechanics hubs.

---

## Executive Summary

This research audit evaluates the Game Mechanics Guides hub published on Game8, enumerates its entire guide inventory, audits its published content against the ten unobtainable mechanics recorded in `src/data/palworld/modelGaps.ts`, assesses source tiers, and checks equivalent mechanics hubs on GameWith and IGN.

Key conclusion: Game8 publishes qualitative guides, empirical sample observations, and standard element charts, but does **not** publish versioned datamined formulas or game-code extractions. All ten mechanics gaps in `src/data/palworld/modelGaps.ts` remain correctly classified as unresolved or limited, and Game8 content remains strictly `community` tier.

---

## 1. Game8 Game Mechanics Guides Hub Inventory

Starting at `https://game8.co/games/Palworld/archives/439875` (Attack Stat Explained) and `https://game8.co/games/Palworld/archives/439570` (Game Mechanics Explained), Game8 links to a dedicated sub-network of 21 game mechanics, stat explanations, system guides, and calculator tools.

Below is the complete enumeration of the Game Mechanics Guides hub:

| # | Guide Title | Canonical URL | Topic / Scope |
|---|---|---|---|
| 1 | Game Mechanics Explained | `https://game8.co/games/Palworld/archives/439570` | Central Mechanics Hub Page |
| 2 | Element Type Matchup Chart | `https://game8.co/games/Palworld/archives/439611` | 9-Element Advantage & Weakness Matrix |
| 3 | Combat Mechanics | `https://game8.co/games/Palworld/archives/440080` | Basic Combat Overview & General Tips |
| 4 | Day and Night Cycle | `https://game8.co/games/Palworld/archives/440087` | Night Spawns, Sleep Mechanics & Temperature Shifts |
| 5 | Crafting Guide and Best Crafting Pals | `https://game8.co/games/Palworld/archives/440105` | Crafting Mechanics & Workbench Suitability |
| 6 | Rarity Explained | `https://game8.co/games/Palworld/archives/441959` | Item & Schematic Rarity Tiering |
| 7 | List of Sicknesses and Injuries | `https://game8.co/games/Palworld/archives/440244` | Sanity/Injury Debuffs, Medical Remedies & Patch Changes |
| 8 | Guilds Explained: Should You Join a Guild? | `https://game8.co/games/Palworld/archives/445020` | Guild Co-op Rules & Base Sharing |
| 9 | Dungeon Guide | `https://game8.co/games/Palworld/archives/445253` | Cavern Dungeons, Boss Rooms & Timers |
| 10 | STAB Explained | `https://game8.co/games/Palworld/archives/445735` | Same-Type Attack Bonus Testing & Multipliers |
| 11 | Attack Stat Explained | `https://game8.co/games/Palworld/archives/439875` | Player & Pal Attack Stat Overview |
| 12 | HP Stat Explained | `https://game8.co/games/Palworld/archives/446008` | Life Gauge, Shields, Health Items & Healing Skills |
| 13 | Defense Stat Explained | `https://game8.co/games/Palworld/archives/445947` | Player & Pal Armor, Defense Mechanics & Damage Reduction |
| 14 | Weight Explained | `https://game8.co/games/Palworld/archives/447262` | Inventory Carry Weight, Encumbrance & Boost Passives |
| 15 | Work Speed Explained | `https://game8.co/games/Palworld/archives/447263` | Task Speed Multipliers & Base Monitoring Stand Settings |
| 16 | Stamina Explained | `https://game8.co/games/Palworld/archives/447315` | Stamina Bar Drain (Dodge, Sprint, Gliding, Swimming) |
| 17 | Super Effective and Resistance Mechanics Explained | `https://game8.co/games/Palworld/archives/445883` | Elemental Damage Multipliers (2x, 4x, 0.5x, 1x) |
| 18 | Stats and Potentials Explained | `https://game8.co/games/Palworld/archives/444036` | Individual Values (IVs), Ability Glasses & Base Stats |
| 19 | Palworld IV Stat Calculator | `https://game8.co/games/Palworld/archives/445888` | Interactive Web IV Calculation Tool |
| 20 | IV Breeding Guide | `https://game8.co/games/Palworld/archives/444315` | Empirical Breeding Inheritance Observations |
| 21 | Trust Mechanic Explained | `https://game8.co/games/Palworld/archives/531753` | Pal Trust / Bond Mechanics |

---

## 2. Audit of the Ten Unobtainable Mechanics (`modelGaps.ts`)

`src/data/palworld/modelGaps.ts` tracks ten unresolved or limited game mechanics. Each mechanic was audited against Game8's Game Mechanics hub:

### 1. Capture Probability Formula (`capture/formula — capture probability formula`)
- **Relevant Content Published?** NO mathematical formula published. Game8 provides qualitative capture tips (reduce Pal HP, throw higher-tier Pal Spheres, upgrade Lifmunk Effigy levels, attack from behind for "Back Bonus", apply status ailments like electrified/frozen).
- **Exact Formula / Values:** None.
- **Page URL:** `https://game8.co/games/Palworld/archives/439683` ("How to Catch Pals"), `https://game8.co/games/Palworld/archives/439570`
- **Source Citation:** None cited.
- **Source Tier:** `community` (qualitative gameplay advice).

### 2. Damage Formula (`team planner — encounter-specific combat and PvP` / damage formula)
- **Relevant Content Published?** NO complete damage formula published. Game8 explains individual factors separately:
  - Element Effectiveness: Super Effective = 2x, Dual Strong/Strong = 4x, Not Very Effective = 0.5x, Neutral = 1x (`445883`).
  - STAB: ~20% damage boost ("Based on our testing, STAB increases all damage by around 20%") (`445735`).
- **Exact Formula / Values:** No mathematical equation combining Attack, Defense, Move Power, Level, STAB, and Element is provided.
- **Page URLs:** `https://game8.co/games/Palworld/archives/440080`, `https://game8.co/games/Palworld/archives/445883`, `https://game8.co/games/Palworld/archives/445735`, `https://game8.co/games/Palworld/archives/439875`, `https://game8.co/games/Palworld/archives/445947`
- **Source Citation:** STAB explicitly cites Game8 in-house empirical testing ("Based on our testing"). Element multipliers cite no source.
- **Source Tier:** `community`

### 3. Experience Award and Level Curve (`progression/experience`)
- **Relevant Content Published?** NO formulas or level curve tables published. Game8 gives general leveling advice (capture 10 of each Pal species for capture bonus XP, fight Alpha/Tower bosses, clear dungeons).
- **Exact Formula / Values:** None. No level XP requirement array (1-55 or 1-80) or activity XP formulas.
- **Page URLs:** `https://game8.co/games/Palworld/archives/440118`, `https://game8.co/games/Palworld/archives/447702`, `https://game8.co/games/Palworld/archives/439570`
- **Source Citation:** None.
- **Source Tier:** `community`

### 4. IV-to-Stat Formula (`stats/iv — IV-to-stat potential formula`)
- **Relevant Content Published?** Explains IV concepts in text and embeds an interactive web calculator, but does NOT publish the written mathematical formula.
- **Exact Formula / Values:** States IVs range from 0 to 100 (0% to 30% stat bonus). The exact equation relating base stat, level, IV, soul upgrades, condenser ranks, and passives is omitted from the guide text.
- **Page URLs:** `https://game8.co/games/Palworld/archives/444036`, `https://game8.co/games/Palworld/archives/445888`, `https://game8.co/games/Palworld/archives/444315`
- **Source Citation:** None cited in text.
- **Source Tier:** `community`

### 5. Breeding Time (`breeding/incubation — breeding time`)
- **Relevant Content Published?** NO breeding time or tick formulas published. Explains Breeding Ranch requirements (Level 19, Cake) and breeding steps.
- **Exact Formula / Values:** None.
- **Page URLs:** `https://game8.co/games/Palworld/archives/440530`, `https://game8.co/games/Palworld/archives/444315`
- **Source Citation:** None.
- **Source Tier:** `community`

### 6. Hunger and SAN Depletion Rates (`survival/depletion — hunger and SAN depletion rates`)
- **Relevant Content Published?** NO metabolic or SAN depletion rate formulas published. Game8 publishes status ailment stat penalties updated in patch notes (e.g. Starving: Atk/Def/Work Speed -20%; Overfull: hunger loss rate +50%; Depressed: Work Speed -20%).
- **Exact Formula / Values:** Patch note ailment debuffs listed, but base hunger/SAN decay ticks per minute or task consumption values are absent.
- **Page URLs:** `https://game8.co/games/Palworld/archives/440244`, `https://game8.co/games/Palworld/archives/440105`, `https://game8.co/games/Palworld/archives/439570`
- **Source Citation:** Patch notes (official patch updates).
- **Source Tier:** `community` (guide summarizing patch notes).

### 7. Incubation Temperature Multiplier (`breeding/incubation — incubation temperature multiplier`)
- **Relevant Content Published?** NO exact numeric speed scalars/multipliers published (+100%, +50%, -50%). Game8 publishes a table of Egg Default Comfort Levels in Day and Night (e.g. Scorching: Day 50% "a little cold", Night 0% "very cold"; Damp: Day 50% "just a little hot", Night 50% "just a little cold").
- **Exact Formula / Values:** In-game UI percentage comfort readouts (100%, 50%, 0%) are reported, but underlying tick speed multipliers are unquantified.
- **Page URLs:** `https://game8.co/games/Palworld/archives/440059`, `https://game8.co/games/Palworld/archives/439570`
- **Source Citation:** None (observed in-game UI behavior).
- **Source Tier:** `community`

### 8. Element Effectiveness Matrix (`combat/element effectiveness matrix`)
- **Relevant Content Published?** YES, publishes canonical 9-element matchup chart and discrete effectiveness multipliers:
  - Super Effective: **2x**
  - Dual Advantage (Strong / Strong): **4x**
  - Regular Damage: **1x**
  - Not Very Effective: **0.5x**
- **Exact Formula / Values:** Multipliers: 2x, 4x, 0.5x, 1x.
- **Page URLs:** `https://game8.co/games/Palworld/archives/439611`, `https://game8.co/games/Palworld/archives/445883`
- **Source Citation:** None cited.
- **Source Tier:** `community` (matches standard community charts; no datamined file cited).

### 9. Mutation Species Selection (`data/palworld — mutation breeding (v1.0)`)
- **Relevant Content Published?** NO mutation species selection formulas or eligible-species matrices published.
- **Exact Formula / Values:** None.
- **Page URLs:** `https://game8.co/games/Palworld/archives/440530`, `https://game8.co/games/Palworld/archives/444315`
- **Source Citation:** None.
- **Source Tier:** `community`

### 10. Natural Passive Pool / Inheritance (`pathfinder/core.ts — parent passive pool`)
- **Relevant Content Published?** YES, Game8 publishes empirical sample statistics from in-house testing on 107 breeding samples:
  - At least 1 IV is guaranteed to inherit from a parent.
  - ~30% chance to inherit an IV from a specific parent.
  - ~40% chance for an IV to be random.
  - Passives: States passive skills can pass down from parents, but skill inheritance is not 100% guaranteed, and random passives can be added.
- **Exact Formula / Values:** Reports ~30% parent inheritance and ~40% random chance from 107 sample trials. Does not publish exact game code inheritance weight arrays (4/3/2/1).
- **Page URLs:** `https://game8.co/games/Palworld/archives/444315`, `https://game8.co/games/Palworld/archives/440414`
- **Source Citation:** Game8 in-house empirical sample testing ("From a total of 107 breeding samples, we counted...").
- **Source Tier:** `community` (empirical sample trial observation).

---

## 3. Analysis of Cross-Platform Mechanics Hubs (Game8, GameWith, IGN)

### Why Previous Acquisition Passes Skipped These Hubs
1. **Focus on Structured Entity Catalogues:** Previous automation pipelines were built to ingest structured JSON or tabular HTML cards (e.g., Paldeck IDs, item drop rates, craft recipes, achievement lists). Explanatory narrative hubs (like Game Mechanics Guides) were ignored because they did not follow strict entity/attribute table schemas.
2. **Datamined vs. Narrative Criteria:** Project source-tiering rules prioritize datamined binary extractions (`datamined`) or versioned JSON schemas over commercial guide websites (`community`). Commercial guide sites write narrative prose, subjective advice, and unverified estimates rather than versioned code formulas.

### Examination of GameWith & IGN Mechanics Hubs

#### GameWith (`https://gamewith.net/palworld/` & `https://gamewith.jp/palworld/`)
- **Structure:** GameWith maintains a Palworld Walkthrough & Strategy Guide with categories for Beginners, Game Systems, Pal Breeding, Element Type Chart, Base Building, and Bosses.
- **Mechanics Pages:**
  - `Element Type Chart` (`https://gamewith.net/palworld/43477`)
  - `Breeding Guide & Combination Calculator` (`https://gamewith.net/palworld/43521`)
  - `How to Catch Pals & Increase Capture Rate` (`https://gamewith.net/palworld/43478`)
  - `How to Level Up Fast` (`https://gamewith.net/palworld/43475`)
  - `Base Building & Work Suitability` (`https://gamewith.net/palworld/43480`)
- **Findings on Gaps:** Like Game8, GameWith provides qualitative gameplay explanations, elemental multiplier tables (2x / 0.5x), and breeding calculators. It does **not** publish datamined formulas for capture probability, damage equations, level curves, or metabolic depletion.

#### IGN (`https://www.ign.com/wikis/palworld/`)
- **Structure:** IGN hosts the *Palworld Walkthrough and Guide Hub* (`https://www.ign.com/wikis/palworld/Palworld_Walkthrough_and_Guide_Hub`).
- **Mechanics Pages:**
  - `Pal Element Type Chart` (`https://www.ign.com/wikis/palworld/Pal_Element_Type_Chart`)
  - `Palworld 1.0 Breeding Guide` (`https://www.ign.com/wikis/palworld/Palworld_1.0_Breeding_Guide:_How_to_Breed_the_Best_Pals_(Highest_Damage,_Speed,_and_Stats)`)
  - `How to Catch Pals` (`https://www.ign.com/wikis/palworld/How_to_Catch_Pals`)
  - `Things Palworld Doesn't Tell You` (`https://www.ign.com/wikis/palworld/Things_Palworld_Doesn%E2%80%99t_Tell_You`)
  - `Leveling Guide` (`https://www.ign.com/wikis/palworld/Leveling_Guide`)
  - `Pal Passive Skills` (`https://www.ign.com/wikis/palworld/Pal_Passive_Skills`)
- **Findings on Gaps:** IGN's guides focus on beginner progression, recommended Pal builds, location maps, and item locations. No datamined code formulas or exact internal mechanics parameters are published.

---

## 4. Conclusion & Recommendations

1. **Keep `modelGaps.ts` Unchanged:** None of the ten gaps in `modelGaps.ts` can be resolved or upgraded using Game8, GameWith, or IGN guides. Guide sites publish community-tier qualitative advice or empirical sample estimates, not versioned game-code extractions.
2. **Source Tier Discipline:** All figures published by Game8 (such as STAB ~20% from in-house testing or breeding inheritance ~30%/40% from 107 samples) must remain strictly classified as `community` tier per `docs/PALWORLD-KNOWLEDGE-BASE-CONTRACT.md`.
3. **Reopening Criteria:** Unresolved model gaps should only be reopened when versioned game-assembly extractions (e.g. UPalCaptureJudge, UPalStatCalculator, PalExpTable) or official Pocketpair data tables are extracted and verified.
