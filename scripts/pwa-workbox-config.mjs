/**
 * Shared by vite.config.ts and prerender-root.mjs. Keeping one definition
 * prevents the post-worker regeneration step from silently drifting away from
 * the application’s declared Workbox behavior.
 */
export function createWorkboxOptions(outDir) {
  return {
    globDirectory: outDir,
    globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webp,gz}"],
    // Pal artwork is fetched on demand rather than precached, so the service
    // worker install stays small on mobile data.
    globIgnores: ["**/node_modules/**/*", "sw.js", "workbox-*.js", "pals/**"],
    maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
    // Root-only prerendering emits this exact static document. Navigation
    // fallback must use its precache key, not the SSR root URL (`/`).
    navigateFallback: "/index.html",
    navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
    runtimeCaching: [
      {
        urlPattern: ({ request }) => request.mode === "navigate",
        handler: "NetworkFirst",
        options: { cacheName: "pages" },
      },
      {
        urlPattern: ({ url }) => url.pathname.startsWith("/pals/"),
        handler: "CacheFirst",
        options: {
          cacheName: "pal-images",
          expiration: { maxEntries: 700, maxAgeSeconds: 60 * 60 * 24 * 90 },
        },
      },
    ],
  };
}
