// Verifies the generated service worker actually precaches something.
//
// WHY THIS EXISTS:
// vite-plugin-pwa writes sw.js during the Vite build, but under the Cloudflare
// target nitro copies the client assets into .output/public afterwards. Point
// the plugin's outDir at the wrong directory and it globs an empty folder,
// emitting a ~2.6 KB service worker with an empty precache manifest. The app
// still loads over the network, so nothing appears broken — only offline mode
// is silently dead. That state shipped undetected until CI measured it.
//
// This runs as the last step of `npm run build` and fails the build if the
// manifest is empty, which is the check that would have caught it immediately.
//
// ZERO DEPENDENCIES, DELIBERATELY. Cloudflare installs with
// `bun install --frozen-lockfile`, and bun.lock cannot be regenerated from a
// phone. Anything added to package.json that is not already in the lockfile
// fails the deploy before the build starts. Node built-ins only.

import { readFileSync, statSync } from "node:fs";

const OUT_DIR = process.env.PWA_OUT_DIR ?? ".output/public";
const SW_PATH = `${OUT_DIR}/sw.js`;

let source;
try {
  source = readFileSync(SW_PATH, "utf8");
} catch {
  console.error(
    `[check-sw] FAILED: no service worker at ${SW_PATH}.\n` +
      `  The build output moved. Check the CI "build output layout" report and\n` +
      `  set PWA_OUT_DIR in vite.config.ts to the directory holding the assets.`,
  );
  process.exit(1);
}

// The precache manifest is inlined into sw.js as an array of {url, revision}
// pairs, one per precached file. Workbox minifies its output, so the keys may
// or may not be quoted depending on version — match both rather than assuming.
const entries = source.match(/"?revision"?\s*:/g)?.length ?? 0;
const bytes = statSync(SW_PATH).size;

console.log(`[check-sw] ${SW_PATH}: ${entries} precached entries, ${bytes} bytes`);

if (entries === 0) {
  console.error(
    `[check-sw] FAILED: the precache manifest is empty.\n` +
      `  sw.js was generated against a directory with no assets in it, so the\n` +
      `  app will not work offline. This does NOT break the online site, which\n` +
      `  is exactly why it must fail the build rather than warn.\n` +
      `  Fix: set PWA_OUT_DIR in vite.config.ts to the real asset directory.`,
  );
  process.exit(1);
}
