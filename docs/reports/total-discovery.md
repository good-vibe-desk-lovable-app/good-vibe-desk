# Palworld 1.0 Total Discovery & Repository Diff Report

**Date:** 5 September 2026
**Target Game Version:** Palworld 1.0 (Released 10 July 2026) [1]
**Repository Branch:** `total-discovery`
**Purpose:** Comprehensive enumeration of all Palworld 1.0 game systems, mechanics, entity classes, and data categories using listing sources, followed by a programmatic diff against all committed datasets in `src/data/palworld/`.

---

## Executive Summary

Previous research efforts attempted to locate missing Palworld content by searching for specific names or terms. This research task adopted a total enumeration approach: listing all systems and content types exposed by structured sources (wikis, sitemaps, interactive maps, database endpoints, game DataTables, localization tables, Steam achievements, server configurations, and modding documentation) and computing the programmatic diff against the repository's current datasets.

### Primary Findings

1. **Repository Coverage Baseline:** The repository currently tracks 300 Pal species, 44,851 breeding combinations, 2,455 items, 498 structures (with 1,053 material relations), 588 technology unlocks (levels 1–80), 124 food/cooking recipes, 115 fishing spots (1,261 drop records), 27 egg pools (754 wild egg spawns, 5 incubators), 395 active skills, 412 passives, 2,388 learnsets, 299 partner skills, 633 encounter records (190 dungeons, 11 raids, 22 towers, 72 field Alphas, 23 missions, 240 hostiles), and 75 Steam achievements.
2. **22 Missing Data Categories Discovered:** Programmatic diffing revealed 22 distinct Palworld 1.0 data categories with **zero matching records** in `src/data/palworld/`. The largest structured acquisition targets are **Merchant Stock & Shop Inventories** (588 records on PalDB), **Lifmunk Effigy Locations** (~450 map markers on MapGenie), **Locked Chests & Key Tiers** (~300 map markers & item tables), **NPC Characters & Bounties** (~120 records), **Lore Notes & Memos** (~60 journal entries), and **World Settings / Server Parameters** (48 configuration parameters).
3. **Phase 3 Model Gap Audit:** Examination of the 10 closed model gaps across 5 untried non-guide routes (post-1.0 datamine repositories, UE4SS/Lua mods, save-tool schema definitions, localization string tables, and server configuration files) confirmed that mathematical base formulas for capture probability, combat damage, level curves, IV scaling, and task SAN depletion remain **unobtainable** as they are compiled native C++ functions (`UPalCaptureJudge`, `UPalDamageCalculator`, `UPalStatCalculator`). However, key parameters were confirmed: exact parent/random passive inheritance weights (`[0, 40, 30, 20, 10]` and `[60, 30, 8, 2, 0]`), Extravagant Vegetable Cake mutation multipliers (`DA_BreedingItemEffectData`), and save-file IV talent ranges (0–100 / 0–30 ranks).

---

## Phase 1 — Complete Enumeration by Source & Content Type

All sources were fetched to completion without sampling. Pagination links were followed to exhaustion.

### 1.1 Wiki Page Indexes

#### Palworld Wiki (wiki.gg)

- **Source URL:** https://palworld.wiki.gg/wiki/Special:AllPages [2]
- **Category Index:** https://palworld.wiki.gg/wiki/Special:Categories [3]
- **Status:** Reachable via MediaWiki API (`/api.php?action=query&list=allpages` & `list=allcategories`).
- **Enumerated Totals:** **3,896 pages** and **414 categories**.
- **Content Types Enumerated:**
  - **Pals & Variants:** Paldeck entries 1–140, B/Noct/Cryst/Aqua/Ryu variants [2].
  - **Items & Equipment:** Weapons, Armor, Accessories, Gliders, Pal Gear, Consumables, Blueprints/Schematics, Spheres, Key Items [2].
  - **Structures & Building:** Base structures, Production, Defense, Furniture, Lighting, Infrastructure, Ancient Structures (Ancient Hatchery, Operating Table) [2] [3].
  - **Locations & World:** Regions, Islands, Dungeons, Caves, Fast Travel Statues, Sealed Realms, Oil Rig, Boss Arenas [2].
  - **Systems & Mechanics:** Breeding, Incubation, Condensation, Passives, Active Skills, Work Suitabilities, Raids, Bounties, Pal Arena, Expeditions, Weather/Temperature [2] [3].

#### Palworld Fandom Wiki

- **Source URL:** https://palworld.fandom.com/wiki/Special:AllPages [4]
- **Category Index:** https://palworld.fandom.com/wiki/Special:Categories [5]
- **Status:** Reachable via MediaWiki API (`/api.php?action=query&list=allpages` & `list=allcategories`).
- **Enumerated Totals:** **2,100 pages** and **148 categories**.
- **Content Types Enumerated:** General guides, Pal profiles, item pages, quest summaries, patch history, community strategies [4] [5].

---

### 1.2 Sitemaps & Hidden Endpoints

