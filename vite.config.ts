// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Directory the finished browser bundle lands in.
 *
 * Confirmed by the CI build-layout probe, not assumed: under the Cloudflare
 * target that @lovable.dev/vite-tanstack-config defaults to, nitro emits the
 * static assets to .output/public and the server entry to .output/server.
 * Nothing lands in dist/ except these service worker files. The Netlify preset
 * previously put everything in dist/, which is why this was hard-coded there.
 *
 * If the "precache entry count" in CI reports 0, the service worker is being
 * written before nitro has populated this directory and the glob matches
 * nothing — the app still works online and only offline mode is dead.
 * Overridable via the PWA_OUT_DIR environment variable so a fix does not
 * require a commit.
 */
const PWA_OUT_DIR = process.env.PWA_OUT_DIR ?? ".output/public";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        // The SW and its precache manifest must be rooted wherever the browser
        // bundle actually lands, or every precached URL gains a wrong prefix
        // and 404s at runtime — silently, because the app still loads over the
        // network and only offline mode breaks.
        //
        // The layout is preset-dependent: the Netlify preset emitted the
        // browser bundle into dist/, the Cloudflare preset into dist/client/.
        // This is an env var rather than a literal so a wrong guess is fixable
        // from the Cloudflare dashboard (Settings -> Environment variables)
        // instead of requiring a commit. The CI job's "Report the build output
        // layout" step prints the real answer: it is the directory containing
        // index.html.
        outDir: PWA_OUT_DIR,
        // The guarded wrapper in src/lib/pwa.ts is the ONLY registrar.
        injectRegister: null,

        // This plugin generates the real service worker. The only thing that
        // ever went wrong here was outDir: under the Netlify preset the client
        // bundle landed in dist/, under Cloudflare it lands in .output/public,
        // and globbing the wrong one silently yields an EMPTY precache
        // manifest — the app still works online, so nothing looks broken.
        //
        // scripts/check-sw.mjs runs after `vite build` and fails the build if
        // the manifest comes out empty. See package.json -> "build".

        devOptions: { enabled: false },
        filename: "sw.js",
        manifest: {
          name: "Palworld Breeding Pathfinder",
          short_name: "PalBreed",
          description:
            "Plan breeding chains that carry the passives you want onto any Pal — fully offline.",
          display: "standalone",
          start_url: "/",
          scope: "/",
          background_color: "#0a0d14",
          theme_color: "#0a0d14",
          icons: [
            { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
            {
              src: "/pwa-maskable-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          // TanStack Start builds three environments (client, ssr, nitro) and
          // the PWA plugin's glob runs before the client assets are on disk,
          // which is why the manifest came out empty. Pointing globDirectory
          // at the finished client output fixes the "0.00 KiB" precache. It
          // must track outDir — they are the same directory.
          globDirectory: PWA_OUT_DIR,
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webp}"],
          // Pal artwork is fetched on demand rather than precached, so the
          // service worker install stays small on mobile data.
          globIgnores: ["**/node_modules/**/*", "sw.js", "workbox-*.js", "pals/**"],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          navigateFallback: "/",
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          runtimeCaching: [
            {
              urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: { cacheName: "pages" },
            },
            {
              // Pal artwork: cache each image the first time it is actually
              // viewed, rather than shipping 300 files in the SW install.
              urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith("/pals/"),
              handler: "CacheFirst",
              options: {
                cacheName: "pal-images",
                expiration: { maxEntries: 700, maxAgeSeconds: 60 * 60 * 24 * 90 },
              },
            },
          ],
        },
      }),
    ],
  },
});
