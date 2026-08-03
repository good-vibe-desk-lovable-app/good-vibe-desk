// Single guarded registrar for the offline service worker.
//
// Service workers are browser-held state: registering one in dev or inside the
// Lovable preview iframe can keep serving stale HTML after a rebuild. This
// module refuses registration everywhere except a real published origin, and
// actively unregisters a stale /sw.js in every refused context.

const SW_URL = "/sw.js";

function isRefusedHost(hostname: string): boolean {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

async function unregisterExisting(): Promise<void> {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs
        .filter((r) => (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").includes(SW_URL))
        .map((r) => r.unregister()),
    );
  } catch {
    /* nothing we can do */
  }
}

export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const url = new URL(window.location.href);
  const refused =
    !import.meta.env.PROD ||
    window.self !== window.top ||
    isRefusedHost(window.location.hostname) ||
    url.searchParams.get("sw") === "off";

  if (refused) {
    void unregisterExisting();
    return;
  }

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(SW_URL, { scope: "/" }).catch(() => {
      /* offline support is best-effort */
    });
  });
}
