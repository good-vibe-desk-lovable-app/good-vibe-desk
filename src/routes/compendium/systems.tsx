import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Calculator,
  ChevronDown,
  Cpu,
  ExternalLink,
  Flame,
  HelpCircle,
  Layers,
  Search,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type {
  PalworldSystemsKnowledge,
  SystemGapRecord,
  SystemPublishedRecord,
} from "@/data/palworld/knowledgeSystems";
import { useOfflineKnowledgePack } from "@/lib/use-offline-knowledge-pack";

const TITLE = "Systems & Formulas Compendium — Mechanics & Evidence Gaps";
const DESCRIPTION =
  "Explore 19 published Palworld mechanics, breeding formulas, condensation, work speed levels, world settings, and 10 explicit source evidence gaps.";
const SITE = "https://good-vibe-desk.kevinjackson1114.workers.dev/compendium/systems";

type ViewFilter = "all" | "published" | "gaps";
type SubjectFilter =
  | "all"
  | "breeding"
  | "condensation"
  | "awakening"
  | "work-speed"
  | "capture-combat"
  | "progression-stats"
  | "survival-work"
  | "incubation"
  | "world-settings";

export const Route = createFileRoute("/compendium/systems")({
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
  component: SystemsCompendiumPage,
});

function SystemsCompendiumPage() {
  const [query, setQuery] = useState("");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>("all");

  const { records, error, loading } = useOfflineKnowledgePack<PalworldSystemsKnowledge>("systems");
  const knowledge = records[0]?.data;

  const filteredData = useMemo(() => {
    if (!knowledge) return null;
    const q = query.trim().toLocaleLowerCase();

    const published = knowledge.publishedSystems.filter((item) => {
      const matchesQuery =
        !q ||
        item.system.toLocaleLowerCase().includes(q) ||
        item.summary.toLocaleLowerCase().includes(q) ||
        item.expressionOrValue.toLocaleLowerCase().includes(q) ||
        (item.note && item.note.toLocaleLowerCase().includes(q));

      const matchesSubject = matchSubject(item.system, subjectFilter);
      return matchesQuery && matchesSubject;
    });

    const gaps = knowledge.systemGaps.filter((item) => {
      const matchesQuery =
        !q ||
        item.system.toLocaleLowerCase().includes(q) ||
        item.summary.toLocaleLowerCase().includes(q) ||
        item.reasonCode.toLocaleLowerCase().includes(q) ||
        item.resolution.toLocaleLowerCase().includes(q);

      const matchesSubject = matchSubject(item.system, subjectFilter);
      return matchesQuery && matchesSubject;
    });

    return { published, gaps };
  }, [knowledge, query, subjectFilter]);

  if (loading || error || !knowledge || !filteredData) {
    return <PackFeedback loading={loading} error={error} />;
  }

  const publishedCount = knowledge.publishedSystems.length;
  const gapsCount = knowledge.systemGaps.length;

  const showPublished = viewFilter === "all" || viewFilter === "published";
  const showGaps = viewFilter === "all" || viewFilter === "gaps";

  const totalFilteredCount =
    (showPublished ? filteredData.published.length : 0) + (showGaps ? filteredData.gaps.length : 0);

  return (
    <div className="min-h-screen bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60"
        style={{
          background:
            "radial-gradient(65% 100% at 50% 0%, color-mix(in oklch, #8b5cf6 18%, transparent) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <BackLink />

        <section className="rounded-2xl border border-violet-400/25 bg-card/80 p-5 shadow-sm backdrop-blur sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <Eyebrow icon={<Cpu className="size-3.5" />}>
                Offline compendium · Systems & Formulas
              </Eyebrow>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Systems & Formulas Directory
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                Explore published Palworld game mechanics, breeding formulas, condensation, work
                speed levels, world settings, and documented public source evidence gaps.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:min-w-72 sm:grid-cols-4">
              <Metric label="Mechanics" value={String(publishedCount)} />
              <Metric label="Public Gaps" value={String(gapsCount)} />
              <Metric label="Subject Areas" value="9" />
              <Metric label="Game Version" value="v1.0.3" />
            </div>
          </div>
        </section>

        {/* Work Speed Distinction Banner */}
        <section
          className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-900 dark:text-amber-200"
          aria-label="Work speed constant note"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <strong className="font-bold text-sm block mb-1">
                Engine Constant Note: Base Species Work Level vs UI Enhancement Levels
              </strong>
              <p>
                <code className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-amber-800 dark:text-amber-200 font-semibold">
                  MAX_BASE_WORK_LEVEL = 8
                </code>{" "}
                in <code className="font-mono">src/lib/tiers.ts</code> remains 8. The work speed
                range of 0–10 describes reachable UI enhancement levels (including condensation and
                Applied Handbooks); base species work suitability stats cap at level 8.
              </p>
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
              This page documents 19 verified game mechanics alongside 10 explicit evidence gaps
              where exact formulas are unobtainable from public sources.
            </p>
            <p>
              Ten key mechanics (such as exact capture formulas, damage scaling, experience curves,
              and IV calculations) are recorded as explicit gaps with their resolution requirements
              rather than filled with guesses or assumed values. No other Palworld resource
              documents this honestly.
            </p>
            <p>
              World Settings sliders are sourced from wiki.gg, which carries a version stamp of
              v0.3.10.0 rather than v1.0.3. These records are explicitly flagged on their cards.
            </p>
          </CollapsibleContent>
        </Collapsible>

        <section
          className="mt-7 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
          aria-label="Browse systems data"
        >
          <div className="flex flex-col gap-4">
            <label className="block flex-1">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Search systems & formulas
              </span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search formula, mechanic, gap reason, or system name..."
                  className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              </span>
            </label>

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2" aria-label="Type filters">
                <span className="text-xs font-semibold uppercase text-muted-foreground mr-1">
                  Type:
                </span>
                <FilterButton active={viewFilter === "all"} onClick={() => setViewFilter("all")}>
                  All ({publishedCount + gapsCount})
                </FilterButton>
                <FilterButton
                  active={viewFilter === "published"}
                  onClick={() => setViewFilter("published")}
                >
                  <Calculator className="size-3.5" />
                  Published Mechanics ({publishedCount})
                </FilterButton>
                <FilterButton active={viewFilter === "gaps"} onClick={() => setViewFilter("gaps")}>
                  <ShieldAlert className="size-3.5 text-rose-500" />
                  Documented Gaps ({gapsCount})
                </FilterButton>
              </div>

              <div className="flex flex-wrap items-center gap-2" aria-label="Subject area filters">
                <span className="text-xs font-semibold uppercase text-muted-foreground mr-1">
                  Subject:
                </span>
                <FilterButton
                  active={subjectFilter === "all"}
                  onClick={() => setSubjectFilter("all")}
                >
                  All Subjects
                </FilterButton>
                <FilterButton
                  active={subjectFilter === "breeding"}
                  onClick={() => setSubjectFilter("breeding")}
                >
                  Breeding
                </FilterButton>
                <FilterButton
                  active={subjectFilter === "condensation"}
                  onClick={() => setSubjectFilter("condensation")}
                >
                  Condensation
                </FilterButton>
                <FilterButton
                  active={subjectFilter === "awakening"}
                  onClick={() => setSubjectFilter("awakening")}
                >
                  Awakening
                </FilterButton>
                <FilterButton
                  active={subjectFilter === "work-speed"}
                  onClick={() => setSubjectFilter("work-speed")}
                >
                  Work Speed
                </FilterButton>
                <FilterButton
                  active={subjectFilter === "capture-combat"}
                  onClick={() => setSubjectFilter("capture-combat")}
                >
                  Capture & Combat
                </FilterButton>
                <FilterButton
                  active={subjectFilter === "progression-stats"}
                  onClick={() => setSubjectFilter("progression-stats")}
                >
                  Progression & Stats
                </FilterButton>
                <FilterButton
                  active={subjectFilter === "survival-work"}
                  onClick={() => setSubjectFilter("survival-work")}
                >
                  Survival & Work
                </FilterButton>
                <FilterButton
                  active={subjectFilter === "incubation"}
                  onClick={() => setSubjectFilter("incubation")}
                >
                  Incubation
                </FilterButton>
                <FilterButton
                  active={subjectFilter === "world-settings"}
                  onClick={() => setSubjectFilter("world-settings")}
                >
                  World Settings
                </FilterButton>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{totalFilteredCount}</strong> matching
              entries
            </span>
            <span>Sources: PalCalc Datamined Asset DB & Wiki Mechanics (v1.0.3 / v0.3.10.0)</span>
          </div>

          {totalFilteredCount === 0 ? (
            <EmptyState text="No systems or evidence gaps match your search. Try searching for a different term or clearing filters." />
          ) : (
            <div className="mt-6 space-y-8">
              {/* Published Mechanics Section */}
              {showPublished && filteredData.published.length > 0 && (
                <div>
                  <SectionHeader
                    icon={<Calculator className="size-4 text-violet-600 dark:text-violet-400" />}
                    title="Published Game Mechanics & Formulas"
                    count={filteredData.published.length}
                  />
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {filteredData.published.map((item) => (
                      <PublishedCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* Explicit Evidence Gaps Section */}
              {showGaps && filteredData.gaps.length > 0 && (
                <div>
                  <SectionHeader
                    icon={<ShieldAlert className="size-4 text-rose-600 dark:text-rose-400" />}
                    title="Documented Public Evidence Gaps"
                    count={filteredData.gaps.length}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Formulas unobtainable from public sources. Preserved explicitly as verified gap
                    records rather than omitted or replaced with guesses.
                  </p>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {filteredData.gaps.map((item) => (
                      <GapCard key={item.id} gap={item} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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
      <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
        {count}
      </span>
    </div>
  );
}

function PublishedCard({ item }: { item: SystemPublishedRecord }) {
  const isOutdatedVersion = item.version === "v0.3.10.0";

  return (
    <article className="rounded-xl border border-border/80 bg-background p-4 shadow-sm transition hover:border-violet-400/40 hover:shadow-md flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2">
          <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300 border border-violet-500/20">
            {item.system}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                item.sourceTier === "datamined"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
              }`}
            >
              {item.sourceTier}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                isOutdatedVersion
                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {item.version}
              {isOutdatedVersion && " (stamped)"}
            </span>
          </div>
        </div>

        <h3 className="mt-2.5 font-bold text-sm leading-snug">{item.summary}</h3>

        <div className="mt-3 rounded-lg border border-primary/20 bg-muted/60 p-3 font-mono text-xs font-semibold text-foreground">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1 font-sans">
            Expression / Value:
          </span>
          <div className="break-words text-primary">{item.expressionOrValue}</div>
        </div>

        {item.note && (
          <p className="mt-2 text-xs text-muted-foreground italic leading-relaxed">{item.note}</p>
        )}
      </div>

      <div className="mt-4 border-t pt-2.5 flex items-center justify-between text-xs text-muted-foreground">
        <span>Source Citation:</span>
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline min-h-[44px] sm:min-h-0 flex-wrap"
        >
          {formatUrlHost(item.sourceUrl)}
          <ExternalLink className="size-3" />
        </a>
      </div>
    </article>
  );
}

function GapCard({ gap }: { gap: SystemGapRecord }) {
  return (
    <article className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 shadow-sm transition hover:border-rose-500/50 hover:shadow-md flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2">
          <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300 border border-rose-500/30">
            {gap.system}
          </span>
          <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
            {gap.reasonCode}
          </span>
        </div>

        <h3 className="mt-2.5 font-bold text-sm leading-snug text-foreground">{gap.summary}</h3>

        <div className="mt-3 rounded-lg border border-rose-500/20 bg-background/80 p-3 text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground block font-semibold mb-1 flex items-center gap-1">
            <HelpCircle className="size-3.5 text-rose-500 shrink-0" />
            What would resolve this gap:
          </strong>
          {gap.resolution}
        </div>
      </div>

      <div className="mt-4 border-t border-rose-500/20 pt-2 text-[11px] font-medium text-rose-700 dark:text-rose-300">
        Status: Verified Public Evidence Gap (Unresolved)
      </div>
    </article>
  );
}

function PackFeedback({ loading, error }: { loading: boolean; error: Error | null }) {
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <main className="mx-auto max-w-xl rounded-2xl border bg-card p-6 text-center shadow-sm">
        <Cpu className="mx-auto size-7 text-primary" />
        <h1 className="mt-3 text-xl font-bold">
          {loading ? "Loading Systems Guide" : "Systems pack unavailable"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {loading
            ? "Preparing the cached offline systems and formulas directory."
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
      className={`inline-flex min-h-[44px] sm:min-h-0 h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
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

function matchSubject(system: string, filter: SubjectFilter): boolean {
  if (filter === "all") return true;
  const sys = system.toLocaleLowerCase();
  switch (filter) {
    case "breeding":
      return sys.includes("breeding");
    case "condensation":
      return sys.includes("condensation");
    case "awakening":
      return sys.includes("awakening");
    case "work-speed":
      return sys.includes("work speed");
    case "capture-combat":
      return sys.includes("capture") || sys.includes("combat");
    case "progression-stats":
      return sys.includes("progression") || sys.includes("stats");
    case "survival-work":
      return sys.includes("survival") || sys.includes("base work");
    case "incubation":
      return sys.includes("incubation");
    case "world-settings":
      return sys.includes("world settings");
    default:
      return true;
  }
}

function formatUrlHost(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("github")) return "PalCalc db.json (GitHub)";
    if (parsed.hostname.includes("paldb.cc")) return "PalDB Pal Calc";
    if (parsed.hostname.includes("wiki.gg"))
      return `wiki.gg/${parsed.pathname.split("/").pop() ?? ""}`;
    return parsed.hostname;
  } catch {
    return url;
  }
}
