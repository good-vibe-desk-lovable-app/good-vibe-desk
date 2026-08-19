// HAND-MAINTAINED (not emitted by scripts/emit-paldb.py, which owns dataGaps.ts).
// Known modelling limitations — things the app computes approximately, where the
// approximation is documented rather than hidden. Surfaced on /data-check.

export interface ModelGap {
  area: string;
  summary: string;
  detail: string;
  status: "known-limitation" | "unresolved";
}

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
      "respectively. The exported isBreedOnly() helper in spawns.ts is therefore NOT trustworthy " +
      "and is not used by the UI. Acquisition classification (src/lib/acquisition.ts) uses " +
      "PAL_HABITAT totals instead, and reports 'unknown' rather than 'breed only' wherever there " +
      "is no positive evidence.",
    status: "known-limitation",
  },
  {
    area: "data/palworld — dungeon / boss / raid classification",
    summary: "No dungeon, tower-boss or raid-boss source data exists in the dataset.",
    detail:
      "Nothing in the generated data distinguishes a dungeon-only Pal, a tower boss or a raid boss. " +
      "The 12 Pals with zero habitat spawn points are therefore classified 'acquisition unknown', " +
      "not 'breed only'. Re-crawling paldb.cc with a dungeon/raid parser would resolve this.",
    status: "unresolved",
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
