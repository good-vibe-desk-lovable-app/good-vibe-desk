#!/usr/bin/env node
/**
 * Reject unexpected record loss in a generated Palworld knowledge dataset.
 *
 * Usage:
 *   node scripts/check-knowledge-coverage.mjs <current.json> <baseline.json>
 *
 * The sidecar JSON must satisfy the DatasetCoverage shape in
 * src/data/palworld/knowledge.ts. Intentional reductions require an explicit
 * `KNOWLEDGE_COVERAGE_ALLOW_DECREASE=1` environment variable and must be
 * explained in the PR. This is deliberately Node-built-ins only so it remains
 * compatible with the Cloudflare build environment.
 */
import { existsSync, readFileSync } from "node:fs";

const [currentPath, baselinePath] = process.argv.slice(2);
if (!currentPath || !baselinePath) {
  console.error("Usage: check-knowledge-coverage.mjs <current.json> <baseline.json>");
  process.exit(2);
}

function readCoverage(path) {
  if (!existsSync(path)) {
    console.error(`[knowledge-coverage] missing coverage file: ${path}`);
    process.exit(2);
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    console.error(`[knowledge-coverage] invalid JSON at ${path}: ${error.message}`);
    process.exit(2);
  }
  if (
    !parsed ||
    typeof parsed.dataset !== "string" ||
    !Number.isInteger(parsed.recordCount) ||
    parsed.recordCount < 0 ||
    !Array.isArray(parsed.sourceUrls) ||
    parsed.sourceUrls.some((url) => typeof url !== "string" || !url.startsWith("https://"))
  ) {
    console.error(`[knowledge-coverage] invalid DatasetCoverage shape at ${path}`);
    process.exit(2);
  }
  return parsed;
}

const current = readCoverage(currentPath);
const baseline = readCoverage(baselinePath);
if (current.dataset !== baseline.dataset) {
  console.error(
    `[knowledge-coverage] dataset mismatch: current=${current.dataset}, baseline=${baseline.dataset}`,
  );
  process.exit(2);
}

const delta = current.recordCount - baseline.recordCount;
console.log(
  `[knowledge-coverage] ${current.dataset}: ${baseline.recordCount} -> ${current.recordCount} (${delta >= 0 ? "+" : ""}${delta})`,
);

const currentCounts = current.counts ?? {};
const baselineCounts = baseline.counts ?? {};
for (const key of new Set([...Object.keys(baselineCounts), ...Object.keys(currentCounts)])) {
  const before = baselineCounts[key] ?? 0;
  const after = currentCounts[key] ?? 0;
  const itemDelta = after - before;
  console.log(
    `[knowledge-coverage] ${current.dataset}.${key}: ${before} -> ${after} (${itemDelta >= 0 ? "+" : ""}${itemDelta})`,
  );
  if (itemDelta < 0 && process.env.KNOWLEDGE_COVERAGE_ALLOW_DECREASE !== "1") {
    console.error(
      `[knowledge-coverage] FAILED: ${current.dataset}.${key} lost ${Math.abs(itemDelta)} records. ` +
        "Inspect the parser/source change; set KNOWLEDGE_COVERAGE_ALLOW_DECREASE=1 only for a reviewed intentional removal.",
    );
    process.exit(1);
  }
}

if (delta < 0 && process.env.KNOWLEDGE_COVERAGE_ALLOW_DECREASE !== "1") {
  console.error(
    `[knowledge-coverage] FAILED: ${current.dataset} lost ${Math.abs(delta)} records. ` +
      "Inspect the parser/source change; set KNOWLEDGE_COVERAGE_ALLOW_DECREASE=1 only for a reviewed intentional removal.",
  );
  process.exit(1);
}
