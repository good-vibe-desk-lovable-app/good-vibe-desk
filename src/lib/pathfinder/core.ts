// Pure search core. Takes its data through `deps` so tests can run on tiny
// fixtures without importing the full Palworld dataset.
import type {
  BreedingVia,
  CollectionEntry,
  PathfinderOptions,
  Result,
  Step,
} from "./types";

export interface ResolverPal {
  id: number;
  name?: string;
  combiRank: number;
  breedingPowerPriority: number;
  indexOrder: number;
  breedingEligible: boolean;
  isVariant: boolean;
}

export interface ResolverCombo {
  parent1Id: number;
  parent2Id: number;
  childId: number;
  orderSensitive?: boolean;
}

export type Resolve = (a: number, b: number) => { childId: number; via: BreedingVia } | null;

export interface SearchDeps {
  resolve: Resolve;
  sameSpeciesOnly: Set<number>;
  nameOf: (palId: number) => string;
  /** Breeding power, used to steer the beam toward the target species. */
  rankOf?: (palId: number) => number;
}


/**
 * Mirrors src/data/palworld/breeding.ts exactly, but over supplied fixtures.
 * Used by the tests; production code passes the generated resolver instead.
 */
export function createResolver(pals: ResolverPal[], combos: ResolverCombo[] = []): Resolve {
  const byId = new Map(pals.map((p) => [p.id, p]));
  const eligible = pals.filter((p) => p.breedingEligible);
  const ordered = new Map<string, ResolverCombo>();
  const symmetric = new Map<string, ResolverCombo>();
  for (const c of combos) {
    if (c.orderSensitive) ordered.set(`${c.parent1Id}:${c.parent2Id}`, c);
    else
      symmetric.set(
        `${Math.min(c.parent1Id, c.parent2Id)}:${Math.max(c.parent1Id, c.parent2Id)}`,
        c,
      );
  }

  return (parent1Id, parent2Id) => {
    const p1 = byId.get(parent1Id);
    const p2 = byId.get(parent2Id);
    if (!p1 || !p2) return null;

    const ordA = ordered.get(`${parent1Id}:${parent2Id}`);
    if (ordA) return { childId: ordA.childId, via: "unique" };
    const ordB = ordered.get(`${parent2Id}:${parent1Id}`);
    if (ordB) return { childId: ordB.childId, via: "unique" };
    const sym = symmetric.get(
      `${Math.min(parent1Id, parent2Id)}:${Math.max(parent1Id, parent2Id)}`,
    );
    if (sym) return { childId: sym.childId, via: "unique" };

    if (parent1Id === parent2Id) return { childId: parent1Id, via: "same-species" };

    const target = Math.floor((p1.combiRank + p2.combiRank + 1) / 2);
    let best: ResolverPal | null = null;
    let bestDiff = Infinity;
    let bestPri = -Infinity;
    let bestVariant = 2;
    let bestIdx = Infinity;
    for (const p of eligible) {
      const diff = Math.abs(p.combiRank - target);
      const variant = p.isVariant ? 1 : 0;
      if (
        diff < bestDiff ||
        (diff === bestDiff && p.breedingPowerPriority > bestPri) ||
        (diff === bestDiff && p.breedingPowerPriority === bestPri && variant < bestVariant) ||
        (diff === bestDiff &&
          p.breedingPowerPriority === bestPri &&
          variant === bestVariant &&
          p.indexOrder < bestIdx)
      ) {
        best = p;
        bestDiff = diff;
        bestPri = p.breedingPowerPriority;
        bestVariant = variant;
        bestIdx = p.indexOrder;
      }
    }
    return best ? { childId: best.id, via: "formula" } : null;
  };
}

export const MAX_PASSIVE_SLOTS = 4;

/** Hard cap on how many distinct source Pals a single search can merge. */
export const MAX_SOURCES = 6;

/** Per passive-set, how many alternative carrier species we keep as merge partners. */
const CARRIERS_PER_MASK = 8;

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function popcount(n: number): number {
  let c = 0;
  while (n) {
    n &= n - 1;
    c++;
  }
  return c;
}

/**
 * A state is "a Pal of species `palId` carrying the passives of `mask`",
 * together with the cheapest known way to obtain it. Leaves come straight from
 * the collection; every other state is produced by breeding two other states.
 */
interface State {
  key: string;
  palId: number;
  mask: number;
  /** number of breeding steps needed to obtain this state */
  cost: number;
  a: State | null;
  b: State | null;
  via: BreedingVia | null;
  /** leaf-only: the collection entry this state came from */
  instanceId?: string;
  gender?: CollectionEntry["gender"];
}