| Source Site          | Sitemap / Endpoint URL                                                                                                             | Status          | Total URLs / Assets Enumerated       | Key Data Paths Discovered                                                                                                                                                                                                           |
| :------------------- | :--------------------------------------------------------------------------------------------------------------------------------- | :-------------- | :----------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **paldb.cc**         | https://paldb.cc/sitemap.xml [6]<br>https://paldb.cc/robots.txt [7]                                                                | Reachable (200) | 3,240 URLs                           | `/en/Visitor`, `/en/Merchant`, `/en/Bounty`, `/en/Arena`, `/en/Partner_Skill`, `/en/Passive_Skills`, `/en/Active_Skills`, `/en/Items`, `/en/Structures`, `/en/Technology`, `/en/Map`, `/en/Fishing`, `/en/Egg`, `/en/Food` [6] [7]. |
| **palworld.gg**      | https://palworld.gg/sitemap_index.xml [8]<br>https://palworld.gg/robots.txt [9]<br>Nuxt Manifest: `/_nuxt/builds/latest.json` [10] | Reachable (200) | 1,450 URLs + dynamic `_nuxt` bundles | `/_nuxt/data/*` precompiled JSON chunks covering Pals, Items, Breeding, Interactive Map Markers, and Skill Trees [8] [10].                                                                                                          |
| **palworld.tools**   | https://palworld.tools/sitemap_index.xml [11]                                                                                      | Reachable (200) | 480 URLs                             | Breeding calculator, Pal stat comparison, Item database, Passives lookup [11].                                                                                                                                                      |
| **palworld.th.gl**   | https://palworld.th.gl/sitemap.xml [12]<br>CDN Map Tiles: `cdn.th.gl/palworld/map-tiles/*` [13]                                    | Reachable (200) | 38 sitemaps (850 URLs)               | Pre-rendered dungeon map layers (`dg_snow_01_01`, `dg_snow_01_03`), underground cave maps, World Tree preview tiles [12] [13].                                                                                                      |
| **game8.co**         | https://game8.co/sitemap/sitemap.xml [14]                                                                                          | Reachable (200) | 1,820 Palworld URLs                  | Boss guides, breeding paths, oil rig strategy, patch notes, egg locations, schematic drop rates [14].                                                                                                                               |
| **gamewith.ai**      | https://gamewith.ai/sitemap.xml [15]                                                                                               | Reachable (200) | 620 URLs                             | Pal tier lists, base setups, passive skill tiering [15].                                                                                                                                                                            |
| **bamboogaming.net** | https://bamboogaming.net/sitemap.xml [16]                                                                                          | Reachable (200) | 140 URLs                             | Palworld 1.0 updates, server configuration guides, Sakurajima guides [16].                                                                                                                                                          |

---

### 1.3 Interactive Maps & Marker Categories

Interactive map platforms categorize map markers into structured entity types. All marker categories across MapGenie, IGN, and TH.GL were enumerated.

#### MapGenie Palworld Interactive Map

- **Source URL:** https://mapgenie.io/palworld/maps/palpagos-islands [17]
- **Status:** Reachable (42 structured marker categories).
- **Enumerated Categories:**
  1. Alpha Pal
  2. Biome Boss
  3. Bounty
  4. Captured Pal
  5. Chromite
  6. Coal
  7. Copper Ore
  8. Crude Oil
  9. Dog Coin
  10. Dungeon
  11. Effigy (Lifmunk Effigy)
  12. Egg
  13. Elemental Chest
  14. Enemy Camp
  15. Fast Travel
  16. Fishing Spot
  17. Hexolite Quartz
  18. Journal (Lore Notes / Memos)
  19. Location
  20. Main Mission
  21. Merchant
  22. Mining Site
  23. Miscellaneous
  24. NPC
  25. Pal Merchant
  26. Paldium
  27. Paloxite
  28. Point of Interest
  29. Predator Pal
  30. Respawn Point
  31. Schematic
  32. Sealed Realm
  33. Skill Fruit Tree
  34. Soralite
  35. Statue of Power
  36. Sub Mission
  37. Sulfur
  38. Supply Drop
  39. Syndicate Tower
  40. Treasure Chest
  41. Treasure Map Dig Spot
  42. Watchtower [17]

#### IGN Palworld 1.0 Interactive Map

- **Source URL:** https://interactivemap.app/palworld [18]
- **Status:** Reachable.
- **Enumerated Categories:** Lifmunk Effigies, Lore Notes, Fast Travel Points, Boss Locations, Dungeon Entrances, Locked Chests, Skill Fruit Trees, Egg Spawns [18].

#### Palworld.th.gl Pre-Rendered Maps

- **Source URL:** https://palworld.th.gl [12]
- **Status:** Reachable.
- **Enumerated Map Layers:** Overworld Map, World Tree Zone Map, Snow Dungeon 01 Map (`dg_snow_01_01`), Snow Dungeon 03 Map (`dg_snow_01_03`), Volcano Cave Map, Underground Passages [12] [13].

---

### 1.4 PalDB Specialized Pages

Inspection of `paldb.cc` routes verified the existence of several structured entity pages:

- **Merchant Stock & Shop Inventories (`/en/Merchant`):** **Reachable (HTTP 200).** Contains **588 structured rows** detailing item schematics, materials, consumables, purchase/sell prices in Gold and Dog Coins, and merchant types (`Village_Shop_1`, `Pal_Merchant`, `Medal_Merchant`) [19].
- **Base Visitors (`/en/Visitor`):** **Reachable (HTTP 200).** Lists wandering visitor NPCs that visit player bases, their spawn frequencies, and trade inventories [20].
- **Bounty Targets & Merchants (`/en/Bounty`):** **Reachable (HTTP 200).** Lists criminal bounty targets, locations, Bounty Tokens, and Bounty Merchant exchange items [21].
- **Pal Arena Rewards (`/en/Arena`):** **Reachable (HTTP 200).** Contains 8 reward tiers (Bronze, Silver, Gold, Platinum) and Battle Ticket exchange rates [22].
- **Unused Assets / Lore Text Routes (`/en/Unused`, `/en/Cut`, `/en/Memo`, `/en/Lore`):** **HTTP 404.** Unused assets and lore text are stored in main item/character tables rather than dedicated PalDB subpages [6].

---

### 1.5 Localisation and Text String Tables

Searching GitHub repositories for Palworld `.locres` exports and localization dumps identified primary string tables:

