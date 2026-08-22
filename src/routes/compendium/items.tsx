import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronDown,
  Download,
  ExternalLink,
  HardDriveDownload,
  PackageOpen,
  Search,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { EvidenceRecord } from "@/data/palworld/knowledge";
import type { ItemKnowledge } from "@/data/palworld/knowledgeItems";
import { useOptionalItemsPack } from "@/lib/use-optional-items-pack";

const TITLE = "Items & Recipes — Optional Offline Pack";
const DESCRIPTION =
  "Download Palworld item stats and recipes explicitly for offline access, with transparent device-storage cost and removable local data.";
const SITE = "https://good-vibe-desk.kevinjackson1114.workers.dev/compendium/items";
const PAGE_SIZE = 60;

type ItemRecord = EvidenceRecord<ItemKnowledge>;

export const Route = createFileRoute("/compendium/items")({
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
  component: OptionalItemsCompendiumPage,
});

function OptionalItemsCompendiumPage() {
  const { download, error, manifest, records, remove, state } = useOptionalItemsPack();
  const [query, setQuery] = useState("");
  const [recipesOnly, setRecipesOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return records.filter((record) => {
      const matchesQuery =
        !normalizedQuery ||
        [record.data.name, record.data.slug, record.data.description, record.data.pageTitle]
          .filter(Boolean)
          .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
      return matchesQuery && (!recipesOnly || record.data.productionRows.length > 0);
    });
  }, [query, recipesOnly, records]);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [query, recipesOnly]);

  const visible = filtered.slice(0, limit);
  const installed = state === "installed";
  const downloading = state === "downloading";
  const transferSize = manifest ? formatBytes(manifest.compressedBytes) : "Loading…";
  const storedSize = manifest ? formatBytes(manifest.storageBytes) : "Loading…";
  const decodedSize = manifest ? formatBytes(manifest.uncompressedBytes) : "Loading…";

  return (
    <div className="min-h-screen bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-60"
        style={{
          background:
            "radial-gradient(65% 100% at 50% 0%, color-mix(in oklch, #f97316 18%, transparent) 0%, transparent 70%)",
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

        <section className="rounded-2xl border border-orange-400/30 bg-card/80 p-5 shadow-sm backdrop-blur sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-400/40 bg-orange-400/10 px-3 py-1 text-xs font-semibold text-orange-700 dark:text-orange-300">
                <PackageOpen className="size-3.5" />
                Optional offline catalogue
              </span>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Items & Recipes
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                Item statistics and source-bounded production rows are a large, optional pack. The
                breeding pathfinder and every other compendium directory work normally without it.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:min-w-64">
              <Metric
                label="Catalogue cards"
                value={manifest ? String(manifest.recordCount) : "…"}
              />
              <Metric label="Device state" value={statusLabel(state)} />
              <Metric label="Download" value={transferSize} />
              <Metric label="Cached archive" value={storedSize} />
            </div>
          </div>
        </section>

        <section
          className="mt-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-6"
          aria-labelledby="optional-pack-title"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 id="optional-pack-title" className="text-lg font-bold">
                {installed ? "Downloaded on this device" : "Not downloaded on this device"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {installed
                  ? "This catalogue is stored in a dedicated browser cache and can be removed here at any time."
                  : "Nothing is stored until you choose Download. The core app does not wait for, require, or silently cache this catalogue."}
              </p>
            </div>

            {installed ? (
              <Button
                variant="outline"
                onClick={() => void remove()}
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
                Remove download
              </Button>
            ) : (
              <Button
                onClick={() => void download()}
                disabled={state === "checking" || downloading || !manifest}
                className="bg-orange-600 text-white hover:bg-orange-500"
              >
                <Download className="size-4" />
                {downloading ? "Downloading…" : `Download ${transferSize}`}
              </Button>
            )}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <StorageFact
              icon={<Download className="size-4" />}
              title="Transfer before install"
              value={transferSize}
              body="The gzip archive requested only after you press Download."
            />
            <StorageFact
              icon={<HardDriveDownload className="size-4" />}
              title="Persistent device storage"
              value={storedSize}
              body="The exact compressed archive stored in a removable dedicated browser cache."
            />
            <StorageFact
              icon={<PackageOpen className="size-4" />}
              title="While browsing"
              value={decodedSize}
              body="Decoded records live in page memory only; this is not additional permanent cache storage."
            />
          </div>

          {error ? (
            <p className="mt-4 flex gap-2 rounded-lg border border-destructive/35 bg-destructive/10 p-3 text-sm leading-6 text-destructive">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              {error.message}
            </p>
          ) : null}
        </section>

        {installed ? (
          <section
            className="mt-7 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
            aria-label="Browse downloaded item catalogue"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <label className="block flex-1">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Search downloaded items
                </span>
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Item name, description, or source key"
                    className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                </span>
              </label>
              <button
                type="button"
                onClick={() => setRecipesOnly((value) => !value)}
                className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                  recipesOnly
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-foreground hover:bg-accent"
                }`}
              >
                Recipe rows only
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs text-muted-foreground">
              <span>
                Showing <strong className="text-foreground">{visible.length}</strong> of{" "}
                {filtered.length} matching downloaded cards
              </span>
              <span>{records.length} installed locally · source tier: wiki</span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((record) => (
                <ItemCard key={record.id} record={record} />
              ))}
            </div>

            {visible.length < filtered.length ? (
              <div className="mt-5 text-center">
                <Button variant="outline" onClick={() => setLimit((value) => value + PAGE_SIZE)}>
                  Show {Math.min(PAGE_SIZE, filtered.length - visible.length)} more items
                </Button>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="mt-7 rounded-2xl border border-dashed bg-card/50 p-8 text-center">
            <HardDriveDownload className="mx-auto size-7 text-muted-foreground" />
            <h2 className="mt-3 font-bold">The optional catalogue is not installed</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Download it above when you want source-backed item stats and production rows offline.
              You can remove it later from this same page; leaving it absent does not limit the core
              pathfinder.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

function ItemCard({ record }: { record: ItemRecord }) {
  const { data, gaps, sources } = record;
  const detailSource = sources[1] ?? sources[0];
  const hasStats = data.statGroups.length > 0;
  const hasProduction = data.productionRows.length > 0;

  return (
    <article className="rounded-xl border border-border/80 bg-background p-4 shadow-sm transition hover:border-orange-400/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold leading-tight">{data.name}</h2>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{data.slug}</p>
        </div>
        <span className="rounded-full bg-orange-400/10 px-2 py-1 text-xs font-semibold text-orange-700 dark:text-orange-300">
          {hasProduction ? "Recipe" : "Info"}
        </span>
      </div>

      {data.description ? (
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
          {data.description}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <Badge
          label={
            hasStats
              ? `${data.statGroups.length} stat group${data.statGroups.length === 1 ? "" : "s"}`
              : "Stats unknown"
          }
        />
        <Badge
          label={
            hasProduction
              ? `${data.productionRows.length} production row${data.productionRows.length === 1 ? "" : "s"}`
              : "Recipe unknown"
          }
        />
      </div>

      {(hasStats || hasProduction) && (
        <details className="group mt-4 rounded-lg border bg-muted/40 px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
            Source-backed details
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 space-y-3 text-xs">
            {data.statGroups.map((group, groupIndex) => (
              <dl
                key={groupIndex}
                className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-md bg-background/70 p-2"
              >
                {group.map((stat) => (
                  <div key={`${stat.label}-${stat.value}`} className="contents">
                    <dt className="text-muted-foreground">{stat.label}</dt>
                    <dd className="break-words font-medium">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            ))}
            {data.productionRows.map((row, rowIndex) => (
              <div key={rowIndex} className="rounded-md bg-background/70 p-2">
                <p>
                  <span className="text-muted-foreground">Materials:</span> {row.materials}
                </p>
                <p className="mt-1">
                  <span className="text-muted-foreground">Product:</span> {row.product}
                </p>
                <p className="mt-1">
                  <span className="text-muted-foreground">Schematic:</span> {row.schematic}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
        {gaps && gaps.length > 0 ? (
          <p>{gaps.map((gap) => `${gap.field} unavailable`).join(" · ")}</p>
        ) : null}
        {detailSource ? (
          <a
            href={detailSource.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            Open source <ExternalLink className="size-3" />
          </a>
        ) : null}
      </div>
    </article>
  );
}

function StorageFact({
  icon,
  title,
  value,
  body,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/70 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        {icon}
        {title}
      </div>
      <div className="mt-3 text-lg font-bold">{value}</div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p>
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

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-muted px-2 py-1 font-medium text-muted-foreground">
      {label}
    </span>
  );
}

function statusLabel(state: string) {
  if (state === "installed") return "Installed";
  if (state === "downloading") return "Downloading";
  if (state === "available") return "Not installed";
  if (state === "error") return "Check status";
  return "Checking";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kib = bytes / 1024;
  if (kib < 1024) return `${kib.toFixed(kib >= 100 ? 0 : 1)} KiB`;
  return `${(kib / 1024).toFixed(2)} MiB`;
}
