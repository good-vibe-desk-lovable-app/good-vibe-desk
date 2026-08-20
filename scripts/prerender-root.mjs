import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { generateSW } from "workbox-build";

import { createWorkboxOptions } from "./pwa-workbox-config.mjs";

const OUT_DIR = process.env.PWA_OUT_DIR ?? ".output/public";
const SERVER_ENTRY = resolve(OUT_DIR, "../server/index.mjs");
const ROOT_DOCUMENT_PATH = resolve(OUT_DIR, "index.html");

const workerModule = await import(pathToFileURL(SERVER_ENTRY).href);
const worker = workerModule.default ?? workerModule;

if (typeof worker.fetch !== "function") {
  throw new Error(
    `[prerender-root] ${SERVER_ENTRY} does not expose the Cloudflare worker fetch handler.`,
  );
}

const response = await worker.fetch(
  new Request("https://offline-shell.invalid/"),
  {},
  {
    waitUntil() {},
  },
);
const html = await response.text();

if (!response.ok) {
  throw new Error(
    `[prerender-root] root render failed with ${response.status} ${response.statusText}.`,
  );
}
if (!response.headers.get("content-type")?.includes("text/html")) {
  throw new Error("[prerender-root] root render did not return an HTML document.");
}
if (!/<html[\s>]/i.test(html) || !/<script[^>]+type="module"/i.test(html)) {
  throw new Error(
    "[prerender-root] root render is missing the document or client bootstrap markup.",
  );
}

await mkdir(OUT_DIR, { recursive: true });
await writeFile(ROOT_DOCUMENT_PATH, html, "utf8");

const { count, size, warnings } = await generateSW({
  ...createWorkboxOptions(OUT_DIR),
  swDest: resolve(OUT_DIR, "sw.js"),
  cleanupOutdatedCaches: true,
  dontCacheBustURLsMatching: /^assets\//,
  mode: "production",
  skipWaiting: true,
  clientsClaim: true,
});

for (const warning of warnings) console.warn(`[prerender-root] Workbox: ${warning}`);
console.log(
  `[prerender-root] wrote ${ROOT_DOCUMENT_PATH} (${Buffer.byteLength(html)} bytes) and regenerated sw.js ` +
    `with ${count} entries (${size} bytes).`,
);
