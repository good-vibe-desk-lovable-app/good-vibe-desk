// HAND-MAINTAINED (not emitted by scripts/emit-paldb.py, which owns dataGaps.ts).
// MODEL_GAPS contains only limitations that currently affect what the app can
// compute or claim. Settled reconciliations live in MODEL_FACTS instead.

export interface ModelGap {
  area: string;
  summary: string;
  detail: string;
  status: "known-limitation" | "unresolved";
}

export interface ModelFact {
  area: string;
  summary: string;
  detail: string;
}

/** Settled data reconciliations; these are facts, not current limitations. */
export const MODEL_FACTS: ModelFact[] = [
  {
    area: "data/palworld/skills.ts — active-skill catalogue reconciliation",
    summary: "Settled: the roster exposes all 307 unique PalDB Active Skills names.",
    detail:
      "PalDB's Active Skills catalogue lists 315 cards, comprising 307 unique display names and " +
      "eight duplicate-label rows. The 300 parsed roster pages expose every one of those 307 unique " +
      "catalogue names. PalCalc db.json v27 has 320 internal active-skill rows (312 unique display " +
      "names); its five additional display names are Predator Blast, Predator Mark, Predator Surge, " +
      "Psycho Gravity, and Use Weapon, which are not listed by PalDB's catalogue and are marked " +
      "CanInherit: false in PalCalc. The user-facing active-skill total is therefore 307, not an " +
      "unexplained shortfall.",
  },
];