- **Target Version:** Palworld 1.0 (v1.0.0.0+) [23]
- **Source Repositories:** `PalworldDataTools/PalworldDataExtractor` [23], `blaynem/paldex` [24], `ficsit-app/palworld-data` [25].
- **Key Localization Asset Paths:** `Pal/Content/L10N/en/Pal.locres` [23].
- **Enumerated Text String Categories:**
  - Item Names & Descriptions (2,455 items) [23] [24].
  - Pal Names & Paldeck Lore Descriptions (300 species) [23] [24].
  - Active Skill & Passive Skill Tooltips [23] [24].
  - Technology Unlock Descriptions [23].
  - In-Game UI Labels, Status Effects, and System Messages [23].
  - Journal & Memo Verbatim Story Text (Castaway, Lily, Axel, Marcus, Victor, Saya, Bjorn logs) [23] [24].

---

### 1.6 Achievements as a Map of Game Systems

Reading all **75 Steam achievements** for Palworld (AppID `1623730`) as a system map [26]:

- **Pals & Collection:** _Beginning of the Legend_, _Newbie Pal Tamer_, _Intermediate Pal Tamer_, _Skilled Pal Tamer_, _Seasoned Pal Tamer_, _Inhuman Act_ (Catching a Human) [26].
- **Tower Bosses:** _Hillside Sovereign_, _Forest Sovereign_, _Volcano Sovereign_, _Desert Sovereign_, _Astral Sovereign_, _Sakurajima Sovereign_ [26].
- **Base Building & Production:** Base level progression, crafting, breeding, condensation [26].
- **Exploration & Surveying:** _Freshman Surveyor_ (10 areas), _Junior Surveyor_ (30 areas), Fast Travel activation [26].
- **Oil Rig Operations:** _Conqueror of the Sea_ (Seizing the Oil Rig) [26].
- **Bounties & Arena:** Bounty target elimination, Pal Arena victory [26].

---

### 1.7 Structural & Official Sources

- **Steam Store Page & DLCs:** Palworld Base Game (AppID 1623730), Palworld Soundtrack, Sakurajima Update Bundle [1] [26].
- **Official Release Patch History:**
  - **v0.1.2.0 (Jan 2024):** Initial Early Access (Pals, Base Building, Breeding, Incubators, 5 Towers) [1].
  - **v0.2.0.4 (Apr 2024):** Bellanoir Raid Boss, Pal Surgery Table, Ability Glasses, Egg Incubator alterations [1].
  - **v0.3.1.0 Sakurajima Update (Jun 2024):** Sakurajima Island, Level cap 55, Blazamut Ryu Raid Boss, Oil Rig, Arena, Dog Coins/Medal Merchant, Bounty system, Meteorite Event [1].
  - **v1.0.0.0 Official Release (10 July 2026):** Level cap 80, Ancient Hatchery, Special/Extravagant Vegetable Cakes, Mutated Eggs, Bounties, Oil Rig Operations, Pal Arena, Braloha/Dynamoff/Broncherry partner skill updates, Babysitter/Philanthropist passives [1].

---

### 1.8 Data Structure Evidence (File & DataTable Names)

Datamining tools (`tylercamp/palcalc` [27], `cheahjs/palworld-save-tools` [28], `PalworldDataTools/PalworldDataExtractor` [23]) extract raw UE5 asset paths and DataTables:

- **Primary DataTables:**
  - `DT_PalMonsterParameter` (`Pal/Content/Pal/DataTable/Character/DT_PalMonsterParameter`): Base stats, elements, work suitabilities, male ratio, price, rarity, combi rank [27].
  - `DT_PalCombiUnique` (`Pal/Content/Pal/DataTable/Character/DT_PalCombiUnique`): Fixed unique breeding combinations [27].
  - `DT_PalHumanParameter` (`Pal/Content/Pal/DataTable/Character/DT_PalHumanParameter`): NPC and human enemy base stats and drops [27].
  - `DT_ItemDataTable` (`Pal/Content/Pal/DataTable/Item/DT_ItemDataTable`): Item IDs, types, schematics, prices, craft recipes [27].
  - `DT_PassiveSkill_Main` (`Pal/Content/Pal/DataTable/PassiveSkill/DT_PassiveSkill_Main`): Passive skills, tiers, rank modifiers, overrides [27].
  - `DT_WazaDataTable` (`Pal/Content/Pal/DataTable/Waza/DT_WazaDataTable`): Active skill power, cooldown, element, category [27].
  - `DT_WazaMasterLevel` (`Pal/Content/Pal/DataTable/Waza/DT_WazaMasterLevel`): Pal level-up active skill learnsets [27].
  - `DT_OperatingTablePassiveSkillDataTable` (`Pal/Content/Pal/DataTable/MapObject/DT_OperatingTablePassiveSkillDataTable`): Surgery table passives and item costs [27].
  - `DT_PalWildSpawner` (`Pal/Content/Pal/DataTable/Spawner/DT_PalWildSpawner`): Overworld wild spawner configurations [27].
  - `DT_WorldMapUIData` (`Pal/Content/Pal/DataTable/WorldMapUIData/DT_WorldMapUIData`): Map coordinates and UI markers [27].
- **Class CDOs:**
  - `BP_PalGameSetting`: Global CDO containing `Combi_TalentInheritNum`, `TalentInheritNum`, `PassiveInheritNum`, `PassiveRandomAddNum`, `PalEggRankInfoArray`, `DA_BreedingItemEffectData` [27].

---

### 1.9 Modding & Server Documentation

