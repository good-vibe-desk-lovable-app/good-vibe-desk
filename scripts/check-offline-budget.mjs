#!/usr/bin/env node
/**
 * Guard the default offline PWA footprint.
 *
 * Route-level knowledge data must be lazy-loaded or an explicit opt-in pack.
 * The core offline output may not exceed this limit without an intentional,
 * reviewed budget change. The baseline public build measured 3,335,334 bytes
 * on 2026-08-21; 4,500,000 bytes leaves 35% headroom for the knowledge-base
 * contracts and small source metadata, not bulk encyclopaedia/media content.
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const outputDir = process.env.PWA_OUT_DIR ?? ".output/public";
const maxBytes = Number(process.env.PWA_CORE_BUDGET_BYTES ?? 4_500_000);

function directoryBytes(dir) {
  return readdirSync(dir, { withFileTypes: true }).reduce((total, entry) => {
    const path = join(dir, entry.name);
    return total + (entry.isDirectory() ? directoryBytes(path) : statSync(path).size);
  }, 0);
}

let bytes;
try {
  bytes = directoryBytes(outputDir);
} catch (error) {
  console.error(`[offline-budget] FAILED: cannot measure ${outputDir}: ${error.message}`);
  process.exit(1);
}

console.log(`[offline-budget] ${outputDir}: ${bytes} bytes; core budget: ${maxBytes} bytes`);
if (bytes > maxBytes) {
  console.error(
    `[offline-budget] FAILED: core offline output exceeds budget by ${bytes - maxBytes} bytes. ` +
      "Move new knowledge data to a route-level lazy chunk or an explicit opt-in pack; do not silently raise this cap.",
  );
  process.exit(1);
}
