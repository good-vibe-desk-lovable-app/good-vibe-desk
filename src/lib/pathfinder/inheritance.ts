// Probability model for passive inheritance during breeding.
//
// PROVISIONAL VALUES — placeholder shape only. These numbers are NOT verified
// game constants. They exist so the cost architecture can ship and be tested.
// They MUST be replaced with values extracted from the palcalc project
// (github.com/tylercamp/palcalc) before the numbers shown to users are
// presented as accurate. Do not tune these by intuition.

export interface InheritStepInput {
  /** distinct passives across both parents (0–8) */
  parentPassiveCount: number;
  /** desired passives that must land on the child (0–4) */
  desiredCount: number;
}

/** Base success odds keyed by how many desired passives must land at once. */
export const PASSIVE_INHERIT_TABLE: Record<number, number> = {
  0: 1.0,
  1: 0.45,
  2: 0.25,
  3: 0.12,
  4: 0.06,
};

/** Each extra junk passive in the parent pool dilutes the roll. */
const JUNK_DECAY = 0.9;

/** Never let odds collapse to zero — the search needs a finite cost. */
const MIN_PROBABILITY = 0.005;

/** Cap on expected attempts so a hopeless step stays comparable, not infinite. */
export const MAX_EXPECTED_ATTEMPTS = 200;

function clampDesired(desiredCount: number): number {
  if (!Number.isFinite(desiredCount) || desiredCount <= 0) return 0;
  return Math.min(4, Math.floor(desiredCount));
}

/** Probability that one breeding attempt yields the desired passive set. In (0, 1]. */
export function stepSuccessProbability(input: InheritStepInput): number {
  const desired = clampDesired(input.desiredCount);
  if (desired === 0) return 1;

  const base = PASSIVE_INHERIT_TABLE[desired] ?? MIN_PROBABILITY;
  const parents = Number.isFinite(input.parentPassiveCount)
    ? Math.max(0, Math.floor(input.parentPassiveCount))
    : 0;
  const junk = Math.max(0, parents - desired);
  const p = base * Math.pow(JUNK_DECAY, junk);
  return Math.min(1, Math.max(MIN_PROBABILITY, p));
}

/** Expected number of eggs needed for one step to succeed. >= 1. */
export function expectedAttempts(input: InheritStepInput): number {
  const p = stepSuccessProbability(input);
  return Math.min(MAX_EXPECTED_ATTEMPTS, 1 / p);
}
