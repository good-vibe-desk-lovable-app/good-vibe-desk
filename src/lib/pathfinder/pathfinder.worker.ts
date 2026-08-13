/// <reference lib="webworker" />
import { findBreedingChain } from "./pathfinder";
import type {
  BatchEntry,
  BatchInput,
  PathfinderInput,
  WorkerInbound,
  WorkerOutbound,
} from "./types";

function runBatch(input: BatchInput, post: (msg: WorkerOutbound) => void) {
  const perTarget = input.perTargetTimeoutMs ?? 250;
  const budget = input.budgetMs ?? 10_000;
  const startedAt = Date.now();
  const entries: BatchEntry[] = [];
  let lastPost = 0;
  let truncated = false;

  for (let i = 0; i < input.targetIds.length; i++) {
    if (Date.now() - startedAt > budget) {
      truncated = true;
      break;
    }
    const targetId = input.targetIds[i]!;
    try {
      const res = findBreedingChain(targetId, input.collection, input.desiredSources, {
        timeoutMs: perTarget,
      });
      if (res.steps.length > 0) {
        entries.push({
          targetId,
          totalExpectedEggs: res.totalExpectedEggs,
          stepCount: res.steps.length,
          usedSources: res.coveredSources,
          status: res.status,
        });
      }
    } catch {
      /* one unreachable target must not kill the batch */
    }
    const now = Date.now();
    if (now - lastPost > 400) {
      lastPost = now;
      post({
        type: "batch-progress",
        done: i + 1,
        total: input.targetIds.length,
        entries: rank(entries),
      });
    }
  }

  post({ type: "batch-done", entries: rank(entries), truncated });
}

function rank(entries: BatchEntry[]): BatchEntry[] {
  return [...entries].sort(
    (a, b) => a.totalExpectedEggs - b.totalExpectedEggs || a.stepCount - b.stepCount,
  );
}

self.onmessage = (event: MessageEvent<WorkerInbound>) => {
  const data = event.data;
  const requestId = data.requestId;
  const post = (msg: WorkerOutbound) => self.postMessage({ ...msg, requestId });
  try {
    if ("kind" in data && data.kind === "batch") {
      runBatch(data, post);
      return;
    }
    const { targetId, collection, desiredSources, options } = data as PathfinderInput;
    const result = findBreedingChain(targetId, collection, desiredSources, options, (best) =>
      post({ type: "progress", best }),
    );
    post({ type: "done", result });
  } catch (error) {
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
