import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Clock3, Database, ExternalLink, Search, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BackLink, Eyebrow, FilterButton, PackFeedback } from "@/components/ui/compendium-helpers";
import { EmptyState, PageShell } from "@/components/ui/page-header";
import type { EvidenceRecord } from "@/data/palworld/knowledge";
import type { FieldAlphaKnowledge } from "@/data/palworld/knowledgeFieldAlphas";
import { useOfflineKnowledgePack } from "@/lib/use-offline-knowledge-pack";

const TITLE = "Field Alpha Compendium — Fixed World Bosses";
const DESCRIPTION =
  "Browse 65 source-backed fixed Field Boss Alpha encounters, with level, time restriction, raw game-space position, and retained provenance.";
const SITE = "https://good-vibe-desk.kevinjackson1114.workers.dev/compendium/field-alphas";

const number = new Intl.NumberFormat("en-US");

type TimeFilter = "all" | "restricted";
type SortOrder = "level-desc" | "level-asc" | "name";
type FieldAlphaRecord = EvidenceRecord<FieldAlphaKnowledge>;

export const Route = createFileRoute("/compendium/field-alphas")({
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
  component: FieldAlphaCompendiumPage,
});

function FieldAlphaCompendiumPage() {
  const [query, setQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("level-desc");
  const {
    records: fieldAlphas,
    error,
    loading,
  } = useOfflineKnowledgePack<FieldAlphaKnowledge>("field-alphas");

  const records = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return fieldAlphas
      .filter((record) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          record.data.palName.toLocaleLowerCase().includes(normalizedQuery) ||
          record.data.sourceHref
            ?.replaceAll("_", " ")
            .toLocaleLowerCase()
            .includes(normalizedQuery);
        const matchesTime = timeFilter === "all" || record.data.onlyTime !== null;

        return matchesQuery && matchesTime;
      })
      .toSorted((left, right) => compareRecords(left.data, right.data, sortOrder));
  }, [fieldAlphas, query, sortOrder, timeFilter]);

  if (loading || error) {
    return (
      <PackFeedback
        loading={loading}
        error={error}
        icon={ShieldAlert}
        packName="Field Alphas"
        loadingBody="Preparing the cached offline Field Alpha directory."
      />
    );
  }

  return (
    <PageShell>
      <BackLink />

      <section className="rounded-2xl border border-amber-300/25 bg-card/80 p-5 shadow-sm backdrop-blur sm:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <Eyebrow icon={<ShieldAlert className="size-3.5" />}>
              Offline compendium · Field Bosses
            </Eyebrow>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Fixed Field Alphas
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              Find fixed overworld Alpha Pal bosses with their levels, spawn times, and map
              locations.
            </p>
          </div>
        </div>
      </section>

      <Collapsible className="mt-5 rounded-xl border bg-card/60 p-4">
        <CollapsibleTrigger className="flex w-full items-center justify-between font-semibold text-sm text-muted-foreground hover:text-foreground">
          <span>What this can and can't tell you</span>
          <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 text-xs leading-relaxed text-muted-foreground space-y-2">
          <p>
            Includes 65 fixed overworld Alpha bosses with verified level and time requirements.
            Dungeon Alpha bosses are listed separately in the Encounters guide.
          </p>
          <p>Position coordinates are raw game-space numbers directly from game data.</p>
        </CollapsibleContent>
      </Collapsible>

      <section
        className="mt-7 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
        aria-label="Browse Field Alpha records"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <label className="block flex-1">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Search encounters
            </span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Pal or encounter title"
                className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </span>
          </label>

          <div className="flex flex-wrap gap-2" aria-label="Field Alpha filters">
            <FilterButton active={timeFilter === "all"} onClick={() => setTimeFilter("all")}>
              All records
            </FilterButton>
            <FilterButton
              active={timeFilter === "restricted"}
              onClick={() => setTimeFilter("restricted")}
            >
              <Clock3 className="size-3.5" />
              Time-restricted
            </FilterButton>
            <label className="sr-only" htmlFor="field-alpha-sort">
              Sort Field Alpha records
            </label>
            <select
              id="field-alpha-sort"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as SortOrder)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="level-desc">Level: high to low</option>
              <option value="level-asc">Level: low to high</option>
              <option value="name">Name: A–Z</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
          <span>
            Showing <strong className="text-foreground">{records.length}</strong> of{" "}
            {fieldAlphas.length} Field Boss records
          </span>
          <span>Source tier: wiki · confidence: corroborated</span>
        </div>

        {records.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {records.map((record) => (
              <EncounterCard key={record.id} record={record} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No Field Alpha bosses match your search."
            body="Try clearing the search or showing all records."
          />
        )}
      </section>
    </PageShell>
  );
}

function compareRecords(left: FieldAlphaKnowledge, right: FieldAlphaKnowledge, order: SortOrder) {
  if (order === "name") return left.palName.localeCompare(right.palName);
  const levelDifference = left.level - right.level;
  if (levelDifference !== 0) return order === "level-asc" ? levelDifference : -levelDifference;
  return left.palName.localeCompare(right.palName);
}

function EncounterCard({ record }: { record: FieldAlphaRecord }) {
  const { data, gaps, sources } = record;
  const source = sources[0];
  const mapGap = gaps?.[0];

  return (
    <article className="rounded-xl border border-border/80 bg-background p-4 shadow-sm transition hover:border-amber-400/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Fixed Field Alpha
          </p>
          <h2 className="mt-1 text-lg font-bold leading-tight">{data.palName}</h2>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
          Lv. {data.level}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Time
          </dt>
          <dd className="mt-1 font-medium">{data.onlyTime ?? "Any time"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Source position
          </dt>
          <dd className="mt-1 font-mono text-xs font-medium">
            X {number.format(data.rawPosition.x)} · Y {number.format(data.rawPosition.y)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5">
            <Database className="size-3.5" />
            {source?.tier ?? "unknown"} source · {source?.locator ?? "No locator retained"}
          </span>
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
        {mapGap ? (
          <p className="mt-2 rounded-md bg-muted px-2.5 py-2 leading-5">
            <strong className="text-foreground">Map note:</strong> {mapGap.reason}
          </p>
        ) : null}
      </div>
    </article>
  );
}
