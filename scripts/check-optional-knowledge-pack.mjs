import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

const outDir = resolve(process.env.PWA_OUT_DIR ?? ".output/public");
const packDirectory = resolve(outDir, "optional-knowledge-packs");
const serviceWorker = resolve(outDir, "sw.js");
const manifestPath = resolve(packDirectory, "items-recipes-v1.manifest.json");

if (!existsSync(manifestPath) || !existsSync(serviceWorker)) {
  throw new Error(
    "[optional-knowledge-pack] expected optional manifest and generated service worker.",
  );
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const archivePath = resolve(packDirectory, manifest.file);
if (!existsSync(archivePath)) {
  throw new Error(`[optional-knowledge-pack] missing archive: ${archivePath}`);
}

let payload;
try {
  payload = JSON.parse(gunzipSync(readFileSync(archivePath)).toString("utf8"));
} catch (error) {
  throw new Error(`[optional-knowledge-pack] invalid gzip JSON archive: ${String(error)}`);
}

if (
  !Array.isArray(payload) ||
  payload.length !== manifest.recordCount ||
  manifest.recordCount !== 2455
) {
  throw new Error(
    `[optional-knowledge-pack] expected 2,455 item records, received ${Array.isArray(payload) ? payload.length : typeof payload}.`,
  );
}
if (manifest.storageBytes !== manifest.compressedBytes || manifest.compressedBytes <= 0) {
  throw new Error(
    "[optional-knowledge-pack] manifest must disclose the exact positive cached archive size.",
  );
}
if (readFileSync(serviceWorker, "utf8").includes(`optional-knowledge-packs/${manifest.file}`)) {
  throw new Error(
    "[optional-knowledge-pack] optional item archive was silently added to the core precache.",
  );
}

console.log(
  `[optional-knowledge-pack] verified deployed, removable opt-in archive: ${manifest.recordCount} records; ${manifest.compressedBytes} cache bytes.`,
);