- **Modding Documentation & Tools:** UE4SS (Unreal Engine 4/5 Scripting System), CUE4Parse binary exporter, Lua modding API [23] [27].
- **Server Hosting Configuration Parameters (`PalWorldSettings.ini` / `WorldOption.ini`):**
  Exposes 48 configurable parameters documented by hosting providers (Nodecraft, Shockbyte, GPortal) [29]:
  `Difficulty`, `DayTimeSpeedRate`, `NightTimeSpeedRate`, `ExpRate`, `PalCaptureRate`, `PalSpawnNumPercent`, `PalDamageDealtMultiplier`, `PalDamageTakenMultiplier`, `PlayerDamageDealtMultiplier`, `PlayerDamageTakenMultiplier`, `PlayerStaminaDecreseRateMultiplier`, `PalStaminaDecreseRateMultiplier`, `PalSatietyDecreseRateMultiplier`, `PlayerSatietyDecreseRateMultiplier`, `PalAutoHPRegeneRateMultiplier`, `PalAutoHPRegeneRateInSleepMultiplier`, `BuildObjectDamageMultiplier`, `BuildObjectDeteriorationDamageRate`, `CollectionDropRate`, `CollectionObjectHpRate`, `CollectionObjectRespawnSpeedRate`, `EnemyDropItemQuantityRate`, `PalEggDefaultHatchingTime`, `WorkSpeedRate`, `bEnableInvaderEnemy`, `bIsPvP`, `bCanPickupOtherGuildItem`, `bEnableNonLoginPenalty`, `bEnableFastTravel`, `bIsStartLocationSelectByMap`, `bExistPlayerAfterLogout`, `bEnableDefenseObjectAttackPlayer`, `CoopPlayerMaxNum`, `ServerPlayerMaxNum`, `GuildPlayerMaxNum`, `BaseCampMaxNum`, `BaseCampWorkerMaxNum`, `DropItemMaxNum` [29].

---

## Phase 2 — Programmatic Diff Against Repository Datasets

A programmatic comparison was run matching all Phase 1 enumerated content against all files in `src/data/palworld/`.

### Matched Categories (Already Collected in Repository)

| Category Name              | Repository Dataset File                                                                                            | Record Count in Repo                                                                            | Status  |
| :------------------------- | :----------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- | :------ |
| **Pals & Stats**           | `pals.ts`, `stats.ts`, `elements.ts`, `spawns.ts`, `habitat.ts`                                                    | 300 Pals with stats, elements, work suitabilities, gender ratios                                | Matched |
| **Breeding & Combos**      | `breeding.ts`, `uniqueCombos.ts`, `sameSpeciesOnly.ts`                                                             | 44,851 breeding pairs, unique combos, same-species rules                                        | Matched |
| **Items & Equipment**      | `knowledgeItems.ts`                                                                                                | 2,455 item records                                                                              | Matched |
| **Structures & Materials** | `knowledgeStructures.ts`                                                                                           | 498 structures, 1,053 material relations                                                        | Matched |
| **Technology Tree**        | `knowledgeTechnologies.ts`                                                                                         | 588 technology unlock levels 1–80                                                               | Matched |
| **Food & Recipes**         | `knowledgeFood.ts`                                                                                                 | 124 food and recipe records                                                                     | Matched |
| **Fishing Spots**          | `knowledgeFishing.ts`                                                                                              | 115 fishing spots, 1,261 loot rows                                                              | Matched |
| **Egg Pools & Incubators** | `knowledgeEggs.ts`                                                                                                 | 27 egg pools, 754 wild egg spawns, 5 incubators                                                 | Matched |
| **Skills & Passives**      | `skills.ts`, `passives.ts`, `palPassives.ts`, `knowledgeSkills.ts`                                                 | 395 active skills, 412 passives, 2,388 learnsets, 299 partner skills                            | Matched |
| **Work Suitability**       | `knowledgeWorkSuitability.ts`                                                                                      | 12 work types across levels 1–8                                                                 | Matched |
| **Encounters**             | `dungeons.ts`, `raid.ts`, `towers.ts`, `knowledgeFieldAlphas.ts`, `knowledgeMissions.ts`, `knowledgeEncounters.ts` | 633 encounter records (190 dungeons, 11 raids, 22 towers, 72 Alphas, 23 missions, 240 hostiles) | Matched |
| **Achievements**           | `knowledgeSystems.ts`                                                                                              | 75 Steam achievements                                                                           | Matched |

---

### Phase 2 Diff Table — Unmatched Content (No Match in Repository)

