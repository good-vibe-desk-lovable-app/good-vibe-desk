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

interface Owned {
  palId: number;
  /** bitmask over desiredSources */
  mask: number;
  gender: "male" | "female" | "unknown";
  /** true when this instance came from the collection (explicit gender matters) */
  fromCollection: boolean;
  instanceId?: string;
}

interface Node {
  owned: Owned[];
  depth: number;
  parent: Node | null;
  step: Omit<Step, "index"> | null;
  /** parents' explicit-gender clash, recorded for warnings */
  genderClash: string | null;
  overloaded: boolean;
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function stateKey(owned: Owned[]): string {
  return owned
    .map((o) => `${o.palId}.${o.mask}.${o.fromCollection ? o.gender[0] : "x"}`)
    .sort()
    .join("|");
}

function popcount(n: number): number {
  let c = 0;
  while (n) {
    n &= n - 1;
    c++;
  }
  return c;
}

function reconstruct(
  node: Node,
  deps: SearchDeps,
  desired: string[],
  goalMask: number,
  bestMask: number,
  elapsedMs: number,
  extraWarnings: string[],
): Result {
  const chain: Node[] = [];
  let cur: Node | null = node;
  while (cur && cur.step) {
    chain.push(cur);
    cur = cur.parent;
  }
  chain.reverse();

  const warnings = [...extraWarnings];
  const steps: Step[] = chain.map((n, i) => {
    if (n.genderClash) warnings.push(n.genderClash);
    if (n.overloaded)
      warnings.push(
        `Step ${i + 1} carries more than ${MAX_PASSIVE_SLOTS} passives — a Pal can only hold ${MAX_PASSIVE_SLOTS}, so some will be lost.`,
      );
    return { ...n.step!, index: i + 1 };
  });

  const covered = desired.filter((_, i) => (bestMask >> i) & 1);
  const missing = desired.filter((_, i) => !((bestMask >> i) & 1));
  const status: Result["status"] = bestMask === goalMask ? "ok" : "partial";

  return { status, steps, coveredSources: covered, missingSources: missing, warnings, elapsedMs };
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
  const maxDepth = options.maxDepth ?? 15;
  const timeoutMs = options.timeoutMs ?? 5000;
  const beamWidth = options.beamWidth ?? 1500;
  const enforceGender = options.enforceGender ?? false;
  const forbid = options.forbidFinalPair
    ? `${Math.min(...options.forbidFinalPair)}:${Math.max(...options.forbidFinalPair)}`
    : null;

  const warnings: string[] = [];
  const byInstance = new Map(collection.map((e) => [e.instanceId, e]));
  const desired = desiredSources.filter((id) => byInstance.has(id)).slice(0, 30);
  if (desired.length < desiredSources.length) {
    warnings.push("Some selected passives referenced Pals that are no longer in your collection.");
  }
  const goalMask = desired.length === 32 ? -1 : (1 << desired.length) - 1;

  // Same-species-only guard.
  if (deps.sameSpeciesOnly.has(targetId) && !collection.some((e) => e.palId === targetId)) {
    const name = deps.nameOf(targetId);
    return {
      status: "impossible",
      steps: [],
      coveredSources: [],
      missingSources: desired,
      warnings: [
        ...warnings,
        `${name} can only be produced by breeding two ${name}s — none in your collection.`,
      ],
      elapsedMs: now() - started,
    };
  }

  const seedOwned: Owned[] = collection.map((e) => {
    const i = desired.indexOf(e.instanceId);
    return {
      palId: e.palId,
      mask: i >= 0 ? 1 << i : 0,
      gender: e.gender,
      fromCollection: true,
      instanceId: e.instanceId,
    };
  });

  const root: Node = {
    owned: seedOwned,
    depth: 0,
    parent: null,
    step: null,
    genderClash: null,
    overloaded: false,
  };

  const sourcesOf = (mask: number) => desired.filter((_, i) => (mask >> i) & 1);

  let bestNode: Node = root;
  let bestMask = -1;
  let bestReached = false;
  const evaluate = (node: Node) => {
    let m = -1;
    for (const o of node.owned) {
      if (o.palId !== targetId) continue;
      if (m === -1 || popcount(o.mask) > popcount(m)) m = o.mask;
    }
    if (m === -1) return -1;
    if (!bestReached || popcount(m) > popcount(bestMask) || (popcount(m) === popcount(bestMask) && node.depth < bestNode.depth)) {
      bestReached = true;
      bestMask = m;
      bestNode = node;
    }
    return m;
  };

  const rootMask = evaluate(root);
  if (rootMask === goalMask) {
    return {
      status: "ok",
      steps: [],
      coveredSources: sourcesOf(goalMask),
      missingSources: [],
      warnings,
      elapsedMs: now() - started,
    };
  }

  const visited = new Set<string>([stateKey(root.owned)]);
  let frontier: Node[] = [root];
  let lastProgress = now();

  outer: for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
    const next: Node[] = [];
    for (const node of frontier) {
      if (now() - started > timeoutMs) break outer;
      const owned = node.owned;
      for (let i = 0; i < owned.length; i++) {
        for (let j = i; j < owned.length; j++) {
          const a = owned[i];
          const b = owned[j];
          if (i === j && a.palId !== targetId) continue; // self-pair only useful for the target species
          if (
            enforceGender &&
            a.fromCollection &&
            b.fromCollection &&
            a.gender !== "unknown" &&
            b.gender !== "unknown" &&
            a.gender === b.gender
          )
            continue;

          const res = deps.resolve(a.palId, b.palId);
          if (!res) continue;
          const pairKey = `${Math.min(a.palId, b.palId)}:${Math.max(a.palId, b.palId)}`;
          const newMask = a.mask | b.mask;
          if (forbid && res.childId === targetId && pairKey === forbid) continue;

          // Prune: no gain if we already own this species with at least these sources.
          if (owned.some((o) => o.palId === res.childId && (o.mask & newMask) === newMask)) continue;
          if (res.childId !== targetId && newMask === 0) continue;

          const genderClash =
            a.fromCollection &&
            b.fromCollection &&
            a.gender !== "unknown" &&
            b.gender !== "unknown" &&
            a.gender === b.gender
              ? `Step uses two ${a.gender} Pals (${deps.nameOf(a.palId)} + ${deps.nameOf(b.palId)}) — you need one male and one female.`
              : null;

          const child: Owned = {
            palId: res.childId,
            mask: newMask,
            gender: "unknown",
            fromCollection: false,
          };
          const childNode: Node = {
            owned: [...owned, child],
            depth: node.depth + 1,
            parent: node,
            step: {
              parent1: a.palId,
              parent2: b.palId,
              child: res.childId,
              via: res.via,
              carriedSources: sourcesOf(newMask),
            },
            genderClash,
            overloaded: popcount(newMask) > MAX_PASSIVE_SLOTS,
          };

          const key = stateKey(childNode.owned);
          if (visited.has(key)) continue;
          visited.add(key);

          const m = evaluate(childNode);
          if (m === goalMask) {
            return reconstruct(childNode, deps, desired, goalMask, goalMask, now() - started, warnings);
          }
          next.push(childNode);
        }
      }
    }

    // Beam: keep the most promising states. Nodes that already hold the target
    // species with passives rank first, then broad passive coverage, then how
    // close the carrier species sits to the target's breeding power.
    const rankOf = deps.rankOf ?? (() => 0);
    const targetRank = rankOf(targetId);
    const score = (n: Node) => {
      let targetBits = 0;
      let maxBits = 0;
      let closest = Infinity;
      for (const o of n.owned) {
        const pc = popcount(o.mask);
        if (o.palId === targetId && pc > targetBits) targetBits = pc;
        if (pc > maxBits) maxBits = pc;
        if (pc > 0) closest = Math.min(closest, Math.abs(rankOf(o.palId) - targetRank));
      }
      return (
        targetBits * 1e6 + maxBits * 1e4 - Math.min(closest, 5000) - n.depth * 0.001
      );
    };
    next.sort((x, y) => score(y) - score(x));
    frontier = next.slice(0, beamWidth);


    if (onProgress && now() - lastProgress > 250) {
      lastProgress = now();
      onProgress(
        bestReached
          ? reconstruct(bestNode, deps, desired, goalMask, bestMask, now() - started, warnings)
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

  if (bestReached) {
    return reconstruct(bestNode, deps, desired, goalMask, bestMask, now() - started, warnings);
  }

  return {
    status: "impossible",
    steps: [],
    coveredSources: [],
    missingSources: desired,
    warnings,
    elapsedMs: now() - started,
  };
}
