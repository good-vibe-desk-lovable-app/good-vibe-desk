import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { registerServiceWorker } from "../lib/pwa";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      // viewport-fit=cover is what makes env(safe-area-inset-bottom) resolve to
      // a real value. Without it the sticky action bar on / sits under the
      // gesture-navigation strip on phones that have one.
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      // Root-level defaults for routes that do not set their own head. The
      // template's placeholders were being served as the title and description
      // of /tiers, /opinions and /data-check.
      { title: "Palworld Breeding Pathfinder" },
      {
        name: "description",
        content:
          "Plan breeding chains that carry the passives you want onto any Pal — fully offline.",
      },
      { property: "og:title", content: "Palworld Breeding Pathfinder" },
      {
        property: "og:description",
        content:
          "Plan breeding chains that carry the passives you want onto any Pal — fully offline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0a0d14" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/pwa-192x192.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Client-only: the wrapper itself refuses to register in dev/preview/iframe.
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 h-14 sm:px-6 lg:px-8">
            <Link
              to="/"
              className="flex items-center gap-2 font-bold text-base tracking-tight shrink-0"
            >
              <span className="text-primary">Palworld</span> Pathfinder
            </Link>
            <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
              <Link
                to="/"
                activeOptions={{ exact: true }}
                activeProps={{ className: "bg-accent text-accent-foreground font-semibold" }}
                className="inline-flex min-h-[44px] items-center rounded-md px-3 text-xs font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors shrink-0"
              >
                Pathfinder
              </Link>
              <Link
                to="/compendium"
                activeProps={{ className: "bg-accent text-accent-foreground font-semibold" }}
                className="inline-flex min-h-[44px] items-center rounded-md px-3 text-xs font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors shrink-0"
              >
                Compendium
              </Link>
              <Link
                to="/planner/combat"
                activeProps={{ className: "bg-accent text-accent-foreground font-semibold" }}
                className="inline-flex min-h-[44px] items-center rounded-md px-3 text-xs font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors shrink-0"
              >
                Combat Planner
              </Link>
              <Link
                to="/planner/work"
                activeProps={{ className: "bg-accent text-accent-foreground font-semibold" }}
                className="inline-flex min-h-[44px] items-center rounded-md px-3 text-xs font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors shrink-0"
              >
                Work Planner
              </Link>
              <Link
                to="/explore"
                activeProps={{ className: "bg-accent text-accent-foreground font-semibold" }}
                className="inline-flex min-h-[44px] items-center rounded-md px-3 text-xs font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors shrink-0"
              >
                Explorer
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </main>
      </div>
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