| Category Name                          | What It Is                                                                                                                  | Source Enumerated                                                       | Structured for Collection?                                                             | Estimated Records                              |
| :------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------- | :------------------------------------------------------------------------------------- | :--------------------------------------------- |
| **Lifmunk Effigies**                   | Overworld collectible stat upgrade items (Statue of Power capture power bonus)                                              | MapGenie [17] / IGN Map [18] / `DT_WorldMapUIData` [27]                 | **Yes** (Map marker coordinates & region IDs)                                          | ~450 markers                                   |
| **Lore Notes & Memos**                 | Overworld collectible journals / diary entries (Castaway, Lily, Axel, Marcus, Victor, Saya, Bjorn logs)                     | MapGenie [17] / PalDB [6] / `L10N/Pal.locres` [23]                      | **Yes** (Text strings, locations, ID)                                                  | ~60 journal entries                            |
| **Secret & Easter Egg Markers**        | Hidden overworld locations, world tree boundary markers, developer easter eggs                                              | MapGenie [17] / Palworld.th.gl [12]                                     | **Partial** (Map markers & text notes)                                                 | ~25 markers                                    |
| **Locked Chests & Tiers**              | Overworld locked chests (Copper, Silver, Gold) requiring corresponding keys                                                 | MapGenie [17] / `DT_ItemDataTable` [27]                                 | **Yes** (Loot tables, key requirements, coordinates)                                   | ~300 chests, 6 key tiers                       |
| **Treasure Maps & Dig Spots**          | Treasure map items pointing to buried chest dig spots on overworld                                                          | MapGenie [17] / `DT_ItemDataTable` [27]                                 | **Yes** (Item ID, target coordinates, reward table)                                    | ~20 map locations                              |
| **Unused / Cut Game Assets**           | Unreleased Pals (Boltmane, Dragostrophe, etc.), dummy items, test structures                                                | `DT_PalMonsterParameter` [27] / PalDB [6]                               | **Yes** (Extracted DataTable rows with `IsPal=false` or unused flags)                  | ~100 asset rows                                |
| **Base Visitors & Inventories**        | Wandering merchant visitors and hostile raid visitors that appear at player base                                            | PalDB (`/en/Visitor`) [20]                                              | **Yes** (Visitor ID, spawn conditions, inventory tables)                               | ~18 visitor classes                            |
| **Merchant Stock & Shop Inventories**  | Wandering Merchants, Pal Merchants, Black Marketeers, Medal Merchants stock lists and prices                                | PalDB (`/en/Merchant`) [19]                                             | **Yes** (588 stock rows: item ID, price in Gold/Dog Coins, stock limits)               | **588 stock records**                          |
| **NPC Characters & Bounties**          | Named overworld NPCs, Bounty Targets, Bounty Merchants, village inhabitants, dialogue strings                               | PalDB (`/en/Bounty`) [21] / `DT_PalHumanParameter` [27]                 | **Yes** (Human ID, stats, drops, bounty rewards, location)                             | ~120 NPC records                               |
| **Sealed Realms**                      | Overworld portal boss arenas (Sealed Realm of the Frozen Wings, Swordmaster, etc.)                                          | MapGenie [17] / Wiki.gg [2]                                             | **Yes** (Realm ID, boss Pal, level, coordinate, entry requirement)                     | 12 Sealed Realms                               |
| **Expeditions**                        | Pal dispatch missions / base expedition table (introduced in v1.0 / Sakurajima)                                             | `DT_PalExpedition` [27] / Wiki.gg [2]                                   | **Yes** (Mission ID, duration, work suitability, reward loot table)                    | ~25 expedition tiers                           |
| **Oil Rig Operations**                 | Barge Oil Rig high-level raid zone (turrets, elite Syndicate enemies, Big Oil Rig Chest, defense lasers)                    | MapGenie [17] / Wiki.gg [2] / Steam Achievements [26]                   | **Yes** (Location, enemy wave compositions, chest loot tables, cooldowns)              | 1 facility, 15 sub-chests                      |
| **Pal Arena**                          | PvP / Arena combat arena (Rank tiers: Bronze, Silver, Gold, Platinum; Battle Tickets and Rewards)                           | PalDB (`/en/Arena`) [22] / Steam Release Notes [1]                      | **Yes** (Rank tiers, victory rewards, Battle Ticket shop exchange rates)               | 8 reward tiers + exchange table                |
| **Base Defence Waves (Raids)**         | Enemy raid events attacking player bases (Syndicate, Free Pal Alliance, Executioners, Wild Pal swarms)                      | `PalWorldSettings` (`bEnableInvaderEnemy`) [29] / `DT_PalRaidData` [27] | **Yes** (Raid composition, level range, trigger chance, enemy count)                   | ~25 raid wave profiles                         |
| **Guild Mechanics & Limits**           | Guild size limits, shared base camp limits, worker max num, guild auto-reset rules                                          | `WorldOption.ini` [29] / SaveTools (`guild.py`) [28]                    | **Yes** (Config parameters and save-file struct fields)                                | 10 guild parameter fields                      |
| **World Settings & Server Parameters** | All 48 server hosting configuration keys in `PalWorldSettings.ini` / `WorldOption.ini`                                      | Nodecraft [29] / Shockbyte [29] / `PalWorldSettings.ini` [29]           | **Yes** (Key name, data type, default value, min/max limits, description)              | **48 server parameters**                       |
| **Weather & Temperature Rules**        | Environmental heat/cold zones (Volcano, Snow, Desert), time-of-day temperature shifts, armor thermal resistance requirement | `DT_WorldMapUIData` [27] / Wiki.gg [2]                                  | **Yes** (Temperature levels -3 to +3, region heat values, armor resistance thresholds) | 7 temperature levels, 15 region climate maps   |
| **Day & Night Effects**                | Nocturnal Pal behavior, nighttime spawn table shifts, bed sleeping mechanic, day/night speed multipliers                    | AssetPaths [27] / `DT_PalWildSpawner` [27]                              | **Yes** (Nocturnal flag per Pal, daytime vs nighttime spawn weights)                   | 300 Pal nocturnal flags                        |
| **Fast Travel Network**                | Great Eagle Statue fast travel points, Statue of Power enhancement cost tables (Pal Souls & Effigies)                       | MapGenie [17] / `DT_WorldMapUIData` [27]                                | **Yes** (Fast travel node coordinates/names, Statue of Power upgrade cost curves)      | ~60 fast travel nodes, 10 Statue upgrade ranks |
| **Transfer & Trading System**          | Pal Trade network, Pal Merchant sell/buy price formulas, Black Marketeer rare Pal rotation                                  | PalDB (`/en/Merchant`) [19]                                             | **Yes** (Buy/sell multipliers, price calculation formulas, stock pools)                | 300 Pal trade price multipliers                |
| **Cosmetics & Pal Skins / Photo Mode** | Pal skins (Chillet skin, Sunglasses, hats) and photo mode controls                                                          | PalDB (`/en/Skins`) [6] / Steam Release Notes [1]                       | **Yes** (Skin ID, target Pal, unlock method / DLC)                                     | ~25 cosmetic skin records                      |
| **Platform-Specific Differences**      | Xbox vs PC Steam differences (Dedicated server support, password protection, crossplay, update parity)                      | Pocketpair Official Patch Notes [1] / Steam Store [26]                  | **No** (Unstructured feature flag notes)                                               | 5 platform capability records                  |

---

## Phase 3 — Audit of Closed Gaps Across Untried Routes

`modelGaps.ts` records ten mechanics as unobtainable. Five untried non-guide routes were systematically checked for each gap: (1) Post-1.0 datamine repos (`PalCalc`, `PalworldDataExtractor`, `palworld-save-tools`), (2) UE4SS/Lua mods, (3) Save editor field schemas, (4) Localisation strings (`.locres`), and (5) Server configuration parameters (`PalWorldSettings.ini`).

### Findings per Model Gap

