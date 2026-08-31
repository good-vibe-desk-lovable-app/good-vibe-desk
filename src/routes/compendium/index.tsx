import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Crosshair,
  Download,
  Lightbulb,
  MapPinned,
  PackageOpen,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const TITLE = "Palworld Compendium — Offline Knowledge Packs";
const DESCRIPTION =
  "Browse source-backed Palworld reference packs without loading them into the core breeding pathfinder.";
const SITE = "https://good-vibe-desk.kevinjackson1114.workers.dev/compendium";

export const Route = createFileRoute("/compendium/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE }],
  }),
  component: CompendiumIndexPage,
});

function CompendiumIndexPage() {
  return (
    <div className="min-h-screen bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-60"
        style={{
          background:
            "radial-gradient(65% 100% at 50% 0%, color-mix(in oklch, var(--primary) 20%, transparent) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Button asChild variant="ghost" size="sm" className="mb-5 -ml-2 min-h-[44px]">
          <Link to="/">
            <ArrowLeft className="size-4" />
            Back to the pathfinder
          </Link>
        </Button>

        <section className="rounded-2xl border border-primary/25 bg-card/80 p-5 shadow-sm backdrop-blur sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <BookOpen className="size-3.5" />
                Offline knowledge packs
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Palworld Compendium</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                Explore offline reference guides for Pals, encounters, missions, technology, and
                items.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center sm:min-w-60">
              <Metric label="Available directories" value="5" />
              <Metric label="Core reference records" value="977" />
              <Metric label="Core dependency" value="None" />
              <Metric label="Item pack" value="Opt-in" />
            </div>
          </div>
        </section>

        <section className="mt-7" aria-labelledby="available-packs">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 id="available-packs" className="text-xl font-bold">
                Available guides
              </h2>
            </div>
          </div>

          <Collapsible className="mb-4 rounded-xl border bg-card/60 p-4">
            <CollapsibleTrigger className="flex w-full items-center justify-between font-semibold text-sm text-muted-foreground hover:text-foreground">
              <span>What this can and can't tell you</span>
              <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 text-xs leading-relaxed text-muted-foreground space-y-2">
              <p>
                Every guide here is built directly from verified game records. Missing information
                is left blank rather than filled with guesses.
              </p>
              <p>
                Each guide loads separately so the breeding calculator stays fast and works without
                downloading data you don't need.
              </p>
            </CollapsibleContent>
          </Collapsible>

          <div className="grid gap-3 lg:grid-cols-2">
            <PackCard
              to="/compendium/field-alphas"
              icon={<MapPinned className="size-5" />}
              title="Fixed Field Alphas"
              count="65 records"
              description="Find fixed overworld Alpha bosses with their exact levels, spawn times, and map locations. Does not include dungeon bosses."
              tone="amber"
            />
            <PackCard
              to="/compendium/encounters"
              icon={<Crosshair className="size-5" />}
              title="Encounters"
              count="207 records"
              description="Check verified stats and locations for dungeon bosses, raid bosses, and tower bosses."
              tone="violet"
            />
            <PackCard
              to="/compendium/missions"
              icon={<ScrollText className="size-5" />}
              title="Missions"
              count="117 records"
              description="View main and sub mission objectives, rewards, next steps, and map locations."
              tone="emerald"
            />
            <PackCard
              to="/compendium/technologies"
              icon={<Lightbulb className="size-5" />}
              title="Technologies"
              count="588 unlocks"
              description="Look up unlock levels, technology categories, and point costs from levels 1 to 80."
              tone="sky"
            />
            <PackCard
              to="/compendium/items"
              icon={<PackageOpen className="size-5" />}
              title="Items & Recipes"
              count="2,455 optional cards"
              description="Optional download for item stats and crafting recipes. Shows exact download size and storage space before you start."
              tone="orange"
            />
          </div>
        </section>

        <section className="mt-7 grid gap-3 md:grid-cols-2" aria-label="Compendium loading policy">
          <PolicyCard
            icon={<ShieldCheck className="size-4" />}
            title="Core stays independent"
            body="The breeding calculator works whether or not you open these guides."
          />
          <PolicyCard
            icon={<Download className="size-4" />}
            title="Items and recipes are opt-in"
            body="The items pack is a separate download that shows its size before you start and can be deleted afterwards."
          />
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/75 px-3 py-2.5">
      <div className="text-lg font-bold leading-none">{value}</div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function PackCard({
  to,
  icon,
  title,
  count,
  description,
  tone,
}: {
  to:
    | "/compendium/field-alphas"
    | "/compendium/encounters"
    | "/compendium/missions"
    | "/compendium/technologies"
    | "/compendium/items";
  icon: ReactNode;
  title: string;
  count: string;
  description: string;
  tone: "amber" | "violet" | "emerald" | "sky" | "orange";
}) {
  const toneClasses = {
    amber:
      "border-amber-400/25 hover:border-amber-400/60 bg-amber-400/10 text-amber-700 dark:text-amber-300",
    violet:
      "border-violet-400/25 hover:border-violet-400/60 bg-violet-400/10 text-violet-700 dark:text-violet-300",
    emerald:
      "border-emerald-400/25 hover:border-emerald-400/60 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300",
    sky: "border-sky-400/25 hover:border-sky-400/60 bg-sky-400/10 text-sky-700 dark:text-sky-300",
    orange:
      "border-orange-400/25 hover:border-orange-400/60 bg-orange-400/10 text-orange-700 dark:text-orange-300",
  }[tone];
  const [borderClass, hoverClass, iconBackground, iconText, badgeText] = toneClasses.split(" ");

  return (
    <Link
      to={to}
      className={`group block rounded-2xl border bg-card p-5 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${borderClass} ${hoverClass}`}
    >
      <div className="flex h-full flex-col justify-between gap-5">
        <div className="flex gap-4">
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${iconBackground} ${iconText}`}
          >
            {icon}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold">{title}</h3>
              <span
                className={`rounded-full ${iconBackground} px-2 py-0.5 text-xs font-semibold ${badgeText}`}
              >
                {count}
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
          Open guide{" "}
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function PolicyCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      <p className="mt-2 text-sm leading-5 text-muted-foreground">{body}</p>
    </div>
  );
}