export function search(
  deps: SearchDeps,
  targetId: number,
  collection: CollectionEntry[],
  desiredSources: string[],
  options: PathfinderOptions = {},
  onProgress?: (partial: Result) => void,
): Result {
  const started = now();
  const maxCost = options.maxDepth ?? 12;
  const timeoutMs = options.timeoutMs ?? 5000;
  const forbid = options.forbidFinalPair
    ? `${Math.min(...options.forbidFinalPair)}:${Math.max(...options.forbidFinalPair)}`
    : null;
  const enforceGender = options.enforceGender ?? false;

  const warnings: string[] = [];
  const byInstance = new Map(collection.map((e) => [e.instanceId, e]));
  let desired = desiredSources.filter((id) => byInstance.has(id));
  if (desired.length < desiredSources.length) {
    warnings.push("Some selected passives referenced Pals that are no longer in your collection.");
  }
  if (desired.length > MAX_SOURCES) {
    warnings.push(
      `Only the first ${MAX_SOURCES} source Pals are searched — merging more than that is not realistic in game.`,
    );
    desired = desired.slice(0, MAX_SOURCES);
  }
  const goalMask = (1 << desired.length) - 1;
  const sourcesOf = (mask: number) => desired.filter((_, i) => (mask >> i) & 1);

  const fail = (message?: string): Result => ({
    status: "impossible",
    steps: [],
    coveredSources: [],
    missingSources: desired,
    warnings: message ? [...warnings, message] : warnings,
    elapsedMs: now() - started,
  });

  // A same-species-only Pal can never be produced from other species.
  if (deps.sameSpeciesOnly.has(targetId) && !collection.some((e) => e.palId === targetId)) {
    const name = deps.nameOf(targetId);
    return fail(`${name} can only be produced by breeding two ${name}s — none in your collection.`);
  }

  const best = new Map<string, State>();
  const buckets: State[][] = [];
  let bestPartial: State | null = null;

  // Track the best target-species state as soon as it is discovered, so a
  // partial answer survives even when the full goal is never reached.
  const noteTarget = (s: State) => {
    if (s.palId !== targetId) return;
    if (
      !bestPartial ||
      popcount(s.mask) > popcount(bestPartial.mask) ||
      (popcount(s.mask) === popcount(bestPartial.mask) && s.cost < bestPartial.cost)
    ) {
      bestPartial = s;
    }
  };

  const push = (state: State) => {
    const existing = best.get(state.key);
    if (existing && existing.cost <= state.cost) return;
    best.set(state.key, state);
    noteTarget(state);
    (buckets[state.cost] ??= []).push(state);
  };

  for (const entry of collection) {
    const i = desired.indexOf(entry.instanceId);
    const mask = i >= 0 ? 1 << i : 0;
    push({
      key: `${entry.palId}:${mask}`,
      palId: entry.palId,
      mask,
      cost: 0,
      a: null,
      b: null,
      via: null,
      instanceId: entry.instanceId,
      gender: entry.gender,
    });
    if (mask !== 0) {
      // The same Pal is also usable purely as a species (no passives carried).
      push({
        key: `${entry.palId}:0`,
        palId: entry.palId,
        mask: 0,
        cost: 0,
        a: null,
        b: null,
        via: null,
        instanceId: entry.instanceId,
        gender: entry.gender,
      });
    }
  }

  if (best.size === 0) return fail("Your collection is empty — add some Pals first.");

  const goalKey = `${targetId}:${goalMask}`;
  const settledZero: State[] = [];
  const carriers = new Map<number, State[]>();

  const genderWarning = (a: State, b: State): string | null => {
    if (!a.instanceId || !b.instanceId) return null;
    if (a.gender === "unknown" || b.gender === "unknown") return null;
    if (a.gender !== b.gender) return null;
    return `${deps.nameOf(a.palId)} + ${deps.nameOf(b.palId)} are both ${a.gender} — you'll need one of the opposite gender.`;
  };

  const combine = (a: State, b: State) => {
    if (a === b) return; // one Pal cannot breed with itself
    if (a.instanceId && a.instanceId === b.instanceId) return;
    if (enforceGender && genderWarning(a, b)) return;
    const newMask = a.mask | b.mask;
    if (newMask === a.mask && newMask === b.mask && a.palId === b.palId) return;
    const res = deps.resolve(a.palId, b.palId);
    if (!res) return;
    if (forbid && res.childId === targetId) {
      const pairKey = `${Math.min(a.palId, b.palId)}:${Math.max(a.palId, b.palId)}`;
      if (pairKey === forbid) return;
    }
    // Depth of the breeding tree: shared sub-results are bred once, so depth
    // tracks real effort better than summing both branches.
    const cost = Math.max(a.cost, b.cost) + 1;
    if (cost > maxCost) return;
    const key = `${res.childId}:${newMask}`;
    const existing = best.get(key);
    if (existing && existing.cost <= cost) return;
    const child: State = {
      key,
      palId: res.childId,
      mask: newMask,
      cost,
      a,
      b,
      via: res.via,
    };
    push(child);
  };

  let goal = best.get(goalKey) ?? null;
  if (goal) {
    return reconstruct(goal, deps, desired, goalMask, warnings, now() - started, sourcesOf);
  }

  let lastProgress = now();
  outer: for (let cost = 0; cost <= maxCost; cost++) {
    const bucket = buckets[cost];
    if (!bucket) continue;
    for (const state of bucket) {
      if (best.get(state.key) !== state) continue; // superseded by a cheaper route
      if (now() - started > timeoutMs) break outer;

      if (state.key === goalKey) {
        goal = state;
        break outer;
      }

      // Merge with every settled species-only partner (this also grows the set
      // of reachable species), then with the best carriers of other passive sets.
      for (const partner of settledZero) combine(state, partner);
      for (const [mask, list] of carriers) {
        if ((state.mask | mask) === state.mask) continue; // adds nothing new
        for (const partner of list) combine(state, partner);
      }

      if (state.mask === 0) {
        settledZero.push(state);
      } else {
        const list = carriers.get(state.mask) ?? [];
        list.push(state);
        list.sort((x, y) => x.cost - y.cost);
        carriers.set(state.mask, list.slice(0, CARRIERS_PER_MASK));
      }

      goal = best.get(goalKey) ?? null;
      if (goal) break outer;

      if (onProgress && now() - lastProgress > 250) {
        lastProgress = now();
        onProgress(
          bestPartial
            ? reconstruct(bestPartial, deps, desired, goalMask, warnings, now() - started, sourcesOf)
            : {
                status: "impossible",
                steps: [],
                coveredSources: [],
                missingSources: desired,
                warnings,
                elapsedMs: now() - started,
              },
        );
      }
    }
  }

  const final = goal ?? bestPartial;
  if (!final) return fail("No breeding chain reaches that Pal from your collection.");
  return reconstruct(final, deps, desired, goalMask, warnings, now() - started, sourcesOf);
}

