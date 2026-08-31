import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Castle,
  ChevronDown,
  Crosshair,
  ExternalLink,
  MapPin,
  Search,
  Shield,
  Swords,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { EvidenceRecord } from "@/data/palworld/knowledge";
import type { EncounterKnowledge } from "@/data/palworld/knowledgeEncounters";
import { useOfflineKnowledgePack } from "@/lib/use-offline-knowledge-pack";

const TITLE = "Encounter Compendium — Dungeons, Raids & Towers";
const DESCRIPTION =
  "Browse 207 source-backed Palworld dungeon, raid, and tower encounter records without loading them into the breeding pathfinder.";
const SITE = "https://good-vibe-desk.kevinjackson1114.workers.dev/compendium/encounters";

type EncounterKind = EncounterKnowledge["kind"];
type KindFilter = EncounterKind | "all";
type SortOrder = "name" | "level-low" | "level-high";

type EncounterRecord = EvidenceRecord<EncounterKnowledge>;

export const Route = createFileRoute("/compendium/encounters")({
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
  component: EncounterCompendiumPage,
});

function EncounterCompendiumPage() {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("level-low");
  const {
    records: encounters,
    error,
    loading,
  } = useOfflineKnowledgePack<EncounterKnowledge>("encounters");

  const counts = useMemo(() => countByKind(encounters), [encounters]);
  const records = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return encounters
      .filter((record) => {
        const matchesKind = kindFilter === "all" || record.data.kind === kindFilter;
        return matchesKind && matchesEncounterQuery(record, normalizedQuery);
      })
      .toSorted((left, right) => compareEncounters(left, right, sortOrder));
  }, [encounters, kindFilter, query, sortOrder]);

  if (loading || error) return <PackFeedback loading={loading} error={error} />;

  return (
    <div className="min-h-screen bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60"
        style={{
          background:
            "radial-gradient(65% 100% at 50% 0%, color-mix(in oklch, #a855f7 18%, transparent) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <BackLink />

        <section className="rounded-2xl border border-violet-400/25 bg-card/80 p-5 shadow-sm backdrop-blur sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <Eyebrow icon={<Crosshair className="size-3.5" />}>
                Offline encounter directory
              </Eyebrow>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Encounters</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                Browse verified stats and locations for dungeon bosses, raid bosses, and tower
                bosses.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-72">
              <Metric label="Dungeons" value={String(counts.dungeon)} />
              <Metric label="Raids" value={String(counts.raid)} />
              <Metric label="Towers" value={String(counts.tower)} />
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
              Shows levels, regions, and coordinates for dungeon bosses, raid bosses, and tower
              bosses based on verified game records.
            </p>
            <p>
              Fields that are not published or recorded for a specific encounter type are left blank
              rather than guessed.
            </p>
          </CollapsibleContent>
        </Collapsible>

        <section
          className="mt-7 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
          aria-label="Browse encounters"
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
                  placeholder="Boss, dungeon, leader, or region"
                  className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              </span>
            </label>

            <div className="flex flex-wrap gap-2" aria-label="Encounter filters">
              <FilterButton active={kindFilter === "all"} onClick={() => setKindFilter("all")}>
                All
              </FilterButton>
              <FilterButton
                active={kindFilter === "dungeon"}
                onClick={() => setKindFilter("dungeon")}
              >
                <Castle className="size-3.5" />
                Dungeons
              </FilterButton>
              <FilterButton active={kindFilter === "raid"} onClick={() => setKindFilter("raid")}>
                <Swords className="size-3.5" />
                Raids
              </FilterButton>
              <FilterButton active={kindFilter === "tower"} onClick={() => setKindFilter("tower")}>
                <Shield className="size-3.5" />
                Towers
              </FilterButton>
              <label className="sr-only" htmlFor="encounter-sort">
                Sort encounters
              </label>
              <select
                id="encounter-sort"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <option value="level-low">Level: low to high</option>
                <option value="level-high">Level: high to low</option>
                <option value="name">Name: A–Z</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{records.length}</strong> of{" "}
              {encounters.length} encounter records
            </span>
            <span>
              Towers retain two-source corroboration; raid and dungeon evidence keep their source
              channel.
            </span>
          </div>

          {records.length > 0 ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {records.map((record) => (
                <EncounterCard key={record.id} record={record} />
              ))}
            </div>
          ) : (
            <EmptyState text="No encounters match your search. Try searching for a different boss name, region, or encounter type." />
          )}
        </section>
      </main>
    </div>
  );
}