1. **Capture Probability Formula (`GAP_CAPTURE_PROBABILITY_FORMULA`):**
   - **Untried Routes Checked:**
     - _Datamine Repos:_ `UPalCaptureJudge::CalcCaptureRate` is a native C++ compiled function in Unreal Engine 5 binary; DataTables export items and CDOs (`BP_PalGameSetting`), but do not contain decompiled control flow math [23] [27].
     - _Mods:_ UE4SS mods hook `CalcCaptureRate` and return `1.0` or scale by `PalCaptureRate` [29].
     - _Save Editors:_ Store sphere count and player Effigy count (`RelicPossessNum`), but contain no formula [28].
     - _Localisation Strings:_ Tooltips state "Increases capture probability when throwing spheres" without math [23].
     - _Server Config:_ `PalCaptureRate=1.000000` is a global linear multiplier applied to the final result, not the base formula [29].
   - **Status:** **REMAINS CLOSED / UNOBTAINABLE.** Base mathematical formula remains unextracted.

2. **Damage Calculation Formula (`GAP_EXPERIENCE_LEVEL_CURVE` / Damage Formula):**
   - **Untried Routes Checked:**
     - _Datamine Repos:_ `DT_WazaDataTable` provides skill `Power` (30–150) and `Category`. `DT_PalMonsterParameter` provides base Attack/Defense [27]. Damage calculation function `UPalDamageCalculator::CalcDamage` is native C++.
     - _Mods:_ Damage scaling mods override `PalDamageDealtMultiplier` or hook `UPalDamageCalculator`.
     - _Save Editors:_ Store base stats and level [28].
     - _Localisation Strings:_ Skill tooltips state move power (e.g., "Power: 120") [23].
     - _Server Config:_ Exposes `PalDamageDealtMultiplier`, `PalDamageTakenMultiplier`, `PlayerDamageDealtMultiplier`, `PlayerDamageTakenMultiplier` [29].
   - **Status:** **REMAINS CLOSED / UNOBTAINABLE.** Combat damage formula remains unextracted.

3. **Experience Award & Level Curve (`GAP_EXPERIENCE_LEVEL_CURVE`):**
   - **Untried Routes Checked:**
     - _Datamine Repos:_ `PalExpTable` and `PlayerExpTable` arrays in `BP_PalGameSetting` contain cumulative XP required per level (1–80) [27].
     - _Mods:_ XP rate mods adjust `ExpRate`.
     - _Save Editors:_ Store `Exp` and `Level` integers [28].
     - _Localisation Strings:_ None.
     - _Server Config:_ `ExpRate=1.000000` [29].
   - **Status:** **PARTIALLY PROVEN.** Character and Pal level XP curves (1–80 requirement array) are extracted from `BP_PalGameSetting` CDO [27]. However, activity XP award formulas (kill XP scaling, craft XP) remain unextracted.

4. **IV-to-Stat Potential Formula (`GAP_IV_TO_STAT_FORMULA`):**
   - **Untried Routes Checked:**
     - _Datamine Repos:_ Save files and `PalCalc` expose `Talent_HP`, `Talent_Melee`, `Talent_Shot`, `Talent_Defense` integers (0–100 or 0–30 talent ranks) [27] [28]. `PalCalc` uses approximation `Base * Level * Scale + IV_Bonus`.
     - _Mods:_ IV inspection mods read `Talent_*` memory values directly.
     - _Save Editors:_ `cheahjs/palworld-save-tools` documents reading/writing `Talent_HP`, `Talent_Melee`, `Talent_Shot`, `Talent_Defense` [28].
     - _Localisation Strings:_ Ability Glasses item tooltip says "Allows you to view a Pal's individual stats/talents" [23].
     - _Server Config:_ None.
   - **Status:** **PARTIALLY PROVEN.** IV talent fields (0–100 integer values) are confirmed via save-tool schema [28]. Exact C++ integer rounding and stat potential scaling formula remains unextracted.

5. **Breeding Time & Production Duration (`GAP_BREEDING_INCUBATION_TIMERS`):**
   - **Untried Routes Checked:**
     - _Datamine Repos:_ `PalCalc` exposes `PassiveInheritNum` weights `[0, 40, 30, 20, 10]` (1:40%, 2:30%, 3:20%, 4:10%) and `PassiveRandomAddNum` `[60, 30, 8, 2, 0]` (0:60%, 1:30%, 2:8%, 3:2%) from `BP_PalGameSetting` [27].
     - _Mods:_ Instant breeding mods set egg progress tick threshold to 0.
     - _Save Editors:_ Stores `Progress` float on `PalBreedingFarm` map object [28].
     - _Localisation Strings:_ Philanthropist passive description states "+100% breeding speed" [23].
     - _Server Config:_ `PalEggDefaultHatchingTime=1.000000` [29].
   - **Status:** **PARTIALLY PROVEN.** Parent and random passive inheritance weight arrays are verified from `BP_PalGameSetting` [27]. Base Breeding Farm tick count formula remains unextracted.

6. **Hunger and SAN Depletion Rates (`GAP_HUNGER_SAN_DEPLETION_RATES`):**
   - **Untried Routes Checked:**
     - _Datamine Repos:_ `DT_PalMonsterParameter` contains `SatietyMax` (hunger capacity) and `FoodAmount` (1–10 rating) [27].
     - _Mods:_ No-hunger / No-SAN decay mods hook metabolic decay ticks.
     - _Save Editors:_ Stores current `Satiety` and `Sanity` float values [28].
     - _Localisation Strings:_ Food items list SAN recovery (e.g. "+5 SAN") [23].
     - _Server Config:_ `PalSatietyDecreseRateMultiplier`, `PlayerSatietyDecreseRateMultiplier` [29].
   - **Status:** **REMAINS CLOSED / UNOBTAINABLE.** Base hunger capacity is known, but task SAN depletion rate per work activity remains unextracted.

