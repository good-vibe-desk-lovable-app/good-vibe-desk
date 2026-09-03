import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChefHat,
  ChevronDown,
  Flame,
  Info,
  Search,
  Sparkles,
  Utensils,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type {
  CookingStationRecord,
  FoodItemRecord,
  PalworldFoodKnowledge,
} from "@/data/palworld/knowledgeFood";
import { useOfflineKnowledgePack } from "@/lib/use-offline-knowledge-pack";

const TITLE = "Food & Recipes Compendium — Nutrition, Spoilage & Cooking Stations";
const DESCRIPTION =
  "Explore 124 Palworld food and ingredient records, recipes, nutrition values, SAN recovery, spoilage durations, food buffs, and cooking station tech levels.";
const SITE = "https://good-vibe-desk.kevinjackson1114.workers.dev/compendium/food";

type RecipeFilter = "all" | "recipe" | "raw";
type BuffFilter = "all" | "has-buff";
type ViewSection = "all" | "food" | "stations";

export const Route = createFileRoute("/compendium/food")({
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
  component: FoodCompendiumPage,
});

function FoodCompendiumPage() {
  const [query, setQuery] = useState("");
  const [recipeFilter, setRecipeFilter] = useState<RecipeFilter>("all");
  const [buffFilter, setBuffFilter] = useState<BuffFilter>("all");
  const [workstationFilter, setWorkstationFilter] = useState<string>("all");
  const [viewSection, setViewSection] = useState<ViewSection>("all");

  const { records, error, loading } = useOfflineKnowledgePack<PalworldFoodKnowledge>("food");
  const knowledge = records[0]?.data;

  const itemsList = useMemo(() => {
    if (!knowledge) return [];
    return Object.values(knowledge.items);
  }, [knowledge]);

  const workstationsList = useMemo(() => {
    if (!knowledge) return [];
    const stationSet = new Set<string>();
    for (const item of Object.values(knowledge.items)) {
      for (const ws of item.workstations) {
        stationSet.add(ws);
      }
    }
    return Array.from(stationSet).sort();
  }, [knowledge]);

  const filteredItems = useMemo(() => {
    if (!itemsList.length) return [];
    const q = query.trim().toLocaleLowerCase();

    return itemsList.filter((item) => {
      // Search query
      if (q) {
        const matchesName = item.displayName.toLocaleLowerCase().includes(q);
        const matchesBuff = item.buff?.name.toLocaleLowerCase().includes(q) ?? false;
        const matchesWorkstation = item.workstations.some((ws) =>
          ws.toLocaleLowerCase().includes(q),
        );
        const matchesIngredients = item.ingredients.some((ing) =>
          ing.ingredient.toLocaleLowerCase().includes(q),
        );

        if (!matchesName && !matchesBuff && !matchesWorkstation && !matchesIngredients) {
          return false;
        }
      }

      // Recipe filter
      if (recipeFilter === "recipe" && item.ingredients.length === 0) return false;
      if (recipeFilter === "raw" && item.ingredients.length > 0) return false;

      // Buff filter
      if (buffFilter === "has-buff" && !item.buff) return false;

      // Workstation filter
      if (workstationFilter !== "all" && !item.workstations.includes(workstationFilter)) {
        return false;
      }

      return true;
    });
  }, [itemsList, query, recipeFilter, buffFilter, workstationFilter]);

  if (loading || error || !knowledge) {
    return <PackFeedback loading={loading} error={error} />;
  }

  const totalItems = itemsList.length;
  const directRecipesCount = itemsList.filter((item) => item.ingredients.length > 0).length;
  const buffItemsCount = itemsList.filter((item) => item.buff !== null).length;
  const cookingStations = knowledge.cookingStations;

  const showFood = viewSection === "all" || viewSection === "food";
  const showStations = viewSection === "all" || viewSection === "stations";

  return (
    <div className="min-h-screen bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60"
        style={{
          background:
            "radial-gradient(65% 100% at 50% 0%, color-mix(in oklch, #f97316 18%, transparent) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <BackLink />

        <section className="rounded-2xl border border-orange-400/25 bg-card/80 p-5 shadow-sm backdrop-blur sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <Eyebrow icon={<Utensils className="size-3.5" />}>
                Offline compendium · Food & Recipes
              </Eyebrow>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Food & Recipes Directory
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                Browse 124 food items and ingredients, recipe inputs, nutrition values, SAN
                restoration, spoilage durations, temporary status buffs, and cooking station unlock
                levels.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:min-w-72 sm:grid-cols-4">
              <Metric label="Food Items" value={String(totalItems)} />
              <Metric label="Recipes" value={String(directRecipesCount)} />
              <Metric label="Food Buffs" value={String(buffItemsCount)} />
              <Metric label="Cooking Tech" value={String(cookingStations.length)} />
            </div>
          </div>
        </section>

        <Collapsible className="mt-5 rounded-xl border bg-card/60 p-4">
          <CollapsibleTrigger className="flex min-h-[44px] w-full items-center justify-between font-semibold text-sm text-muted-foreground hover:text-foreground">
            <span>What this can and can't tell you</span>
            <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 text-xs leading-relaxed text-muted-foreground space-y-2">
            <p>
              Provides verified records for 124 food and ingredient entries, 62 recipes with direct
              ingredient inputs, 5 cooking stations with technology level unlocks, and published
              spoilage durations.
            </p>
            <p>
              <strong>Nutrition vs Hunger:</strong> Nutrition values represent raw food restoration
              points in Palworld. They are separate properties from hunger percentages and are not
              interchanged.
            </p>
            <p>
              <strong>Spoilage Gaps:</strong> Four items (Honey, Cotton Candy, Cavern Mushroom,
              Caramel Cotton Candy) have no published spoilage duration in primary sources and are
              displayed explicitly as unknown with recorded gap reasons rather than assumed as zero.
            </p>
          </CollapsibleContent>
        </Collapsible>

        <section
          className="mt-7 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
          aria-label="Browse food directory"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <label className="block flex-1">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Search food & recipes
              </span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Food, ingredient, workstation, or buff name"
                  className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-2" aria-label="Food filters">
              <FilterButton active={viewSection === "all"} onClick={() => setViewSection("all")}>
                All
              </FilterButton>
              <FilterButton active={viewSection === "food"} onClick={() => setViewSection("food")}>
                <Utensils className="size-3.5" />
                Items ({filteredItems.length})
              </FilterButton>
              <FilterButton
                active={viewSection === "stations"}
                onClick={() => setViewSection("stations")}
              >
                <ChefHat className="size-3.5" />
                Cooking Stations ({cookingStations.length})
              </FilterButton>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mr-1">
                Type:
              </span>
              <FilterButton active={recipeFilter === "all"} onClick={() => setRecipeFilter("all")}>
                All
              </FilterButton>
              <FilterButton
                active={recipeFilter === "recipe"}
                onClick={() => setRecipeFilter("recipe")}
              >
                Direct Recipes Only
              </FilterButton>
              <FilterButton active={recipeFilter === "raw"} onClick={() => setRecipeFilter("raw")}>
                Raw Ingredients Only
              </FilterButton>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mr-1">
                Buff:
              </span>
              <FilterButton active={buffFilter === "all"} onClick={() => setBuffFilter("all")}>
                All
              </FilterButton>
              <FilterButton
                active={buffFilter === "has-buff"}
                onClick={() => setBuffFilter("has-buff")}
              >
                <Sparkles className="size-3.5" />
                Has Buff
              </FilterButton>
            </div>

            {workstationsList.length > 0 && (
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="workstation-select"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground shrink-0"
                >
                  Workstation:
                </label>
                <select
                  id="workstation-select"
                  value={workstationFilter}
                  onChange={(e) => setWorkstationFilter(e.target.value)}
                  className="h-9 min-h-[44px] sm:min-h-0 rounded-md border border-input bg-background px-3 text-xs font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <option value="all">All Workstations</option>
                  {workstationsList.map((ws) => (
                    <option key={ws} value={ws}>
                      {ws}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{filteredItems.length}</strong> matching
              food records
            </span>
            <span>Source: PalDB Food Catalogue (v1.0.3)</span>
          </div>

          <div className="mt-6 space-y-8">
            {/* Cooking Stations Section */}
            {showStations && (
              <div>
                <SectionHeader
                  icon={<ChefHat className="size-4 text-orange-600 dark:text-orange-400" />}
                  title="Cooking Stations & Facilities"
                  count={cookingStations.length}
                />
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {cookingStations.map((station) => (
                    <CookingStationCard key={station.id} station={station} />
                  ))}
                </div>
              </div>
            )}

            {/* Food Items Section */}
            {showFood && (
              <div>
                <SectionHeader
                  icon={<Utensils className="size-4 text-orange-600 dark:text-orange-400" />}
                  title="Food & Recipe Items"
                  count={filteredItems.length}
                />
                {filteredItems.length === 0 ? (
                  <EmptyState text="No food items match your filter criteria. Try adjusting your search or active filters." />
                ) : (
                  <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredItems.map((item) => (
                      <FoodItemCard key={item.itemId} item={item} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function SectionHeader({ icon, title, count }: { icon: ReactNode; title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 border-b pb-2">
      {icon}
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:text-orange-300">
        {count}
      </span>
    </div>
  );
}

function CookingStationCard({ station }: { station: CookingStationRecord }) {
  return (
    <article className="rounded-xl border border-border/80 bg-background p-4 shadow-sm transition hover:border-orange-400/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">
            Facility
          </span>
          <h3 className="mt-0.5 text-base font-bold leading-tight">{station.name}</h3>
        </div>
      </div>
      <div className="mt-3 border-t pt-2.5 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Technology Unlock:</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary">
          Level {station.technologyUnlockLevel}
        </span>
      </div>
    </article>
  );
}

function FoodItemCard({ item }: { item: FoodItemRecord }) {
  const hasRecipe = item.ingredients.length > 0;
  const gapObj = item.gaps?.find((g) => g.field === "spoilageSeconds");

  return (
    <article className="rounded-xl border border-border/80 bg-background p-4 shadow-sm transition hover:border-orange-400/40 hover:shadow-md flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">
              {hasRecipe ? "Recipe Product" : "Raw Ingredient"}
            </span>
            <h3 className="mt-0.5 text-base font-bold leading-tight">{item.displayName}</h3>
          </div>
          {item.buff && (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:text-orange-300">
              <Sparkles className="size-3" />
              Buff
            </span>
          )}
        </div>

        {/* Stats Grid */}
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-2 text-center text-xs">
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Nutrition
            </span>
            <span className="font-bold text-foreground">
              {item.nutrition !== null ? item.nutrition : "Unknown"}
            </span>
          </div>

          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              SAN
            </span>
            <span className="font-bold text-foreground">
              {item.san !== null ? (item.san >= 0 ? `+${item.san}` : `${item.san}`) : "Unknown"}
            </span>
          </div>

          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Spoilage
            </span>
            <span className="font-bold text-foreground">
              {formatSpoilage(item.spoilageSeconds)}
            </span>
          </div>
        </div>

        {/* Unknown Spoilage Warning/Reason */}
        {item.spoilageSeconds === null && gapObj && (
          <div className="mt-2 rounded bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-start gap-1.5">
            <Info className="size-3.5 shrink-0 mt-0.5" />
            <span>
              <strong>Spoilage: Unknown.</strong> {gapObj.reason}
            </span>
          </div>
        )}

        {/* Buff Details */}
        {item.buff && (
          <div className="mt-3 rounded-lg border border-orange-400/30 bg-orange-400/10 p-2.5 text-xs text-orange-800 dark:text-orange-200">
            <div className="flex items-center gap-1.5 font-bold">
              <Flame className="size-3.5 text-orange-600 dark:text-orange-400" />
              {item.buff.name} +{item.buff.magnitude}%
            </div>
            {item.buff.durationSeconds !== null && (
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                Duration: {formatSeconds(item.buff.durationSeconds)}
              </div>
            )}
          </div>
        )}

        {/* Ingredients */}
        {hasRecipe && (
          <div className="mt-3 border-t pt-2.5">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Recipe Ingredients ({item.ingredients.length})
            </h4>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {item.ingredients.map((ing, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded bg-accent/60 px-2 py-0.5 text-xs font-medium text-foreground"
                >
                  <span className="font-mono font-bold text-primary">{ing.quantity}x</span>
                  <span>{ing.ingredient}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Workstations Footer */}
      {item.workstations.length > 0 && (
        <div className="mt-3 border-t pt-2 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">Crafted at:</span>{" "}
          {item.workstations.join(", ")}
        </div>
      )}
    </article>
  );
}

function PackFeedback({ loading, error }: { loading: boolean; error: Error | null }) {
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <main className="mx-auto max-w-xl rounded-2xl border bg-card p-6 text-center shadow-sm">
        <Utensils className="mx-auto size-7 text-primary" />
        <h1 className="mt-3 text-xl font-bold">
          {loading ? "Loading Food Guide" : "Food pack unavailable"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {loading
            ? "Preparing the cached offline food directory."
            : (error?.message ?? "The offline knowledge pack could not be read.")}
        </p>
        <Button asChild variant="outline" className="mt-5 min-h-[44px]">
          <Link to="/compendium">Back to the compendium</Link>
        </Button>
      </main>
    </div>
  );
}

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="mb-5 -ml-2 min-h-[44px]">
      <Link to="/compendium">
        <ArrowLeft className="size-4" />
        Back to the compendium
      </Link>
    </Button>
  );
}

function Eyebrow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-orange-400/40 bg-orange-400/10 px-3 py-1 text-xs font-semibold text-orange-700 dark:text-orange-300">
      {icon}
      {children}
    </span>
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

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[44px] sm:min-h-0 h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background text-foreground hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-6 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function formatSpoilage(seconds: number | null): string {
  if (seconds === null) return "Unknown";
  return formatSeconds(seconds);
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remSecs = seconds % 60;
  if (remSecs === 0) return `${mins}m`;
  return `${mins}m ${remSecs}s`;
}
