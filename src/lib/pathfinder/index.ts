// Public API for the breeding pathfinder.
export { findBreedingChain } from "./pathfinder";
export { search, createResolver } from "./core";
export type {
  CollectionEntry,
  PathfinderInput,
  PathfinderOptions,
  Result,
  Selection,
  Step,
} from "./types";

import { findBreedingChain } from "./pathfinder";
import type { PathfinderInput, Result, WorkerOutbound } from "./types";

/**
 * Runs the search in a Web Worker so the UI stays responsive.
 * Falls back to a synchronous run when workers are unavailable (SSR/tests).
 */
export function runPathfinder(
  input: PathfinderInput,
  { timeoutMs = 5000 }: { timeoutMs?: number } = {},
): Promise<Result> {
  const options = { ...input.options, timeoutMs };

  if (typeof Worker === "undefined") {
    return Promise.resolve(
      findBreedingChain(input.targetId, input.collection, input.desiredSources, options),
    );
  }

  return new Promise<Result>((resolve) => {
    const worker = new Worker(new URL("./pathfinder.worker.ts", import.meta.url), {
      type: "module",
    });

    let best: Result | null = null;
    let settled = false;

    const finish = (result: Result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish(
        best ?? {
          status: "impossible",
          steps: [],
          coveredSources: [],
          missingSources: input.desiredSources,
          warnings: ["Search timed out before finding a chain."],
          elapsedMs: timeoutMs,
        },
      );
    }, timeoutMs + 500);

    worker.onmessage = (event: MessageEvent<WorkerOutbound>) => {
      const msg = event.data;
      if (msg.type === "progress") best = msg.best;
      else if (msg.type === "done") finish(msg.result);
      else
        finish({
          status: "impossible",
          steps: [],
          coveredSources: [],
          missingSources: input.desiredSources,
          warnings: [msg.message],
          elapsedMs: 0,
        });
    };

    worker.onerror = () => {
      finish(
        findBreedingChain(input.targetId, input.collection, input.desiredSources, options),
      );
    };

    worker.postMessage({ ...input, options } satisfies PathfinderInput);
  });
}

/** Re-runs the search while forbidding the final pair of a previous result. */
export function findAlternative(
  previous: Result,
  input: PathfinderInput,
  opts: { timeoutMs?: number } = {},
): Promise<Result> {
  const last = previous.steps[previous.steps.length - 1];
  const forbidFinalPair: [number, number] | undefined = last
    ? [last.parent1, last.parent2]
    : undefined;
  return runPathfinder(
    { ...input, options: { ...input.options, forbidFinalPair } },
    opts,
  );
}
