// Public types for the breeding pathfinder. No React, no DOM.

export type Gender = "male" | "female" | "unknown";

export interface CollectionEntry {
  instanceId: string;
  palId: number;
  gender: Gender;
  passiveIds: string[];
}

/** Set of "${instanceId}:${passiveId}" keys chosen in the UI. */
export type Selection = Set<string>;

export type BreedingVia = "unique" | "same-species" | "formula";

export interface Step {
  index: number;
  parent1: number;
  parent2: number;
  child: number;
  via: BreedingVia;
  /** instanceIds of the original collection Pals whose passives the child carries. */
  carriedSources: string[];
  /** Expected eggs needed for this step to produce the desired passive set. */
  expectedAttempts: number;
}

export interface Result {
  status: "ok" | "partial" | "impossible";
  steps: Step[];
  coveredSources: string[];
  missingSources: string[];
  warnings: string[];
  elapsedMs: number;
  /** Sum of every step's expectedAttempts. */
  totalExpectedEggs: number;
}

export interface PathfinderOptions {
  maxDepth?: number;
  timeoutMs?: number;
  forbidFinalPair?: [number, number];
  enforceGender?: boolean;
  /** Internal safety valve for the frontier width. */
  beamWidth?: number;
}

export interface PathfinderInput {
  targetId: number;
  collection: CollectionEntry[];
  /** instanceIds of the Pals whose passives must end up on the target. */
  desiredSources: string[];
  options?: PathfinderOptions;
  /** Correlates worker replies with the run that issued them (worker reuse). */
  requestId?: number;
}

/** Part 5: one batch request over many targets on the SAME shared worker. */
export interface BatchInput {
  kind: "batch";
  collection: CollectionEntry[];
  desiredSources: string[];
  targetIds: number[];
  /** Per-target search budget. */
  perTargetTimeoutMs?: number;
  /** Whole-batch budget; partial results are returned when it is hit. */
  budgetMs?: number;
  requestId?: number;
}

export interface BatchEntry {
  targetId: number;
  totalExpectedEggs: number;
  stepCount: number;
  usedSources: string[];
  status: Result["status"];
}

export type WorkerInbound = (PathfinderInput & { kind?: "single" }) | BatchInput;

export type WorkerOutbound =
  | { type: "progress"; best: Result; requestId?: number }
  | { type: "done"; result: Result; requestId?: number }
  | { type: "error"; message: string; requestId?: number }
  | {
      type: "batch-progress";
      done: number;
      total: number;
      entries: BatchEntry[];
      requestId?: number;
    }
  | { type: "batch-done"; entries: BatchEntry[]; truncated: boolean; requestId?: number };
