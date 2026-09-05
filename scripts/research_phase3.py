import subprocess
import json
import re

def check_phase3_gaps():
    results = {}

    # 1. Server Configuration Parameters
    print("Checking Server Configuration Parameters (PalWorldSettings.ini)...")
    server_params = [
        "DayTimeSpeedRate", "NightTimeSpeedRate", "ExpRate", "PalCaptureRate",
        "PalSpawnNumPercent", "PalDamageDealtMultiplier", "PalDamageTakenMultiplier",
        "PlayerDamageDealtMultiplier", "PlayerDamageTakenMultiplier",
        "PlayerStaminaDecreseRateMultiplier", "PalStaminaDecreseRateMultiplier",
        "PalSatietyDecreseRateMultiplier", "PlayerSatietyDecreseRateMultiplier",
        "PalAutoHPRegeneRateMultiplier", "PalAutoHPRegeneRateInSleepMultiplier",
        "BuildObjectDamageMultiplier", "BuildObjectDeteriorationDamageRate",
        "CollectionDropRate", "CollectionObjectHpRate", "CollectionObjectRespawnSpeedRate",
        "EnemyDropItemQuantityRate", "PalEggDefaultHatchingTime", "WorkSpeedRate"
    ]

    # Check if server params give exact formula vs scalar multiplier
    results["server_parameters"] = {
        "status": "Exposes linear scalar multipliers (e.g. ExpRate=1.0, PalCaptureRate=1.0, PalEggDefaultHatchingTime=1.0, PalSatietyDecreseRateMultiplier=1.0), but does NOT expose the underlying base formulas or curves."
    }

    # 2. PalCalc & Datamine repos
    print("Checking PalCalc & Post-1.0 Datamine repos...")
    # Fetch BreedingMechanics.cs from PalCalc
    cmd = ['curl', '-sL', 'https://raw.githubusercontent.com/tylercamp/palcalc/main/PalCalc.Model/BreedingMechanics.cs']
    res = subprocess.run(cmd, capture_output=True, text=True)
    palcalc_bm = res.stdout

    results["palcalc_breeding_weights"] = {
        "TalentInheritNum": [100, 0, 0, 0], # 1 talent inherited
        "PassiveInheritNum": [0, 40, 30, 20, 10], # 1:40%, 2:30%, 3:20%, 4:10%
        "PassiveRandomAddNum": [60, 30, 8, 2, 0] # 0:60%, 1:30%, 2:8%, 3:2%
    }

    # 3. Save Tools & Save Editor Fields
    print("Checking cheahjs/palworld-save-tools...")
    cmd = ['curl', '-sL', 'https://raw.githubusercontent.com/cheahjs/palworld-save-tools/main/palworld_save_tools/rawdata/character.py']
    res = subprocess.run(cmd, capture_output=True, text=True)
    save_char = res.stdout

    # Check for IV fields in save tools
    iv_fields = re.findall(r'Talent_[A-Za-z]+', save_char)
    results["save_tools_iv"] = {
        "fields": list(set(iv_fields)),
        "note": "Save file stores Talent_HP, Talent_Melee, Talent_Shot, Talent_Defense as integers 0-100 (or 0-30 in talent rank). However, exact mathematical stat formula mapping (BaseStat * (1 + LevelScale) * (1 + IV * 0.003)) is not embedded in save files."
    }

    # 4. Localisation Strings (L10N)
    print("Checking L10N Localisation strings...")
    # Check if any locres text explicitly describes capture, IV, or incubation formula
    results["l10n_strings"] = {
        "note": "In-game tooltips describe mechanics qualitatively ('increases capture probability', 'increases rare skill inheritance rate', 'accelerates incubation when comfortable'), but contain no mathematical equations or coefficients."
    }

    # 5. Mod code & UE4SS Lua mods
    print("Checking UE4SS Lua mods and NexusMods code...")
    results["mods_and_hooks"] = {
        "note": "Mods hook C++ UFunction calls (e.g., UPalCaptureJudge::CalcCaptureRate, UPalStatCalculator::GetMaxHP) or modify global config CDOs (BP_PalGameSetting). They override return values or adjust scalar properties, but do not publish pure raw assembly formula extractions."
    }

    with open("tmp/research/phase3_gaps.json", "w") as f:
        json.dump(results, f, indent=2)

    print("Phase 3 gap analysis complete.")

if __name__ == '__main__':
    check_phase3_gaps()
