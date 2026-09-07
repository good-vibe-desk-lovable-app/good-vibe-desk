import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Cpu,
  Crosshair,
  Egg,
  Fish,
  Lightbulb,
  MapPinned,
  PackageOpen,
  ScrollText,
  Sparkles,
  Utensils,
} from "lucide-react";
import type { ComponentType } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PageHeader, PageSection, PageShell } from "@/components/ui/page-header";

const TITLE = "Compendium — Palworld Pathfinder";
const DESCRIPTION =
  "Source-backed Palworld reference packs that load separately from the breeding pathfinder.";
const SITE = "https://good-vibe-desk.kevinjackson1114.workers.dev/compendium";

/**
 * Shared card chrome.
 *
 * Exported as a class string rather than a wrapper component because TanStack
 * Router types Link's `to` prop against the generated route tree; funnelling it
 * through a generic `to?: string` prop would erase that check across all routes.
 *
 * This will move to the shared primitive once it is reconciled with the
 * existing src/components/ui/entity-detail-helpers.tsx. Do not fork it.
 */
const packCardClass =
  "group/pack flex h-full flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Pack = {
  to: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  meta: string;
  description: string;
};

type PackGroup = {
  id: string;
  title: string;
  description: string;
  packs: readonly Pack[];
};

/**
 * Eleven packs grouped into four categories. Counts are carried over from the
 * previous revision of this page and are NOT derived from the data files — the
 * encounter figures in particular disagree with docs/PROJECT-HANDOFF.md and
 * need reconciling before they are trusted.
 */
const GROUPS = [
  {
    id: "group-pals",
    title: "Pals",
    description: "What a Pal is, what it knows, and where it comes from.",
    packs: [
      {
        to: "/compendium/skills",
        icon: Sparkles,
        title: "Skills & Passives",
        meta: "807 moves & passives",
        description:
          "Active skills, passives, level learnsets, species partner skills, and verified inheritance rules.",
      },
      {
        to: "/compendium/eggs",
        icon: Egg,
        title: "Eggs & Incubators",
        meta: "754 wild spawns",
        description:
          "Egg pools, wild spawn locations with exact weights, special egg types, incubator specs, and recorded gaps.",
      },
    ],
  },
  {
    id: "group-world",
    title: "World",
    description: "Everything you go out and find.",
    packs: [
      {
        to: "/compendium/field-alphas",
        icon: MapPinned,
        title: "Fixed Field Alphas",
        meta: "65 records",
        description:
          "Fixed overworld Alpha bosses with exact levels, spawn times, and map locations. Dungeon bosses are not included.",
      },
      {
        to: "/compendium/encounters",
        icon: Crosshair,
        title: "Encounters",
        meta: "207 records",
        description: "Verified stats and locations for dungeon, raid, and tower bosses.",
      },
      {
        to: "/compendium/missions",
        icon: ScrollText,
        title: "Missions",
        meta: "117 records",
        description: "Main and sub mission objectives, rewards, next steps, and map locations.",
      },
      {
        to: "/compendium/fishing",
        icon: Fish,
        title: "Fishing",
        meta: "115 spots",
        description:
          "Fishing spots, catch distributions, drop tables, rods and bait, support Pals, and water shadow indicators.",
      },
    ],
  },
  {
    id: "group-base",
    title: "Base & Crafting",
    description: "What you build, unlock, cook, and carry.",
    packs: [
      {
        to: "/compendium/technologies",
        icon: Lightbulb,
        title: "Technologies",
        meta: "588 unlocks",
        description: "Unlock levels, categories, and point costs from level 1 to 80.",
      },
      {
        to: "/compendium/structures",
        icon: Building2,
        title: "Structures",
        meta: "498 structures",
        description:
          "Base structures, production facilities, material costs, work suitabilities, and technology requirements.",
      },
      {
        to: "/compendium/food",
        icon: Utensils,
        title: "Food & Recipes",
        meta: "124 items",
        description:
          "Ingredients, recipes, nutrition, SAN changes, spoilage times, buffs, and cooking station tech levels.",
      },
      {
        to: "/compendium/items",
        icon: PackageOpen,
        title: "Items & Recipes",
        meta: "2,455 cards · optional download",
        description:
          "Separate pack for item stats and crafting recipes. Shows exact size and storage use before you start.",
      },
    ],
  },
  {
    id: "group-mechanics",
    title: "Game Mechanics",
    description: "The published rules, and the ones nobody has published.",
    packs: [
      {
        to: "/compendium/systems",
        icon: Cpu,
        title: "Systems & Formulas",
        meta: "29 records & gaps",
        description:
          "Published mechanics, breeding formulas, work speed levels, world settings, and explicit source gaps.",
      },
    ],
  },
] as const satisfies readonly PackGroup[];

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
    <PageShell>
      <PageHeader
        title="Compendium"
        description="Offline reference packs for Pals, the world, your base, and the game's published rules. Each pack loads on its own, so opening one never slows the breeding pathfinder."
      >
        <Collapsible className="group rounded-lg border border-border bg-card">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
            <span>What this can and can&apos;t tell you</span>
            <ChevronDown className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 px-4 pb-4 text-sm leading-6 text-muted-foreground">
            <p>
              Every value carries a source and a tier. Where sources disagree, both values are
              recorded and the conflict is flagged — nothing is averaged and no winner is picked.
            </p>
            <p>
              Where nothing has been published, the entry says so and gives the reason. Missing
              information is never filled with a guess.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </PageHeader>

      {GROUPS.map((group) => (
        <PageSection
          key={group.id}
          id={group.id}
          title={group.title}
          description={group.description}
        >
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.packs.map((pack) => (
              <PackCard key={pack.to} pack={pack} />
            ))}
          </ul>
        </PageSection>
      ))}
    </PageShell>
  );
}

function PackCard({ pack }: { pack: (typeof GROUPS)[number]["packs"][number] }) {
  const Icon = pack.icon;

  return (
    <li>
      <Link to={pack.to} className={packCardClass}>
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold leading-tight">{pack.title}</h3>
            <p className="mt-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {pack.meta}
            </p>
          </div>
        </div>
        <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{pack.description}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
          Open
          <ChevronRight className="size-4 transition-transform group-hover/pack:translate-x-0.5" />
        </span>
      </Link>
    </li>
  );
}
