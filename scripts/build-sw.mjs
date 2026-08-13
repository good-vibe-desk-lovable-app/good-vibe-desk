// Builds the offline service worker AFTER the rest of the build has finished.
//
// WHY THIS IS NOT A VITE PLUGIN:
// vite-plugin-pwa generates the worker during the Vite build, but under the
// Cloudflare target nitro copies the client assets into .output/public AFTER
// that point. The plugin globbed a directory that did not exist yet and
// produced a precache manifest with zero entries — a 2,617-byte service worker
// that caches nothing. It fails silently, because the app still loads over the
// network and only offline mode is dead. CI measured 0 entries twice before
// this script existed.
//
// Running as a separate `node` step after `vite build` removes the ordering
// question entirely: by the time this runs, .output/public is final.
//
// NOTE ON navigateFallback:
// There is deliberately none. This app is server-rendered on Workers and emits
// no index.html, so there is no static shell to fall back to. Offline
// navigation is served by the NetworkFirst "pages" cache below, which means a
// page must have been visited online at least once before it works offline.
// Assets, Pal artwork and the dataset bundle are all precached, so a visited
// page works fully offline.

import { generateSW } from "workbox-build";

// Matches vite.config.ts. The CI probe reports the resulting entry count.
const OUT_DIR = process.env.PWA_OUT_DIR ?? ".output/public";

const { count, size, warnings } = await generateSW({
  globDirectory: OUT_DIR,
  swDest: `${OUT_DIR}/sw.js`,

  globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webp}"],
  globIgnores: [
    "**/node_modules/**/*",
    "sw.js",
    "workbox-*.js",
    // 299 Pal icons are cached on first view instead of shipped in the install,
    // so the service worker stays small on mobile data.
    "pals/**",
  ],
  maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,

  // registerType "autoUpdate" in the old plugin config meant these two.
  clientsClaim: true,
  skipWaiting: true,
  cleanupOutdatedCaches: true,

  runtimeCaching: [
    {
      urlPattern: ({ request }) => request.mode === "navigate",
      handler: "NetworkFirst",
      options: { cacheName: "pages" },
    },
    {
      // Pal artwork: cache each image the first time it is actually viewed.
      urlPattern: ({ url }) => url.pathname.startsWith("/pals/"),
      handler: "CacheFirst",
      options: {
        cacheName: "pal-images",
        expiration: { maxEntries: 700, maxAgeSeconds: 60 * 60 * 24 * 90 },
      },
    },
  ],
});

for (const warning of warnings) console.warn(`[build-sw] ${warning}`);

console.log(`[build-sw] precached ${count} files, ${(size / 1024).toFixed(1)} KiB`);

// A zero-entry manifest is the exact failure this script exists to prevent, so
// fail the build rather than shipping a service worker that caches nothing.
if (count === 0) {
  console.error(
    `[build-sw] FAILED: no files matched in ${OUT_DIR}. ` +
      `The build output moved — check the CI build-layout report and set PWA_OUT_DIR.`,
  );
  process.exit(1);
}
