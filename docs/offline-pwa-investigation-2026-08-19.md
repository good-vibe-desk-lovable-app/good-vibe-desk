# Offline PWA Investigation — 2026-08-19

## Scope

This investigation tested the production build through Nitro's Cloudflare-compatible local preview. It did not modify application code, deployment configuration, or the service-worker configuration.

## Build and runtime facts observed

| Check                                   | Observed result                                                                                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Production build layout                 | `.output/public` contains static assets and service-worker files, but no `index.html` anywhere under `.output`.                                                          |
| Service worker                          | `/sw.js` installed, activated, and controlled the document at `http://localhost:34617/`.                                                                                 |
| Navigation configuration                | Generated service worker contains `NavigationRoute(createHandlerBoundToURL("/"))` and a `NetworkFirst` navigation route.                                                 |
| Precache cache                          | The active Workbox precache had 27 static assets: JavaScript, CSS, icons, and `manifest.webmanifest`. It did **not** contain `/`, any HTML document, or an SSR response. |
| Online post-activation route navigation | `/explore` loaded successfully while the Cloudflare-compatible preview runtime was online.                                                                               |

## Executed offline test

1. Built application output was served by `npx nitro preview`, which started a local Cloudflare-compatible runtime at `http://localhost:34617/`.
2. The root page loaded in Chromium. `navigator.serviceWorker.ready` confirmed an active controller at `http://localhost:34617/sw.js` with scope `http://localhost:34617/`.
3. Browser Cache Storage was queried. The only relevant cache was `workbox-precache-v2-http://localhost:34617/`; it did not include a cached document for `/`.
4. The preview runtime was stopped deliberately. A direct HTTP probe to `http://127.0.0.1:34617/` then failed with connection refused, confirming the origin was unreachable.
5. With the service worker previously installed and active, Chromium was navigated to `http://localhost:34617/`.

## Result

**Cold offline navigation failed.** The navigation raised `net::ERR_CONNECTION_REFUSED` once the preview origin was unavailable. The evidence matches the build artifact: `navigateFallback: "/"` binds fallback navigation to a precache key for `/`, but the SSR-only build precaches no HTML document or root response.

## Boundaries and conclusion

The successful online `/explore` navigation does not establish offline resilience. The decisive test is the server-withdrawal navigation, which failed. Therefore, the current PWA supports offline static-asset caching but **does not support a cold offline document load** in the tested production-shaped runtime.

No fix has been proposed or implemented in this branch. A remediation must provide a cached, renderable navigation document (or explicitly remove the offline-navigation promise), then repeat this same runtime test.
