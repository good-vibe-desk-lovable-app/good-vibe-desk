import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

const outDir = resolve(process.env.PWA_OUT_DIR ?? ".output/public");
const packDirectory = resolve(outDir, "knowledge-packs");
const serviceWorker = resolve(outDir, "sw.js");
const expectedRecords = {
  eggs: 1,
  "field-alphas": 65,
  encounters: 633,
  fishing: 1,
  food: 1,
  missions: 117,
  structures: 498,
  technologies: 588,
  "work-suitability": 297,
};

if (!existsSync(serviceWorker)) {
  throw new Error(`[offline-knowledge-packs] missing generated service worker: ${serviceWorker}`);
}

const workerSource = readFileSync(serviceWorker, "utf8");
for (const [name, recordCount] of Object.entries(expectedRecords)) {
  const filename = `${name}.json.gz`;
  const path = resolve(packDirectory, filename);
  if (!existsSync(path)) {
    throw new Error(`[offline-knowledge-packs] missing compressed ${name} pack: ${path}`);
  }

  let payload;
  try {
    payload = JSON.parse(gunzipSync(readFileSync(path)).toString("utf8"));
  } catch (error) {
    throw new Error(
      `[offline-knowledge-packs] ${filename} is not a valid gzip JSON archive: ${String(error)}`,
    );
  }

  if (!Array.isArray(payload) || payload.length !== recordCount) {
    throw new Error(
      `[offline-knowledge-packs] ${filename} expected ${recordCount} records, received ${Array.isArray(payload) ? payload.length : typeof payload}.`,
    );
  }
  if (!workerSource.includes(`knowledge-packs/${filename}`)) {
    throw new Error(
      `[offline-knowledge-packs] ${filename} is not precached by the generated service worker.`,
    );
  }
}

console.log(
  `[offline-knowledge-packs] verified ${Object.keys(expectedRecords).length} gzip archives and their precache entries.`,
);