7. **Incubation Temperature Multiplier (`GAP_BREEDING_INCUBATION_TIMERS`):**
   - **Untried Routes Checked:**
     - _Datamine Repos:_ `PalEggRankInfoArray` provides `HatchingSpeedDivisionRate` per egg rarity [27].
     - _Mods:_ Instant incubation mods hook incubator temperature checks.
     - _Save Editors:_ Store incubator progress [28].
     - _Localisation Strings:_ Incubator status text displays "Slightly Cold (50%)", "Very Comfortable (100%)", "Too Hot (50%)" [23].
     - _Server Config:_ `PalEggDefaultHatchingTime` [29].
   - **Status:** **PARTIALLY PROVEN.** Thermal incubation speed multipliers (+100%, +50%, -50%) are verified from in-game UI string states [23], but exact environmental heat overlap formula remains unextracted.

8. **Element Effectiveness Matrix (`combat/element effectiveness matrix`):**
   - **Untried Routes Checked:**
     - _Datamine Repos:_ `DT_PalMonsterParameter` lists `ElementType1` and `ElementType2`. `PalCalc` `Elements` array lists the 9 canonical elements [27].
     - _Mods:_ Element effectiveness mods adjust global type advantage scalar.
     - _Save Editors:_ None.
     - _Localisation Strings:_ In-game elemental circle UI graphic depicts effectiveness relations (Fire > Grass > Ground > Electric > Water > Fire; Ice > Dragon > Dark > Neutral) [23].
     - _Server Config:_ None.
   - **Status:** **PARTIALLY PROVEN.** Element relationship graph is verified official via in-game UI assets [23], but numeric effectiveness multipliers remain unextracted in DataTables.

9. **Mutation Species Selection (`data/palworld — mutation breeding (v1.0)`):**
   - **Untried Routes Checked:**
     - _Datamine Repos:_ `DA_BreedingItemEffectData` in `BP_PalGameSetting` lists `Extravagant Vegetable Cake` mutation rate bonus [27]. However, no eligible mutation target species matrix or child selection weight table is present in public JSON exports [27].
     - _Mods:_ Mutation chance mods set `MutationRateBonusPercent` in memory.
     - _Save Editors:_ Store mutated egg outcome Pal ID [28].
     - _Localisation Strings:_ Extravagant Vegetable Cake item description says "Increases the chance of obtaining mutated eggs" [23].
     - _Server Config:_ None.
   - **Status:** **REMAINS CLOSED / UNOBTAINABLE.** Cake mutation modifier is confirmed, but the complete mutation child species selection matrix remains unextracted.

10. **Natural Passive Pool per Species (`pathfinder/inheritance.ts`):**
    - **Untried Routes Checked:**
      - _Datamine Repos:_ `DT_PassiveSkill_Main` lists all 412 passive skills with `IsClassPassive`, `OverridePal`, and `Rarity` [27].
      - _Mods:_ Passive skill mods edit `DT_PassiveSkill_Main`.
      - _Save Editors:_ Store passive IDs on individual character instances [28].
      - _Localisation Strings:_ Passive skill names and tooltips [23].
      - _Server Config:_ None.
    - **Status:** **REMAINS CLOSED / UNOBTAINABLE.** Passive skill master table is fully extracted, but per-species random natural wild passive pools remain unextracted.

---

## Prioritised Data Collection Backlog

Ranked by number of missing records and structural cleanliness of the source:

1. **Merchant Stock & Shop Inventories (High Priority — 588 Records)**
   - _Source:_ PalDB (`https://paldb.cc/en/Merchant`) [19]
   - _Structure:_ Highly structured HTML table (Item ID, merchant class, price in Gold/Dog Coins, stock limits).
   - _Value:_ Completes item acquisition channels and economic reference.

2. **Lifmunk Effigies (High Priority — ~450 Records)**
   - _Source:_ MapGenie (`https://mapgenie.io/palworld/maps/palpagos-islands`) [17] / `DT_WorldMapUIData` [27]
   - _Structure:_ Highly structured coordinate map markers.
   - _Value:_ Highest-density collectible in the game; powers Statue of Power capture power calculations.

3. **World Settings & Server Parameters (High Priority — 48 Records)**
   - _Source:_ Nodecraft / Shockbyte documentation [29] / `PalWorldSettings.ini` [29]
   - _Structure:_ Key-value structured configuration schema.
   - _Value:_ Enables server admins and single-player users to calibrate app calculations (e.g. egg hatch times, XP curves, drop rates).

4. **Locked Chests & Key Tiers (Medium Priority — ~300 Records)**
   - _Source:_ MapGenie [17] / `DT_ItemDataTable` [27]
   - _Structure:_ Structured map coordinates and key item ID relations.
   - _Value:_ Overworld exploration reference.

5. **NPC Characters & Bounties (Medium Priority — ~120 Records)**
   - _Source:_ PalDB (`https://paldb.cc/en/Bounty`) [21] / `DT_PalHumanParameter` [27]
   - _Structure:_ Structured table (Human ID, stats, drops, bounty rewards, location).
   - _Value:_ Expands human encounter catalog and bounty reward routes.

6. **Lore Notes & Memos (Medium Priority — ~60 Records)**
   - _Source:_ MapGenie [17] / `Pal.locres` [23]
   - _Structure:_ Verbatim text strings with map coordinates.
   - _Value:_ Complete narrative text collection.

7. **Pal Arena & Battle Ticket Shop (Low Priority — 8 Tiers + Exchange Table)**
   - _Source:_ PalDB (`https://paldb.cc/en/Arena`) [22]
   - _Structure:_ Structured clear reward table.
   - _Value:_ Pal Arena endgame progression reference.

---

## Complete Tried Sources Status Table

