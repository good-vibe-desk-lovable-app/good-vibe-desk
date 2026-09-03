import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  Hammer,
  HelpCircle,
  Lightbulb,
  Search,
  Shield,
  Zap,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { EvidenceRecord } from "@/data/palworld/knowledge";
import type { StructureKnowledge } from "@/data/palworld/knowledgeStructures";
import { useOfflineKnowledgePack } from "@/lib/use-offline-knowledge-pack";

const TITLE = "Structures Compendium — Base Build, Technology & Suitability";
const DESCRIPTION =
  "Browse 498 Palworld structure catalogue entries, construction material costs, tech unlock requirements, work suitabilities, and power metrics.";
const SITE = "https://good-vibe-desk.kevinjackson1114.workers.dev/compendium/structures";

type CategoryFilter = "all" | string;
type TechFilter = "all" | "1-15" | "16-30" | "31-50" | "51-80" | "none";

export const Route = createFileRoute("/compendium/structures")({
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
  component: StructuresCompendiumPage,
});

function StructuresCompendiumPage() {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [techFilter, setTechFilter] = useState<TechFilter>("all");
  const [suitabilityFilter, setSuitabilityFilter] = useState<string>("all");

  const { records, error, loading } = useOfflineKnowledgePack<StructureKnowledge>("structures");

  const categoriesList = useMemo(() => {
    if (!records.length) return [];
    const set = new Set<string>();
    for (const record of records) {
      if (record.data.category) set.add(record.data.category);
    }
    return Array.from(set).sort();
  }, [records]);

  const suitabilitiesList = useMemo(() => {
    if (!records.length) return [];
    const set = new Set<string>();
    for (const record of records) {
      for (const suit of record.data.requiredWorkSuitabilities) {
        if (suit.suitability) set.add(suit.suitability);
      }
    }
    return Array.from(set).sort();
  }, [records]);

  const filteredStructures = useMemo(() => {
    if (!records.length) return [];
    const q = query.trim().toLowerCase();

    return records.filter((record) => {
      const s = record.data;

      // Search query
      if (q) {
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesCategory = s.category.toLowerCase().includes(q);
        const matchesCode = s.placement.code?.toLowerCase().includes(q) ?? false;
        const matchesSourceKey = s.sourceKey.toLowerCase().includes(q);
        const matchesMaterials = s.materials.some((m) => m.materialName.toLowerCase().includes(q));
        const matchesSuitability = s.requiredWorkSuitabilities.some((w) =>
          w.suitability.toLowerCase().includes(q),
        );
        if (
          !matchesName &&
          !matchesCategory &&
          !matchesCode &&
          !matchesSourceKey &&
          !matchesMaterials &&
          !matchesSuitability
        ) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== "all" && s.category !== categoryFilter) {
        return false;
      }

      // Suitability filter
      if (suitabilityFilter !== "all") {
        const hasSuitability = s.requiredWorkSuitabilities.some(
          (w) => w.suitability === suitabilityFilter,
        );
        if (!hasSuitability) return false;
      }

      // Tech level filter
      const lvl = s.technologyUnlock.level;
      if (techFilter === "1-15") {
        if (lvl === null || lvl < 1 || lvl > 15) return false;
      } else if (techFilter === "16-30") {
        if (lvl === null || lvl < 16 || lvl > 30) return false;
      } else if (techFilter === "31-50") {
        if (lvl === null || lvl < 31 || lvl > 50) return false;
      } else if (techFilter === "51-80") {
        if (lvl === null || lvl < 51 || lvl > 80) return false;
      } else if (techFilter === "none") {
        if (lvl !== null) return false;
      }

      return true;
    });
  }, [records, query, categoryFilter, suitabilityFilter, techFilter]);

  if (loading || error || !records.length) {
    return <PackFeedback loading={loading} error={error} />;
  }

  const totalCount = records.length;
  const unlinkedCount = records.filter((r) => r.id.includes("unlinked")).length;

  return (
    <div className="min-h-screen bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60"
        style={{
          background:
            "radial-gradient(65% 100% at 50% 0%, color-mix(in oklch, #0284c7 18%, transparent) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <BackLink />

        <section className="rounded-2xl border border-sky-500/25 bg-card/80 p-5 shadow-sm backdrop-blur sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <Eyebrow icon={<Building2 className="size-3.5" />}>
                Offline compendium · Structures
              </Eyebrow>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Structure Directory
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                Browse all 498 Palworld base structures, production facilities, defenses, storage,
                incubators, construction materials, required work suitabilities, and technology
                unlock levels.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:min-w-72 sm:grid-cols-4">
              <Metric label="Structures" value={String(totalCount)} />
              <Metric label="Categories" value={String(categoriesList.length)} />
              <Metric label="Work Types" value={String(suitabilitiesList.length)} />
              <Metric label="Unlinked Gaps" value={String(unlinkedCount)} />
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
              Contains 498 structure catalogue records from PalDB (v1.0.3), detailing material
              costs, required work suitabilities, and power draw/output metrics.
            </p>
            <p>
              Technology levels are cross-referenced directly from the structured technology
              catalogue (`knowledgeTechnologies.ts`). Two unlinked catalogue entries lacking detail
              pages (e.g. <em>Banyan_Big</em> and <em>DamagedScarecrow_Test</em>) are retained with
              their explicit gap reasons rather than excluded or zeroed out.
            </p>
            <p>
              All five hatching facilities (Egg Incubator at Lv. 10, Electric Egg Incubator at Lv.
              36, Large Incubator at Lv. 48, Large-Scale Electric Egg Incubator at Lv. 58, and
              Ancient Hatchery at Lv. 76) are accurately verified from structured technology data.
            </p>
          </CollapsibleContent>
        </Collapsible>

        <section
          className="mt-7 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
          aria-label="Browse structures data"
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <label className="block flex-1">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Search structures
                </span>
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Structure name, material (e.g. Ingot), suitability, category..."
                    className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                </span>
              </label>

              <div className="flex flex-wrap gap-2">
                <div className="flex flex-col gap-1 min-w-36">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Category
                  </span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <option value="all">All Categories ({categoriesList.length})</option>
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1 min-w-36">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Work Suitability
                  </span>
                  <select
                    value={suitabilityFilter}
                    onChange={(e) => setSuitabilityFilter(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <option value="all">All Suitabilities ({suitabilitiesList.length})</option>
                    {suitabilitiesList.map((suit) => (
                      <option key={suit} value={suit}>
                        {suit}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1 min-w-36">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Tech Range
                  </span>
                  <select
                    value={techFilter}
                    onChange={(e) => setTechFilter(e.target.value as TechFilter)}
                    className="h-10 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <option value="all">All Tech Levels</option>
                    <option value="1-15">Levels 1 – 15</option>
                    <option value="16-30">Levels 16 – 30</option>
                    <option value="31-50">Levels 31 – 50</option>
                    <option value="51-80">Levels 51 – 80</option>
                    <option value="none">Unlinked / No Tech Level</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
              <span>
                Showing <strong className="text-foreground">{filteredStructures.length}</strong> of{" "}
                {totalCount} matching structures
              </span>
              <span>Source: PalDB Structure Catalogue (v1.0.3)</span>
            </div>
          </div>

          {filteredStructures.length === 0 ? (
            <EmptyState text="No structures match your search criteria. Try clearing filters or searching for a different item or material." />
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredStructures.map((record) => (
                <StructureCard key={record.id} record={record} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StructureCard({ record }: { record: EvidenceRecord<StructureKnowledge> }) {
  const s = record.data;
  const isUnlinked = record.id.includes("unlinked") || Boolean(record.gaps?.length);
  const gapReason = record.gaps?.[0]?.reason;

  const techLevel = s.technologyUnlock.level;
  const techPointCost = s.technologyUnlock.pointCost;
  const techPointType = s.technologyUnlock.pointType;

  const hasPower = s.power && (s.power.type !== "none" || s.power.amount !== null);

  return (
    <article
      className={`flex flex-col justify-between rounded-xl border bg-background p-4 shadow-sm transition hover:shadow-md ${
        isUnlinked
          ? "border-amber-500/40 bg-amber-500/5 dark:border-amber-500/30"
          : "border-border/80 hover:border-sky-500/40"
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
              {s.category || "Unknown"}
            </span>
            <h3 className="mt-0.5 text-base font-bold leading-tight">{s.name}</h3>
          </div>
          {techLevel !== null ? (
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                techPointType === "ancient"
                  ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30"
                  : "bg-primary/10 text-primary"
              }`}
            >
              Lv. {techLevel}
              {techPointCost !== null ? ` (${techPointCost} pt)` : ""}
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {isUnlinked ? "Unlinked" : "No Tech"}
            </span>
          )}
        </div>

        {isUnlinked && (
          <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-200">
            <div className="flex items-center gap-1.5 font-semibold">
              <HelpCircle className="size-3.5 text-amber-600 dark:text-amber-400" />
              Unlinked Structure Gap
            </div>
            <p className="mt-1 text-[11px] leading-relaxed">
              {gapReason || "This structure row in the catalogue lacks an individual detail page."}
            </p>
          </div>
        )}

        {/* Construction Materials */}
        <div className="mt-3 border-t pt-2.5">
          <h4 className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Hammer className="size-3" /> Materials Required
          </h4>
          {s.materials.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {s.materials.map((m, idx) => (
                <span
                  key={`${m.materialName}-${idx}`}
                  className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
                >
                  <span>{m.materialName}:</span>
                  <strong className="text-primary">{m.quantity}</strong>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-xs italic text-muted-foreground">None required</p>
          )}
        </div>

        {/* Work Suitability Requirements */}
        {s.requiredWorkSuitabilities.length > 0 && (
          <div className="mt-3 border-t pt-2.5">
            <h4 className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Lightbulb className="size-3 text-amber-500" /> Required Work Suitability
            </h4>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {s.requiredWorkSuitabilities.map((w, idx) => (
                <span
                  key={`${w.suitability}-${idx}`}
                  className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300 border border-amber-500/20"
                >
                  {w.suitability} {w.level > 1 ? `Lv. ${w.level}` : ""}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Power draw or output */}
        {hasPower && (
          <div className="mt-3 border-t pt-2.5">
            <h4 className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Zap className="size-3 text-yellow-500" /> Power Specification
            </h4>
            <p className="mt-1 text-xs text-foreground font-medium">
              Type: <span className="capitalize">{s.power.type}</span>
              {s.power.amount !== null ? ` (${s.power.amount} W)` : ""}
            </p>
          </div>
        )}
      </div>

      {/* Footer stats: HP, Defense */}
      {(s.placement.hp !== null || s.placement.defense !== null) && (
        <div className="mt-4 flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
          {s.placement.hp !== null && (
            <span>
              HP: <strong className="text-foreground">{s.placement.hp}</strong>
            </span>
          )}
          {s.placement.defense !== null && (
            <span className="flex items-center gap-0.5">
              <Shield className="size-3" />
              Defense: <strong className="text-foreground">{s.placement.defense}</strong>
            </span>
          )}
        </div>
      )}
    </article>
  );
}

function PackFeedback({ loading, error }: { loading: boolean; error: Error | null }) {
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <main className="mx-auto max-w-xl rounded-2xl border bg-card p-6 text-center shadow-sm">
        <Building2 className="mx-auto size-7 text-primary" />
        <h1 className="mt-3 text-xl font-bold">
          {loading ? "Loading Structures Guide" : "Structures pack unavailable"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {loading
            ? "Preparing the cached offline structures directory."
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
    <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-6 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
