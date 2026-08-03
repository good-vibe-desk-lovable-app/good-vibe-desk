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
        // Nitro emits the browser bundle into dist/client; the SW and its
        // precache manifest must be rooted there or every URL gets a
        // "client/" prefix and 404s at runtime.
        outDir: "dist/client",
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
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          navigateFallback: "/",
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          runtimeCaching: [
            {
              urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: { cacheName: "pages" },
            },
          ],
        },
      }),
    ],
  },
});
