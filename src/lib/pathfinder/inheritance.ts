// Probability model for passive inheritance during breeding.
//
// Model (mirrors tylercamp/palcalc PassiveSkillProbability):
//  1. The child inherits N passives from the COMBINED pool of its parents'
//     distinct passives, where N is drawn from a fixed weight table
//     (1 is likeliest, 4 the rarest).
//  2. Those N are drawn uniformly WITHOUT replacement from the pool, so the
//     odds that a specific desired subset of size k lands is hypergeometric:
//        P(k desired | N drawn, pool m) = C(m - k, N - k) / C(m, N)
//  3. The game may then roll additional random passives into free slots. That
//     can only help (it never removes an inherited passive), so it is ignored
//     here — the model is a lower bound on success odds.

export interface InheritStepInput {
  /** distinct passives across both parents (the draw pool) */
  parentPassiveCount: number;
  /** desired passives that must land on the child (0–4) */
  desiredCount: number;
}

/**
 * Relative weights for how many passives are inherited from the parent pool.
 * palcalc: 4 / 3 / 2 / 1 for 1..4 inherited passives.
 */
export const INHERITED_COUNT_WEIGHTS: Record<number, number> = {
  1: 4,
  2: 3,
  3: 2,
  4: 1,
};

const WEIGHT_TOTAL = Object.values(INHERITED_COUNT_WEIGHTS).reduce((a, b) => a + b, 0);

/** Normalised P(N = n) for n = 1..4. */
export function inheritedCountProbability(n: number): number {
  return (INHERITED_COUNT_WEIGHTS[n] ?? 0) / WEIGHT_TOTAL;
}

export const MAX_PASSIVE_SLOTS = 4;

/** Never let odds collapse to zero — the search needs a finite cost. */
const MIN_PROBABILITY = 0.0005;

/** Cap on expected attempts so a hopeless step stays comparable, not infinite. */
export const MAX_EXPECTED_ATTEMPTS = 2000;

function choose(n: number, k: number): number {
  if (k < 0 || k > n || n < 0) return 0;
  let r = 1;
  const kk = Math.min(k, n - k);
  for (let i = 0; i < kk; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

function clampDesired(desiredCount: number): number {
  if (!Number.isFinite(desiredCount) || desiredCount <= 0) return 0;
  return Math.min(MAX_PASSIVE_SLOTS, Math.floor(desiredCount));
}

/** Probability that one breeding attempt yields the desired passive set. In (0, 1]. */
export function stepSuccessProbability(input: InheritStepInput): number {
  const k = clampDesired(input.desiredCount);
  if (k === 0) return 1;

  const pool = Math.max(
    k,
    Number.isFinite(input.parentPassiveCount)
      ? Math.floor(input.parentPassiveCount)
      : k,
  );

  let p = 0;
  for (let n = k; n <= MAX_PASSIVE_SLOTS; n++) {
    const draws = Math.min(n, pool);
    if (draws < k) continue;
    const total = choose(pool, draws);
    if (total === 0) continue;
    p += inheritedCountProbability(n) * (choose(pool - k, draws - k) / total);
  }
  return Math.min(1, Math.max(MIN_PROBABILITY, p));
}

/** Expected number of eggs needed for one step to succeed. >= 1. */
export function expectedAttempts(input: InheritStepInput): number {
  const p = stepSuccessProbability(input);
  return Math.min(MAX_EXPECTED_ATTEMPTS, 1 / p);
}
