// HAND-MAINTAINED (not emitted by scripts/emit-paldb.py, which owns dataGaps.ts).
// Known modelling limitations — things the app computes approximately, where the
// approximation is documented rather than hidden. Surfaced on /data-check.

export interface ModelGap {
  area: string;
  summary: string;
  detail: string;
  status: "known-limitation" | "unresolved" | "resolved";
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
    area: "data/palworld — tower-boss source coverage",
    summary:
      "Eight tower Pal entries are two-source corroborated; one source-only pair remains excluded.",
    detail:
      "The generated towers.ts module retains both source URLs, sourceTier 3, and sourceKind " +
      "'wiki-corroborated' on each of the eight shared Palworld Wiki and Game8 records. Game8's " +
      "Zenara and Astralym pair is intentionally retained only in TOWER_SOURCE_EXCLUSIONS until an " +
      "independent second source corroborates it; the app does not resolve it by guess.",
    status: "known-limitation",
  },
  {
    area: "PWA navigation — cold offline root document",
    summary: "Resolved: offline navigation now has a precached root application shell.",
    detail:
      "The 2026-08-19 production-shaped investigation found that SSR-on-Workers emitted no HTML " +
      "document for Workbox's navigateFallback to serve, so a cold offline navigation failed. The production " +
      "build now renders its completed Cloudflare worker at '/' into index.html, while all non-root online routes " +
      "remain SSR-rendered with their own metadata. scripts/check-sw.mjs hard-fails unless that root document " +
      "exists and is precached; browser acceptance covers '/', '/explore', and a hash-based share link after " +
      "the server is withdrawn.",
    status: "resolved",
  },
  {
    area: "data/palworld — raid-boss classification",
    summary: "Resolved: PalDB Summoning Altar encounter evidence is generated independently.",
    detail:
      "The generated raid.ts module records all 11 PalDB Summoning Altar cards: nine encounters join to " +
      "five roster Pals, while two Moon Lord cards are retained explicitly as non-roster source evidence. " +
      "Raid evidence remains a positive acquisition flag and does not infer or override dungeon, tower, habitat, " +
      "or breed-only status.",
    status: "resolved",
  },
  {
    area: "data/palworld — dungeon-boss classification",
    summary: "Resolved: hard-validated PalDB dungeon boss evidence is generated independently.",
    detail:
      "The generated dungeons.ts module hard-validates all 14 PalDB Dungeons index families and records " +
      "190 Boss Spawns rows joined to 150 exact roster internal names. Dungeon evidence remains a positive " +
      "acquisition flag and does not infer or override raid, tower, habitat, or breed-only status.",
    status: "resolved",
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
