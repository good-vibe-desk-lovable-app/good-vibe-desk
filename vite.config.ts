// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

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
        // The Netlify Nitro preset emits the browser bundle into dist (the
        // Cloudflare preset used dist/client). The SW and its precache
        // manifest must be rooted wherever the assets actually land, or every
        // URL gains a wrong prefix and 404s at runtime.
        outDir: "dist",
        // The guarded wrapper in src/lib/pwa.ts is the ONLY registrar.
        injectRegister: null,

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
          // at the finished client output fixes the "0.00 KiB" precache.
          globDirectory: "dist",
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
