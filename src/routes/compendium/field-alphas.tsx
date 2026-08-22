import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Clock3,
  Database,
  ExternalLink,
  MapPin,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  PALWORLD_FIXED_FIELD_ALPHAS,
  type FieldAlphaKnowledge,
} from "@/data/palworld/knowledgeFieldAlphas";

const TITLE = "Field Alpha Compendium — Fixed World Bosses";
const DESCRIPTION =
  "Browse 65 source-backed fixed Field Boss Alpha encounters, with level, time restriction, raw game-space position, and retained provenance.";
const SITE = "https://good-vibe-desk.kevinjackson1114.workers.dev/compendium/field-alphas";

const RAW_PACK_BYTES = 109_414;
const number = new Intl.NumberFormat("en-US");

type TimeFilter = "all" | "restricted";
type SortOrder = "level-desc" | "level-asc" | "name";

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

  const records = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return PALWORLD_FIXED_FIELD_ALPHAS.filter((record) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        record.data.palName.toLocaleLowerCase().includes(normalizedQuery) ||
        record.data.sourceHref?.replaceAll("_", " ").toLocaleLowerCase().includes(normalizedQuery);
      const matchesTime = timeFilter === "all" || record.data.onlyTime !== null;

      return matchesQuery && matchesTime;
    }).toSorted((left, right) => compareRecords(left.data, right.data, sortOrder));
  }, [query, sortOrder, timeFilter]);

  const nighttimeCount = PALWORLD_FIXED_FIELD_ALPHAS.filter(
    (record) => record.data.onlyTime !== null,
  ).length;
  const minLevel = Math.min(...PALWORLD_FIXED_FIELD_ALPHAS.map((record) => record.data.level));
  const maxLevel = Math.max(...PALWORLD_FIXED_FIELD_ALPHAS.map((record) => record.data.level));

  return (
    <div className="min-h-screen bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60"
        style={{
          background:
            "radial-gradient(65% 100% at 50% 0%, color-mix(in oklch, #f59e0b 18%, transparent) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Button asChild variant="ghost" size="sm" className="mb-5 -ml-2">
          <Link to="/">
            <ArrowLeft className="size-4" />
            Back to the pathfinder
          </Link>
        </Button>

        <section className="rounded-2xl border border-amber-300/25 bg-card/80 p-5 shadow-sm backdrop-blur sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                <ShieldAlert className="size-3.5" />
                Offline compendium · Field Bosses
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Fixed Field Alphas</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                A source-backed directory of fixed Alpha Pal encounters in the overworld. Each card
                preserves the source’s level, time restriction, raw game-space position, and
                evidence trail without inventing player-map coordinates.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center sm:min-w-64">
              <Metric label="Field Bosses" value={String(PALWORLD_FIXED_FIELD_ALPHAS.length)} />
              <Metric label="Level range" value={`${minLevel}–${maxLevel}`} />
              <Metric label="Time-restricted" value={String(nighttimeCount)} />
              <Metric label="Raw pack" value={`${Math.ceil(RAW_PACK_BYTES / 1024)} KiB`} />
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-3 md:grid-cols-2">
          <Notice
            icon={<Database className="size-4" />}
            title="Strictly scoped evidence"
            body="This directory contains 65 records whose source metadata explicitly says Alpha Pal + Field Boss. It deliberately excludes 18 Dungeon Boss Alpha records rather than duplicating dungeon evidence."
          />
          <Notice
            icon={<MapPin className="size-4" />}
            title="Coordinates are intentionally raw"
            body="The source exposes game-space X/Y positions, not a stable player-map coordinate contract. Use them as retained source data; no map-pin conversion is implied."
          />
        </section>

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
              {PALWORLD_FIXED_FIELD_ALPHAS.length} Field Boss records
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
            <div className="mt-6 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No fixed Field Alpha matches that filter. Try clearing the search or showing all
              records.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function compareRecords(left: FieldAlphaKnowledge, right: FieldAlphaKnowledge, order: SortOrder) {
  if (order === "name") return left.palName.localeCompare(right.palName);
  const levelDifference = left.level - right.level;
  if (levelDifference !== 0) return order === "level-asc" ? levelDifference : -levelDifference;
  return left.palName.localeCompare(right.palName);
}

function EncounterCard({ record }: { record: (typeof PALWORLD_FIXED_FIELD_ALPHAS)[number] }) {
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

function Notice({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
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
