import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  Route as RouteIcon,
  Search,
  ScrollText,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
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

  const counts = useMemo(() => missionCounts(missions), [missions]);
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

  if (loading || error) return <PackFeedback loading={loading} error={error} />;

  return (
    <div className="min-h-screen bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60"
        style={{
          background:
            "radial-gradient(65% 100% at 50% 0%, color-mix(in oklch, #22c55e 18%, transparent) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Button asChild variant="ghost" size="sm" className="mb-5 -ml-2">
          <Link to="/compendium">
            <ArrowLeft className="size-4" />
            Back to the compendium
          </Link>
        </Button>

        <section className="rounded-2xl border border-emerald-400/25 bg-card/80 p-5 shadow-sm backdrop-blur sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <ScrollText className="size-3.5" />
                Offline mission directory
              </span>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Missions</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                Main and sub mission cards exactly as their bounded source exposes them. Missing
                title or narrative fields remain unknown; this directory does not fill them from
                unsourced prose.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-72">
              <Metric label="Main" value={String(counts.main)} />
              <Metric label="Sub" value={String(counts.sub)} />
              <Metric label="Map targets" value={String(counts.mapTargets)} />
            </div>
          </div>
        </section>

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
            <EmptyState text="No missions match that filter. Try a different term or show all mission types." />
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
        <ScrollText className="mx-auto size-7 text-primary" />
        <h1 className="mt-3 text-xl font-bold">
          {loading ? "Loading Missions" : "Mission pack unavailable"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {loading
            ? "Preparing the cached offline mission directory."
            : (error?.message ?? "The offline knowledge pack could not be read.")}
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/compendium">Back to the compendium</Link>
        </Button>
      </main>
    </div>
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

function missionCounts(records: readonly MissionRecord[]) {
  return records.reduce(
    (counts, record) => ({
      main: counts.main + (record.data.kind === "Main Mission" ? 1 : 0),
      sub: counts.sub + (record.data.kind === "Sub Mission" ? 1 : 0),
      mapTargets: counts.mapTargets + record.data.mapTargets.length,
    }),
    { main: 0, sub: 0, mapTargets: 0 },
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

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value ?? "UNKNOWN"}</dd>
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
      className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
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
