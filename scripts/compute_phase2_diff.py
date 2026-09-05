import json
import glob
import os
import re

# Load Phase 1 enumerated items
def run_diff():
    committed_datasets = {
        "Pals & Stats": "pals.ts, stats.ts, elements.ts, spawns.ts, habitat.ts",
        "Breeding & Combinations": "breeding.ts, uniqueCombos.ts, sameSpeciesOnly.ts",
        "Items & Equipment": "knowledgeItems.ts",
        "Structures & Materials": "knowledgeStructures.ts",
        "Technology Unlocks": "knowledgeTechnologies.ts",
        "Food & Recipes": "knowledgeFood.ts",
        "Fishing Spots": "knowledgeFishing.ts",
        "Egg Pools & Wild Eggs": "knowledgeEggs.ts",
        "Skills & Passives": "skills.ts, passives.ts, palPassives.ts, knowledgeSkills.ts",
        "Work Suitability": "knowledgeWorkSuitability.ts",
        "Encounters (Dungeons, Raids, Towers, Field Alphas, Missions, Hostiles)": "dungeons.ts, raid.ts, towers.ts, knowledgeFieldAlphas.ts, knowledgeMissions.ts, knowledgeEncounters.ts",
        "Achievements": "knowledgeSystems.ts",
        "System Mechanics & Gaps": "knowledgeSystems.ts, modelGaps.ts, dataGaps.ts"
    }

    # Enumerated categories from Phase 1
    phase1_items = [
        # Already Collected / Matched Categories
        {"name": "Pals (300 species)", "category": "Pals", "source": "paldb.cc / Palworld Wiki", "match": "pals.ts, stats.ts"},
        {"name": "Breeding Combinations (44,851 pairs)", "category": "Breeding", "source": "paldb.cc / PalCalc", "match": "breeding.ts, uniqueCombos.ts"},
        {"name": "Item Catalog (2,455 items)", "category": "Items", "source": "knowledgeItems.ts", "match": "knowledgeItems.ts"},
        {"name": "Structure Catalog (498 structures)", "category": "Structures", "source": "knowledgeStructures.ts", "match": "knowledgeStructures.ts"},
        {"name": "Technology Tree (588 level 1-80 unlocks)", "category": "Technology", "source": "knowledgeTechnologies.ts", "match": "knowledgeTechnologies.ts"},
        {"name": "Food & Cooking Recipes (124 records)", "category": "Food", "source": "knowledgeFood.ts", "match": "knowledgeFood.ts"},
        {"name": "Fishing Locations & Drops (115 spots, 1,261 drops)", "category": "Fishing", "source": "knowledgeFishing.ts", "match": "knowledgeFishing.ts"},
        {"name": "Egg Incubators & Spawns (27 pools, 754 spawns, 5 incubators)", "category": "Eggs", "source": "knowledgeEggs.ts", "match": "knowledgeEggs.ts"},
        {"name": "Active & Passive Skills (395 active, 412 passives)", "category": "Skills", "source": "skills.ts, passives.ts, knowledgeSkills.ts", "match": "knowledgeSkills.ts"},
        {"name": "Work Suitabilities (12 work types, levels 1-8)", "category": "Work", "source": "knowledgeWorkSuitability.ts", "match": "knowledgeWorkSuitability.ts"},
        {"name": "Encounter Records (190 dungeons, 11 raids, 22 towers, 72 Alphas, 23 missions, 240 hostiles)", "category": "Encounters", "source": "dungeons.ts, raid.ts, towers.ts, knowledgeEncounters.ts", "match": "knowledgeEncounters.ts"},
        {"name": "Achievements (75 Steam achievements)", "category": "Achievements", "source": "Steam API / knowledgeSystems.ts", "match": "knowledgeSystems.ts"},

        # UNMATCHED Findings (NO match in repository)
        {"name": "Lifmunk Effigies", "what": "Overworld collectible stat upgrade items (Statue of Power capture power bonus)", "source": "MapGenie / IGN Map / MapUIData", "structured": "Yes (Map marker coordinates / ID list)", "est_records": "approx 450 records", "match": None},
        {"name": "Lore Notes & Memos (Journals)", "what": "Overworld collectible journals / diary entries (Castaway, Lily, Axel, Marcus, Victor, Saya, Bjorn logs)", "source": "MapGenie / paldb / Wiki.gg", "structured": "Yes (Text strings, locations, ID)", "est_records": "approx 50-70 records", "match": None},
        {"name": "Secret & Easter Egg Markers", "what": "Hidden overworld locations, world tree boundary markers, developer easter eggs", "source": "MapGenie / palworld.th.gl", "structured": "Partial (Map markers / text notes)", "est_records": "approx 20-30 records", "match": None},
        {"name": "Locked Chests & Tiers", "what": "Overworld locked chests (Copper, Silver, Gold) requiring corresponding keys and key schematics", "source": "MapGenie / ItemDataTable", "structured": "Yes (Loot tables, key requirements, coordinates)", "est_records": "approx 300+ chest locations, 6 key tiers", "match": None},
        {"name": "Treasure Maps & Dig Spots", "what": "Treasure maps items pointing to buried chest dig spots on overworld", "source": "MapGenie / ItemDataTable", "structured": "Yes (Item ID, target coordinates, reward table)", "est_records": "approx 15-25 treasure map locations", "match": None},
        {"name": "Unused / Cut Game Assets", "what": "Unreleased Pals (Boltmane, Dragostrophe, etc.), dummy items, internal test structures", "source": "DT_PalMonsterParameter / paldb", "structured": "Yes (Extracted DataTable rows with IsPal=false or unused flags)", "est_records": "approx 100+ unused item/character rows", "match": None},
        {"name": "Base Visitors & Inventories", "what": "Wandering merchant visitors and hostile raid visitors that appear at player base", "source": "paldb.cc / Visitor", "structured": "Yes (Visitor ID, spawn conditions, inventory/trade tables)", "est_records": "approx 15-20 visitor classes", "match": None},
        {"name": "Merchant Stock & Shop Inventories", "what": "Wandering Merchants, Pal Merchants, Black Marketeers, Medal Merchants stock lists and prices", "source": "paldb.cc / Merchant", "structured": "Yes (588 stock rows: item ID, price in Gold/Dog Coins, stock limits)", "est_records": "588 stock records across 12 merchant types", "match": None},
        {"name": "NPC Characters & Dialogue / Bounties", "what": "Named overworld NPCs, Bounty Targets, Bounty Merchants, village inhabitants, dialogue strings", "source": "paldb.cc / Bounty / DT_PalHumanParameter", "structured": "Yes (Human ID, stats, drops, bounty rewards, location)", "est_records": "approx 80-120 NPC records", "match": None},
        {"name": "Sealed Realms", "what": "Overworld portal boss arenas (Sealed Realm of the Frozen Wings, Swordmaster, etc.)", "source": "MapGenie / Wiki.gg", "structured": "Yes (Realm ID, boss Pal, level, coordinate, entry requirement)", "est_records": "12 Sealed Realms", "match": None},
        {"name": "Expeditions", "what": "Pal dispatch missions / base expedition table (introduced in v1.0 / Sakurajima)", "source": "DT_PalExpedition / Wiki.gg", "structured": "Yes (Mission ID, duration, required work suitability, reward loot table)", "est_records": "approx 20-30 expedition tiers", "match": None},
        {"name": "Oil Rig Operations", "what": "Barge Oil Rig high-level raid zone (turrets, elite Syndicate enemies, Big Oil Rig Chest, defense lasers)", "source": "MapGenie / Wiki.gg / Steam Achievements", "structured": "Yes (Location, enemy wave compositions, chest loot tables, cooldowns)", "est_records": "1 primary facility, 15+ sub-chests / enemy spawn profiles", "match": None},
        {"name": "Pal Arena", "what": "PvP / Arena combat arena (Rank tiers: Bronze, Silver, Gold, Platinum; Battle Tickets and Rewards)", "source": "paldb.cc / Arena / Steam Changelog", "structured": "Yes (Rank tiers, victory rewards, Battle Ticket shop exchange rates)", "est_records": "8 arena reward tiers + Battle Ticket exchange table", "match": None},
        {"name": "Base Defence Waves (Raids)", "what": "Enemy raid events attacking player bases (Syndicate, Free Pal Alliance, Executioners, Wild Pal swarms)", "source": "PalWorldSettings (bEnableInvaderEnemy) / DT_PalRaidData", "structured": "Yes (Raid composition, level range, trigger chance, enemy count)", "est_records": "approx 25 raid wave profiles", "match": None},
        {"name": "Guild Mechanics & Limits", "what": "Guild size limits, shared base camp limits, worker max num, guild auto-reset rules", "source": "WorldOption.ini / SaveTools (guild.py)", "structured": "Yes (Config parameters and save-file struct fields)", "est_records": "10 guild parameter fields", "match": None},
        {"name": "World Settings & Server Parameters", "what": "All 45+ server hosting configuration keys in PalWorldSettings.ini / WorldOption.ini", "source": "Nodecraft / Shockbyte / PalWorldSettings.ini", "structured": "Yes (Key name, data type, default value, min/max limits, description)", "est_records": "48 server parameter records", "match": None},
        {"name": "Weather & Temperature Rules", "what": "Environmental heat/cold zones (Volcano, Snow, Desert), time-of-day temperature shifts, armor thermal resistance requirement", "source": "DT_WorldMapUIData / Wiki.gg", "structured": "Yes (Temperature levels -3 to +3, region heat values, armor resistance thresholds)", "est_records": "7 temperature levels, 15 region climate maps", "match": None},
        {"name": "Day & Night Effects", "what": "Nocturnal Pal behavior, nighttime spawn table shifts, bed sleeping mechanic, day/night speed multipliers", "source": "AssetPaths (DAY_ICON_PATH/NIGHT_ICON_PATH) / DT_PalWildSpawner", "structured": "Yes (Nocturnal flag per Pal, daytime vs nighttime spawn weights)", "est_records": "300 Pal nocturnal flags + spawner time-of-day tables", "match": None},
        {"name": "Fast Travel Network & Statues of Power", "what": "Great Eagle Statue fast travel points, Statue of Power enhancement cost tables (Pal Souls & Effigies)", "source": "MapGenie / DT_WorldMapUIData", "structured": "Yes (Fast travel node coordinates/names, Statue of Power upgrade cost curves)", "est_records": " approx 60 fast travel nodes, 10 Statue upgrade ranks", "match": None},
        {"name": "Transfer & Trading System", "what": "Pal Trade network, Pal Merchant sell/buy price formulas, Black Marketeer rare Pal rotation", "source": "paldb.cc / Merchant", "structured": "Yes (Buy/sell multipliers, price calculation formulas, stock pools)", "est_records": "300 Pal trade price multipliers + shop stock pools", "match": None},
        {"name": "Cosmetics & Pal Skins / Photo Mode", "what": "Pal skins (Chillet skin, Sunglasses, hats) and photo mode controls", "source": "paldb.cc / Skins / Steam Release Notes", "structured": "Yes (Skin ID, target Pal, unlock method / battle pass / DLC)", "est_records": "approx 25 cosmetic skin records", "match": None},
        {"name": "Platform-Specific Differences", "what": "Xbox vs PC Steam differences (Dedicated server support, password protection, crossplay, update parity)", "source": "Pocketpair Official Patch Notes / Steam Store", "structured": "No (Unstructured feature flag notes)", "est_records": "5 platform capability records", "match": None}
    ]

    unmatched = [item for item in phase1_items if item["match"] is None]
    matched = [item for item in phase1_items if item["match"] is not None]

    print(f"Phase 2 Diff Summary: Matched categories = {len(matched)}, UNMATCHED categories = {len(unmatched)}")
    with open("tmp/research/phase2_diff.json", "w") as f:
        json.dump({"matched": matched, "unmatched": unmatched}, f, indent=2)

if __name__ == '__main__':
    run_diff()
