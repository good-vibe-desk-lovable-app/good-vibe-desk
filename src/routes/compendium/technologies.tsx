import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown, ExternalLink, Lightbulb, Search, Tags } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { EvidenceRecord } from "@/data/palworld/knowledge";
import type { TechnologyKnowledge } from "@/data/palworld/knowledgeTechnologies";
import { useOfflineKnowledgePack } from "@/lib/use-offline-knowledge-pack";

const TITLE = "Technology Compendium — Unlocks by Level";
const DESCRIPTION =
  "Browse 588 source-backed Palworld technology unlock records by level, category, name, and technology-point cost.";
const SITE = "https://good-vibe-desk.kevinjackson1114.workers.dev/compendium/technologies";

type TechnologyRecord = EvidenceRecord<TechnologyKnowledge>;
type SortOrder = "level-low" | "level-high" | "name" | "cost-high";

export const Route = createFileRoute("/compendium/technologies")({
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
  component: TechnologyCompendiumPage,
});

function TechnologyCompendiumPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("level-low");
  const {
    records: technologies,
    error,
    loading,
  } = useOfflineKnowledgePack<TechnologyKnowledge>("technologies");

  const categories = useMemo(
    () => [...new Set(technologies.map((record) => record.data.category))].toSorted(),
    [technologies],
  );
  const records = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return technologies
      .filter((record) => {
        const matchesCategory = category === "all" || record.data.category === category;
        const matchesQuery =
          normalizedQuery.length === 0 ||
          record.data.name.toLocaleLowerCase().includes(normalizedQuery) ||
          record.data.sourceKey.toLocaleLowerCase().includes(normalizedQuery);
        return matchesCategory && matchesQuery;
      })
      .toSorted((left, right) => compareTechnologies(left, right, sortOrder));
  }, [category, query, sortOrder, technologies]);

  const maxLevel =
    technologies.length > 0 ? Math.max(...technologies.map((record) => record.data.level)) : 0;
  const maxCost =
    technologies.length > 0
      ? Math.max(...technologies.map((record) => record.data.technologyPointCost))
      : 0;

  if (loading || error) return <PackFeedback loading={loading} error={error} />;

  return (
    <div className="min-h-screen bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60"
        style={{
          background:
            "radial-gradient(65% 100% at 50% 0%, color-mix(in oklch, #38bdf8 18%, transparent) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Button asChild variant="ghost" size="sm" className="mb-5 -ml-2 min-h-[44px]">
          <Link to="/compendium">
            <ArrowLeft className="size-4" />
            Back to the compendium
          </Link>
        </Button>

        <section className="rounded-2xl border border-sky-400/25 bg-card/80 p-5 shadow-sm backdrop-blur sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
                <Lightbulb className="size-3.5" />
                Offline technology directory
              </span>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Technologies</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                Look up unlock levels, technology categories, and point costs from levels 1 to{" "}
                {maxLevel}.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-72">
              <Metric label="Unlocks" value={String(technologies.length)} />
              <Metric label="Categories" value={String(categories.length)} />
              <Metric label="Max cost" value={`${maxCost} TP`} />
            </div>
          </div>
        </section>

        <Collapsible className="mt-5 rounded-xl border bg-card/60 p-4">
          <CollapsibleTrigger className="flex w-full items-center justify-between font-semibold text-sm text-muted-foreground hover:text-foreground">
            <span>What this can and can't tell you</span>
            <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 text-xs leading-relaxed text-muted-foreground space-y-2">
            <p>Shows required levels, point costs, and categories for technology unlocks.</p>
            <p>
              This guide lists technology unlocks, not crafting recipes or ingredient costs. See the
              Items & Recipes guide for crafting details.
            </p>
          </CollapsibleContent>
        </Collapsible>

        <section
          className="mt-7 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
          aria-label="Browse technologies"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <label className="block flex-1">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Search unlocks
              </span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Unlock name or source key"
                  className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              </span>
            </label>

            <div className="flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="technology-category">
                Filter technology category
              </label>
              <select
                id="technology-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-9 max-w-48 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <option value="all">All categories</option>
                {categories.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor="technology-sort">
                Sort technologies
              </label>
              <select
                id="technology-sort"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <option value="level-low">Level: low to high</option>
                <option value="level-high">Level: high to low</option>
                <option value="cost-high">Cost: high to low</option>
                <option value="name">Name: A–Z</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{records.length}</strong> of{" "}
              {technologies.length} unlock records
            </span>
            <span>Source tier: wiki · confidence: corroborated</span>
          </div>

          {records.length > 0 ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {records.map((record) => (
                <TechnologyCard key={record.id} record={record} />
              ))}
            </div>
          ) : (
            <EmptyState text="No technologies match your search. Try searching for a different technology or selecting another category." />
          )}
        </section>
      </main>
    </div>
  );
}

function PackFeedback({ loading, error }: { loading: boolean; error: Error | null }) {
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <main className="mx-auto max-w-xl rounded-2xl border bg-card p-6 text-center shadow-sm">
        <Lightbulb className="mx-auto size-7 text-primary" />
        <h1 className="mt-3 text-xl font-bold">
          {loading ? "Loading Technologies" : "Technology pack unavailable"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {loading
            ? "Preparing the cached offline technology directory."
            : (error?.message ?? "The offline knowledge pack could not be read.")}
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/compendium">Back to the compendium</Link>
        </Button>
      </main>
    </div>
  );
}

function TechnologyCard({ record }: { record: TechnologyRecord }) {
  const { data, gaps, sources } = record;
  const source = sources[0];
  const recipeGap = gaps?.find((gap) => gap.field === "craftRecipe");

  return (
    <article className="rounded-xl border border-border/80 bg-background p-4 shadow-sm transition hover:border-sky-400/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex max-w-[70%] items-center gap-1.5 rounded-full bg-sky-400/10 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
          <Tags className="size-3" />
          <span className="truncate">{data.category}</span>
        </span>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
          Lv. {data.level}
        </span>
      </div>
      <h2 className="mt-3 text-base font-bold leading-tight">{data.name}</h2>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Fact
          label="Technology cost"
          value={`${data.technologyPointCost} point${data.technologyPointCost === 1 ? "" : "s"}`}
        />
        <Fact label="Source key" value={data.sourceKey} mono />
      </dl>
      <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
        {recipeGap ? (
          <p className="rounded-md bg-muted px-2.5 py-2 leading-5">
            <strong className="text-foreground">Recipe unavailable:</strong> {recipeGap.reason}
          </p>
        ) : null}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span>{source?.tier ?? "unknown"} source</span>
          {source ? (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
            >
              Open source <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function compareTechnologies(left: TechnologyRecord, right: TechnologyRecord, order: SortOrder) {
  if (order === "name") return left.data.name.localeCompare(right.data.name);
  if (order === "cost-high") {
    const costDifference = right.data.technologyPointCost - left.data.technologyPointCost;
    if (costDifference !== 0) return costDifference;
  } else {
    const levelDifference = left.data.level - right.data.level;
    if (levelDifference !== 0) return order === "level-low" ? levelDifference : -levelDifference;
  }
  return left.data.name.localeCompare(right.data.name);
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

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`mt-1 break-words font-medium ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-6 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