export const MODEL_GAPS: ModelGap[] = [
  {
    area: "pathfinder/core.ts — parent passive pool",
    summary: "Parent passive union is incomplete inclusion–exclusion.",
    detail:
      "The draw pool is computed as a.passiveCount + b.passiveCount - popcount(a.mask & b.mask). " +
      "`mask` tracks only DESIRED passives while `passiveCount` counts ALL passives on the parent, " +
      "so two parents that share a NON-desired passive are still double-counted and the pool is " +
      "overstated (success odds understated) for those pairs. Directionally correct, not exact. " +
      "A true union needs full passive-set tracking per search state, which is a larger change.",
    status: "known-limitation",
  },
  {
    area: "pathfinder/inheritance.ts — expected eggs",
    summary: "Expected-egg totals are approximate, with no universal directional guarantee.",
    detail:
      "PalCalc's published 4/3/2/1 parent-inheritance and 4/3/2/1 random-addition weights were " +
      "checked. They validate the existing one-step inherited-passive marginal but are insufficient " +
      "for an exact chain model: random-passive identities and selection rules, duplicate behaviour, " +
      "and full intermediate passive-set distributions are unavailable. Random additions can enlarge " +
      "a later pool, duplicate an existing trait, or supply a desired trait, so totals are not proven " +
      "lower or upper bounds. PalCalc's own solver documents the same placeholder-random-passive " +
      "limitation.",
    status: "known-limitation",
  },
  {
    area: "data/palworld/spawns.ts — field spawn rows",
    summary: "Per-point spawn rows are incomplete; habitat counts are the reliable signal.",
    detail:
      "Only 187 field spawn points were parsed across 299 Pals — Chikipi and Lamball, which are " +
      "everywhere in the overworld, have zero field rows yet 558 and 723 habitat spawn points " +
      "respectively. Acquisition classification (src/lib/acquisition.ts) uses PAL_HABITAT totals and " +
      "positive raid, dungeon, tower, and manual channel evidence; it reports 'unknown' rather than " +
      "an unsupported negative acquisition conclusion where no positive evidence exists.",
    status: "known-limitation",
  },
  {
    area: "data/palworld — tower-boss source coverage",
    summary:
      "Eight tower Pal entries are two-source corroborated; one source-only pair remains excluded.",
    detail:
      "The generated towers.ts module retains both source URLs, sourceTier 3, and sourceKind " +
      "'wiki-corroborated' on each of the eight shared Palworld Wiki and Game8 records. The Game8-only " +
      "Zenara and Astralym pair is retained solely as an exclusion record: it is not positive tower " +
      "evidence and must never create a Tower boss channel or badge. The app leaves unsupported " +
      "acquisition unknown rather than resolving it by guess.",
    status: "known-limitation",
  },
  {
    area: "combat/element effectiveness matrix",
    summary: "Numeric elemental effectiveness is deliberately unmodelled.",
    detail:
      "PalCalc's Elements key contains only the nine canonical element identities and no matchup, " +
      "resistance, or multiplier fields. Bounded community charts were reviewed but were either " +
      "unsupported by a game-file source or internally inconsistent, so the app may describe element " +
      "identity but must not claim numeric effectiveness. Reopen only for a versioned game-data " +
      "extraction that contains the matrix or an official Pocketpair table that defines its values and " +
      "semantics.",
    status: "known-limitation",
  },
  {
    area: "team planner — base-work throughput",
    summary:
      "Work-suitability ranks are not converted into a production-time or output-per-minute score.",
    detail:
      "The base-work planner can display source-backed suitability ranks and Pal-specific condensation progression, but no versioned complete formula connects those ranks to task time. Work-speed passives, Applied Technique books, Pal Labor Research, facility/task rules, SAN, food, pathing, and animation time remain outside the model. The app therefore compares one selected suitability rank at a time and must not label a row as universally best or as items per minute. Reopen a throughput calculation only with a versioned game-data formula plus controlled task-time validation for each work category.",
    status: "known-limitation",
  },
  {
    area: "team planner — encounter-specific combat and PvP",
    summary: "The planner cannot recommend counter-teams or model PvP outcomes.",
    detail:
      "The combat comparison can show source-backed Pal base-stat values, canonical element identities, " +
      "and encounter-record membership, but it has no enemy combat profiles, active-skill damage or " +
      "cooldowns, versioned damage formula, player loadout/build, PvP rule set, or sourced numeric " +
      "element matrix. Encounter context is therefore a non-optimizing record filter only, and PvP is " +
      "unsupported. Reopen encounter optimization only with versioned enemy stats and move data plus a " +
      "documented damage formula and element table; reopen PvP only with those inputs and an explicit " +
      "versioned PvP ruleset.",
    status: "known-limitation",
  },
  {
    area: "data/palworld — mutation breeding (v1.0)",
    summary: "Mutations are a separate species-selection system and are NOT modelled at all.",
    detail:
      "Palworld 1.0 mutated eggs can produce a different species. Community calculators consistently " +
      "report a 1% regular-cake chance and 3% Extravagant Vegetable Cake chance, plus a stronger " +
      "breeding-score requirement; however, no game-extracted eligible-species matrix or selection " +
      "weighting was sourceable. resolveChild() therefore models only the deterministic child and " +
      "the pathfinder never proposes a mutation route or counts one against expected eggs. Adding it " +
      "requires a separately sourced graph layer, not invented edges in the existing one.",
    status: "unresolved",
  },
  {
    area: "capture/formula — capture probability formula",
    summary: "Capture probability formula is unobtainable from public sources.",
    detail:
      "Reason code GAP_CAPTURE_PROBABILITY_FORMULA: The exact mathematical formula mapping Pal Sphere type, target HP percentage, status condition, Pal grade/level, and Lifmunk Effigy bonus to capture success percentage is unverified across public datamines. " +
      "Resolution: Reopen only when a versioned game-assembly extraction (e.g. UPalCaptureJudge / UPalSphereCaptureModule) or verified Pocketpair formula table is supplied.",
    status: "unresolved",
  },
  {
    area: "progression/experience — experience award and level curve",
    summary:
      "Experience award amounts and character/Pal level curve formulas are unobtainable from public sources.",
    detail:
      "Reason code GAP_EXPERIENCE_LEVEL_CURVE: Exact XP required per level rank (1-80) and exact XP awarded per activity (capture bonus scaling, kill XP, craft XP) are unpublished in public datasets. " +
      "Resolution: Reopen when the internal PalExpTable / PlayerExpTable datamined asset arrays are extracted and checked.",
    status: "unresolved",
  },
  {
    area: "stats/iv — IV-to-stat potential formula",
    summary: "Individual Value (IV) stat potential formulas are unobtainable from public sources.",
    detail:
      "Reason code GAP_IV_TO_STAT_FORMULA: Individual Values (0-100% or 0-30 talent ranks for HP, Attack, Defense) alter final stat scaling, but exact integer rounding, base stat multipliers, and talent pass-down formulas are unmodeled. " +
      "Resolution: Reopen upon extraction of PalTalentFormula / UPalStatCalculator code or versioned datamined talent tables.",
    status: "unresolved",
  },
  {
    area: "breeding/incubation — breeding time and incubation temperature multiplier",
    summary:
      "Breeding production duration and incubation temperature scalar formulas are unobtainable from public sources.",
    detail:
      "Reason code GAP_BREEDING_INCUBATION_TIMERS: Exact egg production tick counts in Breeding Farm and precise thermal multipliers (+50%, +100%, -50% speed penalties for cold/hot ambient environments across egg elements) lack versioned game-code source values. " +
      "Resolution: Reopen when PalEggIncubateParameter and PalBreedingFarmProcess tick constants are extracted from game binary or datamined configuration files.",
    status: "unresolved",
  },
  {
    area: "survival/depletion — hunger and SAN depletion rates",
    summary: "Hunger decay and SAN depletion rate formulas are unobtainable from public sources.",
    detail:
      "Reason code GAP_HUNGER_SAN_DEPLETION_RATES: Base metabolic depletion rates, work-assignment SAN decay rates, food SAN/satiety recovery values, and nocturnal/sleep mechanics are unmodeled. " +
      "Resolution: Reopen when PalIndividualCharacterParameter hunger/SAN decay ticks and task-consumption tables are extracted from game assets.",
    status: "unresolved",
  },
];