function matchesEncounterQuery(record: EncounterRecord, query: string) {
  if (!query) return true;
  return [
    record.data.name,
    record.data.kind,
    stringField(record.data, "dungeon"),
    stringField(record.data, "pal"),
    stringField(record.data, "leader"),
    stringField(record.data, "region"),
  ]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLocaleLowerCase().includes(query));
}

function compareEncounters(left: EncounterRecord, right: EncounterRecord, order: SortOrder) {
  if (order === "name") return left.data.name.localeCompare(right.data.name);
  const levelDifference = encounterLevel(left.data) - encounterLevel(right.data);
  if (levelDifference !== 0) return order === "level-low" ? levelDifference : -levelDifference;
  return left.data.name.localeCompare(right.data.name);
}

function countByKind(records: readonly EncounterRecord[]) {
  return records.reduce(
    (counts, record) => ({ ...counts, [record.data.kind]: counts[record.data.kind] + 1 }),
    { dungeon: 0, raid: 0, tower: 0 } as Record<EncounterKind, number>,
  );
}

function EncounterCard({ record }: { record: EncounterRecord }) {
  const source = record.sources[0];
  const level = encounterLevel(record.data);

  return (
    <article className="rounded-xl border border-border/80 bg-background p-4 shadow-sm transition hover:border-violet-400/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
            {record.data.kind}
          </span>
          <h2 className="mt-1 text-lg font-bold leading-tight">{record.data.name}</h2>
        </div>
        {level > 0 ? (
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
            Lv. {level}
          </span>
        ) : null}
      </div>

      <EncounterFacts data={record.data} />

      <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            {record.sources.length > 1
              ? `${record.sources.length}-source corroborated`
              : `${source?.tier ?? "unknown"} source`}
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
      </div>
    </article>
  );
}

function EncounterFacts({ data }: { data: EncounterKnowledge }) {
  if (data.kind === "dungeon") {
    return (
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Fact label="Dungeon" value={stringField(data, "dungeon") ?? "UNKNOWN"} />
        <Fact
          label="Source level"
          value={`Lv. ${numberField(data, "dungeonLevel") ?? "UNKNOWN"}`}
        />
        <Fact label="Boss range" value={levelRange(data)} />
      </dl>
    );
  }

  if (data.kind === "tower") {
    return (
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Fact label="Pal" value={stringField(data, "pal") ?? "UNKNOWN"} />
        <Fact label="Leader" value={stringField(data, "leader") ?? "UNKNOWN"} />
        <Fact label="Region" value={stringField(data, "region") ?? "UNKNOWN"} />
        <Fact label="Source coordinates" value={stringField(data, "coordinates") ?? "UNKNOWN"} />
        <Fact
          label="Normal / hard"
          value={`${numberField(data, "normalLevel") ?? "UNKNOWN"} / ${numberField(data, "hardModeLevel") ?? "UNKNOWN"}`}
        />
      </dl>
    );
  }

  return (
    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
      <Fact label="Channel" value="Raid boss" />
      <Fact label="Source ID" value={stringField(data, "sourceId") ?? "UNKNOWN"} />
    </dl>
  );
}

function PackFeedback({ loading, error }: { loading: boolean; error: Error | null }) {
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <main className="mx-auto max-w-xl rounded-2xl border bg-card p-6 text-center shadow-sm">
        <Crosshair className="mx-auto size-7 text-primary" />
        <h1 className="mt-3 text-xl font-bold">
          {loading ? "Loading Encounters" : "Encounter pack unavailable"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {loading
            ? "Preparing the cached offline encounter directory."
            : (error?.message ?? "The offline knowledge pack could not be read.")}
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/compendium">Back to the compendium</Link>
        </Button>
      </main>
    </div>
  );
}

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="mb-5 -ml-2">
      <Link to="/compendium">
        <ArrowLeft className="size-4" />
        Back to the compendium
      </Link>
    </Button>
  );
}

function Eyebrow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
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

function stringField(data: EncounterKnowledge, key: string) {
  const value = data[key];
  return typeof value === "string" ? value : undefined;
}

function numberField(data: EncounterKnowledge, key: string) {
  const value = data[key];
  return typeof value === "number" ? value : undefined;
}

function encounterLevel(data: EncounterKnowledge) {
  return (
    numberField(data, "level") ??
    numberField(data, "dungeonLevel") ??
    numberField(data, "normalLevel") ??
    0
  );
}

function levelRange(data: EncounterKnowledge) {
  const min = numberField(data, "minLevel");
  const max = numberField(data, "maxLevel");
  if (min === undefined || max === undefined) return "UNKNOWN";
  return min === max ? `Lv. ${min}` : `Lv. ${min}–${max}`;
}
