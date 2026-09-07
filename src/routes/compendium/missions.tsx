import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronDown,
  ExternalLink,
  MapPin,
  Route as RouteIcon,
  Search,
  ScrollText,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  BackLink,
  Eyebrow,
  Fact,
  FilterButton,
  PackFeedback,
} from "@/components/ui/compendium-helpers";
import { EmptyState, PageShell } from "@/components/ui/page-header";
import type { EvidenceRecord } from "@/data/palworld/knowledge";
import type { MissionKnowledge } from "@/data/palworld/knowledgeMissions";
import { useOfflineKnowledgePack } from "@/lib/use-offline-knowledge-pack";

const TITLE = "Mission Compendium — Main & Sub Missions";
const DESCRIPTION =
  "Browse 117 source-backed Palworld main and sub mission records, including source-visible objectives, rewards, next steps, and map targets.";
const SITE = "https://good-vibe-desk.kevinjackson1114.workers.dev/compendium/missions";

type MissionFilter = MissionKnowledge["kind"] | "all";
type MissionRecord = EvidenceRecord<MissionKnowledge>;

export const Route = createFileRoute("/compendium/missions")({
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
  component: MissionCompendiumPage,
});

function MissionCompendiumPage() {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<MissionFilter>("all");
  const [mapOnly, setMapOnly] = useState(false);
  const {
    records: missions,
    error,
    loading,
  } = useOfflineKnowledgePack<MissionKnowledge>("missions");

  const records = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return missions
      .filter((record) => {
        const matchesKind = kindFilter === "all" || record.data.kind === kindFilter;
        const matchesMap = !mapOnly || record.data.mapTargets.length > 0;
        return matchesKind && matchesMap && matchesMissionQuery(record, normalizedQuery);
      })
      .toSorted((left, right) => missionTitle(left).localeCompare(missionTitle(right)));
  }, [kindFilter, mapOnly, missions, query]);

  if (loading || error) {
    return (
      <PackFeedback
        loading={loading}
        error={error}
        icon={ScrollText}
        packName="Missions Compendium"
        loadingBody="Preparing the cached offline mission directory."
      />
    );
  }

  return (
    <PageShell>
      <BackLink />

      <section className="rounded-2xl border border-emerald-400/25 bg-card/80 p-5 shadow-sm backdrop-blur sm:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <Eyebrow icon={<ScrollText className="size-3.5" />}>Offline mission directory</Eyebrow>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Missions</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              View main and sub mission objectives, rewards, next steps, and map locations.
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
            Shows objectives, rewards, next steps, and map locations for main and sub missions
            directly from verified game records.
          </p>
          <p>Missing titles or details are left blank rather than filled with guesses.</p>
        </CollapsibleContent>
      </Collapsible>

      <section
        className="mt-7 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
        aria-label="Browse missions"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <label className="block flex-1">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Search missions
            </span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Mission, objective, reward, or next step"
                className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </span>
          </label>

          <div className="flex flex-wrap gap-2" aria-label="Mission filters">
            <FilterButton active={kindFilter === "all"} onClick={() => setKindFilter("all")}>
              All
            </FilterButton>
            <FilterButton
              active={kindFilter === "Main Mission"}
              onClick={() => setKindFilter("Main Mission")}
            >
              Main
            </FilterButton>
            <FilterButton
              active={kindFilter === "Sub Mission"}
              onClick={() => setKindFilter("Sub Mission")}
            >
              Sub
            </FilterButton>
            <FilterButton active={mapOnly} onClick={() => setMapOnly((value) => !value)}>
              <MapPin className="size-3.5" />
              Map targets
            </FilterButton>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs text-muted-foreground">
          <span>
            Showing <strong className="text-foreground">{records.length}</strong> of{" "}
            {missions.length} mission records
          </span>
          <span>Source tier: wiki · confidence: corroborated</span>
        </div>

        {records.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {records.map((record) => (
              <MissionCard key={record.id} record={record} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No missions match your search."
            body="Try searching for a different objective or showing all mission types."
          />
        )}
      </section>
    </PageShell>
  );
}

function MissionCard({ record }: { record: MissionRecord }) {
  const { data, gaps, sources } = record;
  const source = sources[0];
  const unknownFields = gaps?.map((gap) => gap.field) ?? [];

  return (
    <article className="rounded-xl border border-border/80 bg-background p-4 shadow-sm transition hover:border-emerald-400/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            {data.kind}
          </span>
          <h2 className="mt-1 text-lg font-bold leading-tight">{missionTitle(record)}</h2>
        </div>
        {data.mapTargets.length > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <MapPin className="size-3" />
            {data.mapTargets.length}
          </span>
        ) : null}
      </div>

      {data.description ? (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{data.description}</p>
      ) : null}

      <dl className="mt-4 grid gap-3 text-sm">
        <Fact label="Objective" value={data.objective} />
        <Fact label="Reward" value={data.reward} />
        <Fact label="Next" value={data.next} />
      </dl>

      {data.mapTargets.length > 0 ? (
        <div className="mt-4 rounded-lg bg-muted/70 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <RouteIcon className="size-3.5" />
            Source-visible map targets
          </div>
          <ul className="mt-2 space-y-1 text-xs">
            {data.mapTargets.map((target) => (
              <li key={`${target.name}-${target.x}-${target.y}`}>
                <span className="font-medium">{target.name || "Unnamed target"}</span>
                <span className="ml-1 font-mono text-muted-foreground">
                  ({target.x}, {target.y})
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
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
        {unknownFields.length > 0 ? (
          <p className="mt-2 rounded-md bg-muted px-2.5 py-2 leading-5">
            <strong className="text-foreground">Unknown from this source:</strong>{" "}
            {unknownFields.join(", ")}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function matchesMissionQuery(record: MissionRecord, query: string) {
  if (!query) return true;
  return [
    record.data.title,
    record.data.sourceId,
    record.data.description,
    record.data.objective,
    record.data.reward,
    record.data.next,
  ]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLocaleLowerCase().includes(query));
}

function missionTitle(record: MissionRecord) {
  return record.data.title ?? `UNKNOWN title · ${record.data.sourceId}`;
}
