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
 * One long-lived worker, reused across searches.
 *
 * Why: dataset module init inside the worker costs ~160ms on desktop (and
 * several hundred ms on mobile) — an order of magnitude more than a typical
 * 20ms search. Spawning a fresh worker per run paid that on every click, and
 * four times per "Find chain" once alternatives were collected. Reuse pays it
 * once per session. A `requestId` echoed by the worker keeps overlapping or
 * abandoned runs from cross-talking; the worker is only torn down (and lazily
 * respawned) after a timeout or crash, when its internal state is suspect.
 */
let sharedWorker: Worker | null = null;
let nextRequestId = 1;

function getWorker(): Worker {
  if (!sharedWorker) {
    sharedWorker = new Worker(new URL("./pathfinder.worker.ts", import.meta.url), {
      type: "module",
    });
  }
  return sharedWorker;
}

function killWorker() {
  sharedWorker?.terminate();
  sharedWorker = null;
}

/**
 * Spawns the shared worker ahead of the first search so the dataset module
 * init (~160ms) is paid while the user is still filling in their collection.
 * Posts nothing; safe to call repeatedly.
 */
export function warmPathfinder(): void {
  if (typeof Worker === "undefined") return;
  getWorker();
}


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
    const worker = getWorker();
    const requestId = nextRequestId++;

    let best: Result | null = null;
    let settled = false;

    const finish = (result: Result, opts?: { crashed?: boolean }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      // A timed-out or crashed worker may still be mid-search or in an unknown
      // state — discard it; the next run lazily spawns a fresh one.
      if (opts?.crashed) killWorker();
      resolve(result);
    };

    // The search self-terminates at `timeoutMs` and posts partial results;
    // this outer timer is only a watchdog for a wedged worker.
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
        { crashed: true },
      );
    }, timeoutMs + 500);

    const onMessage = (event: MessageEvent<WorkerOutbound>) => {
      const msg = event.data;
      if (msg.requestId !== requestId) return; // stale reply from a superseded run
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

    const onError = () => {
      finish(
        findBreedingChain(input.targetId, input.collection, input.desiredSources, options),
        { crashed: true },
      );
    };

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.postMessage({ ...input, options, requestId } satisfies PathfinderInput);
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
