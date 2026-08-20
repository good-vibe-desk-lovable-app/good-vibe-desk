import type { GenerateSWOptions } from "workbox-build";

export function createWorkboxOptions(
  outDir: string,
): Omit<GenerateSWOptions, "swDest" | "cleanupOutdatedCaches" | "dontCacheBustURLsMatching" | "mode" | "skipWaiting" | "clientsClaim">;
