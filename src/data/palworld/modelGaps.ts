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
    summary: "Expected-egg totals are a lower bound.",
    detail:
      "Randomly-added passives are ignored. That is exact for a single step (randoms fill leftover " +
      "slots and never displace inherited passives), but across a multi-step chain those extras " +
      "enlarge the next step's parent pool and lower its success probability. Real chains therefore " +
      "cost at least the number shown, usually more the longer they get.",
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
];