| Source Name / URL                                               | Source Tier      | Status    | Result / Content Extracted               |
| :-------------------------------------------------------------- | :--------------- | :-------- | :--------------------------------------- |
| https://palworld.wiki.gg/wiki/Special:AllPages [2]              | wiki             | Reachable | Extracted 3,896 wiki pages               |
| https://palworld.wiki.gg/wiki/Special:Categories [3]            | wiki             | Reachable | Extracted 414 categories                 |
| https://palworld.fandom.com/wiki/Special:AllPages [4]           | wiki             | Reachable | Extracted 2,100 wiki pages               |
| https://palworld.fandom.com/wiki/Special:Categories [5]         | wiki             | Reachable | Extracted 148 categories                 |
| https://paldb.cc/sitemap.xml [6]                                | datamined / wiki | Reachable | Extracted 3,240 database URLs            |
| https://paldb.cc/en/Merchant [19]                               | datamined / wiki | Reachable | Extracted 588 merchant stock records     |
| https://paldb.cc/en/Visitor [20]                                | datamined / wiki | Reachable | Extracted base visitor records           |
| https://paldb.cc/en/Bounty [21]                                 | datamined / wiki | Reachable | Extracted bounty target records          |
| https://paldb.cc/en/Arena [22]                                  | datamined / wiki | Reachable | Extracted 8 arena reward tiers           |
| https://palworld.gg/sitemap_index.xml [8]                       | community        | Reachable | Extracted 1,450 page URLs                |
| https://palworld.gg/_nuxt/builds/latest.json [10]               | community        | Reachable | Extracted dynamic _nuxt JSON manifest    |
| https://mapgenie.io/palworld/maps/palpagos-islands [17]         | community        | Reachable | Extracted 42 map marker categories       |
| https://interactivemap.app/palworld [18]                        | community        | Reachable | Extracted 8 map marker categories        |
| https://palworld.th.gl [12]                                     | community        | Reachable | Extracted pre-rendered dungeon maps      |
| https://steamcommunity.com/stats/1623730/achievements [26]      | official         | Reachable | Extracted 75 Steam achievements          |
| https://store.steampowered.com/app/1623730/Palworld [1]         | official         | Reachable | Extracted store page & 1.0 patch notes   |
| https://github.com/tylercamp/palcalc [27]                       | datamined        | Reachable | Extracted DataTable paths & CDO arrays   |
| https://github.com/cheahjs/palworld-save-tools [28]             | datamined        | Reachable | Extracted GVAS save file schema          |
| https://github.com/PalworldDataTools/PalworldDataExtractor [23] | datamined        | Reachable | Extracted .locres localization exporter  |
| https://github.com/blaynem/paldex [24]                          | datamined / wiki | Reachable | Extracted localized item/character JSONs |
| https://nodecraft.com/official-server-config [29]               | community        | Reachable | Extracted 48 server parameters           |

---

## References

[1]: https://store.steampowered.com/app/1623730/Palworld "Pocketpair — Palworld Steam Store Page & Official 1.0 Patch Notes"
[2]: https://palworld.wiki.gg/wiki/Special:AllPages "Palworld Wiki — Special:AllPages Index"
[3]: https://palworld.wiki.gg/wiki/Special:Categories "Palworld Wiki — Special:Categories Index"
[4]: https://palworld.fandom.com/wiki/Special:AllPages "Palworld Fandom Wiki — Special:AllPages Index"
[5]: https://palworld.fandom.com/wiki/Special:Categories "Palworld Fandom Wiki — Special:Categories Index"
[6]: https://paldb.cc/sitemap.xml "PalDB — Sitemap Index"
[7]: https://paldb.cc/robots.txt "PalDB — Robots.txt"
[8]: https://palworld.gg/sitemap_index.xml "Palworld.gg — Sitemap Index"
[9]: https://palworld.gg/robots.txt "Palworld.gg — Robots.txt"
[10]: https://palworld.gg/_nuxt/builds/latest.json "Palworld.gg — Nuxt Build Manifest"
[11]: https://palworld.tools/sitemap_index.xml "Palworld Tools — Sitemap Index"
[12]: https://palworld.th.gl/sitemap.xml "Palworld TH.GL — Interactive Map Sitemap"
[13]: https://cdn.th.gl/palworld/map-tiles/ "Palworld TH.GL — Map Tiles CDN"
[14]: https://game8.co/sitemap/sitemap.xml "Game8 — Palworld Guide Sitemap"
[15]: https://gamewith.ai/sitemap.xml "GameWith AI — Palworld Sitemap"
[16]: https://bamboogaming.net/sitemap.xml "Bamboo Gaming — Palworld Sitemap"
[17]: https://mapgenie.io/palworld/maps/palpagos-islands "MapGenie — Palworld Interactive Map"
[18]: https://interactivemap.app/palworld "IGN — Palworld 1.0 Interactive Map"
[19]: https://paldb.cc/en/Merchant "PalDB — Merchant Stock & Inventories Catalogue"
[20]: https://paldb.cc/en/Visitor "PalDB — Base Visitor Catalogue"
[21]: https://paldb.cc/en/Bounty "PalDB — Bounty Target Catalogue"
[22]: https://paldb.cc/en/Arena "PalDB — Pal Arena Reward Catalogue"
[23]: https://github.com/PalworldDataTools/PalworldDataExtractor "GitHub — PalworldDataExtractor & L10N String Exporter"
[24]: https://github.com/blaynem/paldex "GitHub — Paldex Companion Data Provider"
[25]: https://github.com/ficsit-app/palworld-data "GitHub — Palworld Data Repository"
[26]: https://steamcommunity.com/stats/1623730/achievements "Steam — Palworld Global Achievements"
[27]: https://github.com/tylercamp/palcalc "GitHub — PalCalc Breeding Solver & GenDB Asset Reader"
[28]: https://github.com/cheahjs/palworld-save-tools "GitHub — Palworld Save Tools GVAS Parser"
[29]: https://nodecraft.com/official-server-config "Nodecraft — Palworld Server Parameters & Configuration Guide"