function reconstruct(
  goal: State,
  deps: SearchDeps,
  desired: string[],
  goalMask: number,
  baseWarnings: string[],
  elapsedMs: number,
  sourcesOf: (mask: number) => string[],
): Result {
  const steps: Step[] = [];
  const seen = new Set<string>();
  const warnings = [...baseWarnings];

  const visit = (state: State) => {
    if (!state.a || !state.b || seen.has(state.key)) return;
    seen.add(state.key);
    visit(state.a);
    visit(state.b);
    if (
      state.a.instanceId &&
      state.b.instanceId &&
      state.a.gender &&
      state.b.gender &&
      state.a.gender !== "unknown" &&
      state.a.gender === state.b.gender
    ) {
      warnings.push(
        `${deps.nameOf(state.a.palId)} + ${deps.nameOf(state.b.palId)} are both ${state.a.gender} — you'll need one of the opposite gender.`,
      );
    }
    steps.push({
      index: steps.length + 1,
      parent1: state.a.palId,
      parent2: state.b.palId,
      child: state.palId,
      via: state.via!,
      carriedSources: sourcesOf(state.mask),
    });
  };
  visit(goal);

  for (const step of steps) {
    if (step.carriedSources.length > MAX_PASSIVE_SLOTS) {
      warnings.push(
        `Step ${step.index} carries ${step.carriedSources.length} passives — a Pal can only hold ${MAX_PASSIVE_SLOTS}, so some will be lost.`,
      );
    }
  }

  const covered = sourcesOf(goal.mask);
  const missing = desired.filter((id) => !covered.includes(id));
  return {
    status: goal.mask === goalMask ? "ok" : "partial",
    steps,
    coveredSources: covered,
    missingSources: missing,
    warnings,
    elapsedMs,
  };
}
