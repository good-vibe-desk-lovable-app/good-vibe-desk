import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import {
  BookOpen,
  Compass,
  Database,
  Egg,
  HardDriveDownload,
  Map,
  Menu,
  MessageSquareQuote,
  Swords,
  Trophy,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { registerServiceWorker } from "../lib/pwa";
import { Toaster } from "../components/ui/sonner";

const APP_NAME = "Palworld Pathfinder";
const APP_DESCRIPTION =
  "Plan breeding chains that carry the passives you want onto any Pal — fully offline.";

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
};

/** Primary destinations. Rendered as the desktop nav and the mobile tab bar. */
const PRIMARY_NAV = [
  { to: "/", label: "Breeding", icon: Egg, exact: true },
  { to: "/progression", label: "Progress", icon: Map },
  { to: "/compendium", label: "Compendium", icon: BookOpen },
  { to: "/planner/combat", label: "Combat", icon: Swords },
] as const satisfies readonly NavItem[];

/** Secondary destinations. Reachable only from the More panel. */
const SECONDARY_NAV = [
  { to: "/planner/work", label: "Work Planner", icon: Wrench },
  { to: "/explore", label: "Explorer", icon: Compass },
  { to: "/tiers", label: "Tier Lists", icon: Trophy },
  { to: "/opinions", label: "Opinions", icon: MessageSquareQuote },
  { to: "/data-check", label: "Data Check", icon: Database },
  { to: "/data-check/save-inspector", label: "Save Inspector", icon: HardDriveDownload },
] as const satisfies readonly NavItem[];

function NotFoundComponent() {
  return (
    <CenteredMessage
      title="Page not found"
      body="That page doesn't exist or has been moved."
      action={
        <Link
          to="/"
          className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Go home
        </Link>
      }
    />
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <CenteredMessage
      title="This page didn't load"
      body="Something went wrong. Try again, or head back home."
      action={
        <>
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-input px-4 text-sm font-semibold transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </>
      }
    />
  );
}

function CenteredMessage({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: ReactNode;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      { name: "description", content: APP_DESCRIPTION },
      { property: "og:title", content: APP_NAME },
      { property: "og:description", content: APP_DESCRIPTION },
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
      { rel: "stylesheet", href: appCss },
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
    <html lang="en" className="dark">
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
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Any navigation dismisses an open panel.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  const secondaryActive = SECONDARY_NAV.some((item) => pathname.startsWith(item.to));

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Link to="/" className="shrink-0 text-base font-bold tracking-tight">
              <span className="text-primary">Palworld</span> Pathfinder
            </Link>

            <nav className="ml-auto hidden items-center gap-1 md:flex">
              {PRIMARY_NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={item.exact ? { exact: true } : undefined}
                  activeProps={{ className: "bg-accent text-accent-foreground" }}
                  className="inline-flex min-h-[44px] items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                aria-expanded={moreOpen}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent/50 hover:text-foreground ${
                  secondaryActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                }`}
              >
                More
                <Menu className="size-4" />
              </button>
            </nav>
          </div>
        </header>

        <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          <Outlet />
        </main>

        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        >
          <div className="grid grid-cols-5">
            {PRIMARY_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={item.exact ? { exact: true } : undefined}
                  activeProps={{ className: "text-primary" }}
                  className="flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium text-muted-foreground transition-colors"
                >
                  <Icon className="size-5" />
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              aria-expanded={moreOpen}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors ${
                secondaryActive || moreOpen ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Menu className="size-5" />
              More
            </button>
          </div>
        </nav>

        {moreOpen ? (
          <>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="More destinations"
              className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:bottom-auto md:right-4 md:top-16 md:w-72 md:rounded-2xl md:border"
            >
              <div className="flex items-center justify-between px-4 py-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  More
                </h2>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  aria-label="Close"
                  className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
              <ul className="px-2 pb-3">
                {SECONDARY_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        activeProps={{ className: "bg-accent text-accent-foreground" }}
                        className="flex min-h-[48px] items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                      >
                        <Icon className="size-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        ) : null}
      </div>
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
