/// <reference lib="webworker" />
import { findBreedingChain } from "./pathfinder";
import type { PathfinderInput, WorkerOutbound } from "./types";

self.onmessage = (event: MessageEvent<PathfinderInput>) => {
  const { targetId, collection, desiredSources, options, requestId } = event.data;
  const post = (msg: WorkerOutbound) => self.postMessage({ ...msg, requestId });
  try {
    const result = findBreedingChain(targetId, collection, desiredSources, options, (best) =>
      post({ type: "progress", best }),
    );
    post({ type: "done", result });
  } catch (error) {
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
