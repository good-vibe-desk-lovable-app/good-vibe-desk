#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const [dataset] = process.argv.slice(2);

if (!dataset || process.argv.length !== 3 || !/^[a-z][a-z0-9-]*$/.test(dataset)) {
  console.error("Usage: npm run data:knowledge -- <dataset>");
  console.error("Example: npm run data:knowledge -- field-alphas");
  process.exit(1);
}

const emitter = resolve(root, "scripts", `emit-knowledge-${dataset}.py`);
const baseline = resolve(root, "scripts", "coverage-baselines", `knowledge-${dataset}.json`);
const coverageDirectory = resolve(root, "src", "data", "palworld");
const coverageChecker = resolve(root, "scripts", "check-knowledge-coverage.mjs");

for (const file of [emitter, baseline, coverageChecker]) {
  if (!existsSync(file)) {
    console.error(
      `Knowledge dataset \"${dataset}\" is not registered by convention: missing ${file}`,
    );
    process.exit(1);
  }
}

const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

const baselineDataset = JSON.parse(readFileSync(baseline, "utf8")).dataset;
if (typeof baselineDataset !== "string" || !baselineDataset) {
  console.error(`${baseline}: expected a non-empty dataset field`);
  process.exit(1);
}

run("python3", [emitter]);

const coverageMatches = readdirSync(coverageDirectory)
  .filter((name) => name.endsWith(".coverage.json"))
  .map((name) => resolve(coverageDirectory, name))
  .filter((file) => JSON.parse(readFileSync(file, "utf8")).dataset === baselineDataset);

if (coverageMatches.length !== 1) {
  console.error(
    `Knowledge dataset \"${dataset}\" expected one coverage sidecar for \"${baselineDataset}\", found ${coverageMatches.length}.`,
  );
  process.exit(1);
}

run("node", [coverageChecker, coverageMatches[0], baseline]);
