import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  Compass,
  Egg,
  Flame,
  HelpCircle,
  Info,
  Layers,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type {
  EggKnowledge,
  EggPool,
  IncubatorStructure,
  SpecialEggType,
  WildEggSpawn,
} from "@/data/palworld/knowledgeEggs";
import { useOfflineKnowledgePack } from "@/lib/use-offline-knowledge-pack";

const TITLE = "Eggs & Incubators Compendium — Hatch Pools, Wild Spawns & Special Types";
const DESCRIPTION =
  "Browse 27 Palworld egg pools, 754 wild spawn locations with exact weights, 3 special egg types, and 5 incubator technology levels.";
const SITE = "https://good-vibe-desk.kevinjackson1114.workers.dev/compendium/eggs";

type SectionFilter = "all" | "incubators" | "pools" | "spawns" | "special" | "gaps";

export const Route = createFileRoute("/compendium/eggs")({
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
  component: EggsCompendiumPage,
});

function EggsCompendiumPage() {
  const [query, setQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");

  const { records, error, loading } = useOfflineKnowledgePack<EggKnowledge>("eggs");
  const record = records[0];
  const knowledge = record?.data;
  const gaps = record?.gaps ?? [];

  const locationsList = useMemo(() => {
    if (!knowledge) return [];
    const set = new Set<string>();
    for (const spawn of knowledge.wildEggSpawns) {
      set.add(spawn.location || "world");
    }
    return Array.from(set).sort();
  }, [knowledge]);

  const filteredData = useMemo(() => {
    if (!knowledge) return null;
    const q = query.trim().toLocaleLowerCase();

    const incubatorsList = knowledge.incubators.filter((inc) => {
      if (!q) return true;
      return (
        inc.name.toLocaleLowerCase().includes(q) ||
        inc.specialEffects.some((eff) => eff.toLocaleLowerCase().includes(q))
      );
    });

    const breedingList = knowledge.breedingStructures.filter((b) => {
      if (!q) return true;
      return (
        b.name.toLocaleLowerCase().includes(q) ||
        b.specialEffects.some((eff) => eff.toLocaleLowerCase().includes(q))
      );
    });

    const specialList = knowledge.specialEggTypes.filter((spec) => {
      if (!q) return true;
      return (
        spec.eggName.toLocaleLowerCase().includes(q) ||
        spec.source.toLocaleLowerCase().includes(q) ||
        spec.notes.toLocaleLowerCase().includes(q)
      );
    });

    const poolsList = knowledge.eggPools.filter((pool) => {
      if (
        typeFilter !== "all" &&
        !pool.eggName.toLocaleLowerCase().includes(typeFilter.toLocaleLowerCase())
      ) {
        return false;
      }
      if (sizeFilter !== "all" && !matchesSizeFilter(pool.eggName, sizeFilter)) {
        return false;
      }
      if (!q) return true;
      return (
        pool.eggName.toLocaleLowerCase().includes(q) ||
        pool.pals.some(
          (p) =>
            p.palName.toLocaleLowerCase().includes(q) ||
            p.internalName.toLocaleLowerCase().includes(q),
        )
      );
    });

    const spawnsList = knowledge.wildEggSpawns.filter((spawn) => {
      if (
        typeFilter !== "all" &&
        !spawn.eggName.toLocaleLowerCase().includes(typeFilter.toLocaleLowerCase())
      ) {
        return false;
      }
      if (sizeFilter !== "all" && !matchesSizeFilter(spawn.eggName, sizeFilter)) {
        return false;
      }
      if (locationFilter !== "all") {
        const locKey = spawn.location || "world";
        if (locKey !== locationFilter) return false;
      }
      if (!q) return true;
      return (
        spawn.palName.toLocaleLowerCase().includes(q) ||
        spawn.internalName.toLocaleLowerCase().includes(q) ||
        spawn.eggName.toLocaleLowerCase().includes(q) ||
        spawn.location.toLocaleLowerCase().includes(q) ||
        spawn.spawnId.toLocaleLowerCase().includes(q)
      );
    });

    const gapsList = gaps.filter((gap) => {
      if (!q) return true;
      return (
        gap.field.toLocaleLowerCase().includes(q) ||
        gap.reason.toLocaleLowerCase().includes(q) ||
        gap.resolution.toLocaleLowerCase().includes(q)
      );
    });

    return {
      incubators: incubatorsList,
      breeding: breedingList,
      special: specialList,
      pools: poolsList,
      spawns: spawnsList,
      gaps: gapsList,
    };
  }, [knowledge, gaps, query, typeFilter, sizeFilter, locationFilter]);

  if (loading || error || !knowledge || !filteredData) {
    return <PackFeedback loading={loading} error={error} />;
  }

  const poolsCount = knowledge.eggPools.length;
  const spawnsCount = knowledge.wildEggSpawns.length;
  const incubatorsCount = knowledge.incubators.length;
  const gapsCount = gaps.length;

  const showIncubators = sectionFilter === "all" || sectionFilter === "incubators";
  const showPools = sectionFilter === "all" || sectionFilter === "pools";
  const showSpawns = sectionFilter === "all" || sectionFilter === "spawns";
  const showSpecial = sectionFilter === "all" || sectionFilter === "special";
  const showGaps = sectionFilter === "all" || sectionFilter === "gaps";

  const totalFilteredCount =
    (showIncubators ? filteredData.incubators.length + filteredData.breeding.length : 0) +
    (showPools ? filteredData.pools.length : 0) +
    (showSpawns ? filteredData.spawns.length : 0) +
    (showSpecial ? filteredData.special.length : 0) +
    (showGaps ? filteredData.gaps.length : 0);

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
        <BackLink />

        <section className="rounded-2xl border border-amber-400/25 bg-card/80 p-5 shadow-sm backdrop-blur sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <Eyebrow icon={<Egg className="size-3.5" />}>
                Offline compendium · Eggs & Hatching
              </Eyebrow>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Eggs Directory</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                Explore wild egg spawn locations with exact published weights, 27 hatch egg pools, 3
                special egg types, and incubator technology specs.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:min-w-72 sm:grid-cols-4">
              <Metric label="Egg Pools" value={String(poolsCount)} />
              <Metric label="Wild Spawns" value={String(spawnsCount)} />
              <Metric label="Incubators" value={String(incubatorsCount)} />
              <Metric label="Knowledge Gaps" value={String(gapsCount)} />
            </div>
          </div>
        </section>

        <Collapsible className="mt-5 rounded-xl border bg-card/60 p-4">
          <CollapsibleTrigger className="flex min-h-[44px] w-full items-center justify-between font-semibold text-sm text-muted-foreground hover:text-foreground">
            <span>What this can and can't tell you</span>
            <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 text-xs leading-relaxed text-muted-foreground space-y-2.5">
            <p>
              This guide provides source-verified data for 27 egg pools, 754 wild egg spawn rows, 3
              special egg types, and 5 incubator structures.
            </p>
            <p>
              <strong>Exact Weights:</strong> Wild spawn weights are preserved <em>exactly</em> as
              published (e.g. weight 10, 8, 0.3) and never converted to misleading percentages.
            </p>
            <p>
              <strong>Incubator Specs:</strong> The Egg Incubator (Level 10) and Ancient Hatchery
              (Level 76) have published capacity and speed specs. The three middle tiers (Electric
              Egg Incubator Lv 36, Large Incubator Lv 48, Large-Scale Electric Lv 58) have no
              published capacity or speed bonus in technology unlock tiles and are explicitly
              rendered as <em>Unknown (unpublished)</em>, never as zero.
            </p>
            <p>
              <strong>Breeding Farm:</strong> The Breeding Farm (Level 19) is listed separately as a
              production facility, NOT an incubator.
            </p>
            <p>
              <strong>Correction History & Gaps:</strong> This dataset corrects an earlier wiki
              error that listed only 2 incubators when the structured technology catalogue held 5.
              Seven explicit data gaps with reason codes and resolutions are documented honestly
              below.
            </p>
          </CollapsibleContent>
        </Collapsible>

        <section
          className="mt-7 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
          aria-label="Browse egg data"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <label className="block flex-1">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Search egg guide
              </span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Pal name, egg type, incubator, or location"
                  className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              </span>
            </label>

            <div className="flex flex-wrap gap-2" aria-label="Egg section filters">
              <FilterButton
                active={sectionFilter === "all"}
                onClick={() => setSectionFilter("all")}
              >
                All
              </FilterButton>
              <FilterButton
                active={sectionFilter === "incubators"}
                onClick={() => setSectionFilter("incubators")}
              >
                <Zap className="size-3.5" />
                Incubators ({filteredData.incubators.length + filteredData.breeding.length})
              </FilterButton>
              <FilterButton
                active={sectionFilter === "pools"}
                onClick={() => setSectionFilter("pools")}
              >
                <Layers className="size-3.5" />
                Egg Pools ({filteredData.pools.length})
              </FilterButton>
              <FilterButton
                active={sectionFilter === "spawns"}
                onClick={() => setSectionFilter("spawns")}
              >
                <Compass className="size-3.5" />
                Wild Spawns ({filteredData.spawns.length})
              </FilterButton>
              <FilterButton
                active={sectionFilter === "special"}
                onClick={() => setSectionFilter("special")}
              >
                <Sparkles className="size-3.5" />
                Special Eggs ({filteredData.special.length})
              </FilterButton>
              <FilterButton
                active={sectionFilter === "gaps"}
                onClick={() => setSectionFilter("gaps")}
              >
                <AlertCircle className="size-3.5" />
                Gaps ({filteredData.gaps.length})
              </FilterButton>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 border-t pt-3">
            <FilterSelect
              label="Egg Element/Type"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: "all", label: "All Egg Elements" },
                { value: "Scorching", label: "Scorching (Fire)" },
                { value: "Damp", label: "Damp (Water)" },
                { value: "Verdant", label: "Verdant (Grass)" },
                { value: "Rocky", label: "Rocky (Ground)" },
                { value: "Frozen", label: "Frozen (Ice)" },
                { value: "Electric", label: "Electric" },
                { value: "Dragon", label: "Dragon" },
                { value: "Dark", label: "Dark" },
                { value: "Common", label: "Common (Neutral)" },
              ]}
            />

            <FilterSelect
              label="Egg Size"
              value={sizeFilter}
              onChange={setSizeFilter}
              options={[
                { value: "all", label: "All Egg Sizes" },
                { value: "Normal", label: "Normal Size" },
                { value: "Large", label: "Large Size" },
                { value: "Huge", label: "Huge Size" },
              ]}
            />

            <FilterSelect
              label="Spawn Region"
              value={locationFilter}
              onChange={setLocationFilter}
              options={[
                { value: "all", label: "All Spawn Regions" },
                ...locationsList.map((loc) => ({
                  value: loc,
                  label: formatLocationName(loc),
                })),
              ]}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{totalFilteredCount}</strong> matching
              records
            </span>
            <span>Source: PalDB & Game Datamine (v1.0.3)</span>
          </div>

          {totalFilteredCount === 0 ? (
            <EmptyState text="No egg records match your search and filter criteria. Try adjusting your query or filters." />
          ) : (
            <div className="mt-6 space-y-8">
              {/* Incubators & Breeding Facilities */}
              {showIncubators &&
                (filteredData.incubators.length > 0 || filteredData.breeding.length > 0) && (
                  <div>
                    <SectionHeader
                      icon={<Zap className="size-4 text-amber-600 dark:text-amber-400" />}
                      title="Incubator & Hatching Facilities"
                      count={filteredData.incubators.length + filteredData.breeding.length}
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Structured technology catalogue records for egg hatching facilities. Capacity
                      and incubation speed bonuses are displayed exactly as verified in game
                      records.
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {filteredData.incubators.map((inc) => (
                        <IncubatorCard key={inc.technologyId} incubator={inc} />
                      ))}
                      {filteredData.breeding.map((b) => (
                        <BreedingFacilityCard key={b.technologyId} structure={b} />
                      ))}
                    </div>
                  </div>
                )}

              {/* Special Egg Types */}
              {showSpecial && filteredData.special.length > 0 && (
                <div>
                  <SectionHeader
                    icon={<Sparkles className="size-4 text-amber-600 dark:text-amber-400" />}
                    title="Special Egg Types"
                    count={filteredData.special.length}
                  />
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {filteredData.special.map((spec) => (
                      <SpecialEggCard key={spec.eggName} specialEgg={spec} />
                    ))}
                  </div>
                </div>
              )}

              {/* Egg Pools */}
              {showPools && filteredData.pools.length > 0 && (
                <div>
                  <SectionHeader
                    icon={<Layers className="size-4 text-amber-600 dark:text-amber-400" />}
                    title="Egg Hatch Pools"
                    count={filteredData.pools.length}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    27 distinct egg pool classifications detailing which Pals can hatch from each
                    egg type and size.
                  </p>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {filteredData.pools.map((pool) => (
                      <PoolCard key={pool.poolId} pool={pool} />
                    ))}
                  </div>
                </div>
              )}

              {/* Wild Egg Spawns */}
              {showSpawns && filteredData.spawns.length > 0 && (
                <div>
                  <SectionHeader
                    icon={<Compass className="size-4 text-amber-600 dark:text-amber-400" />}
                    title="Wild Egg Spawn Locations"
                    count={filteredData.spawns.length}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    754 overworld egg spawn points. Spawn weights are preserved <em>exactly</em> as
                    published without conversion.
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {filteredData.spawns.slice(0, 120).map((spawn) => (
                      <SpawnCard key={spawn.spawnId} spawn={spawn} />
                    ))}
                  </div>
                  {filteredData.spawns.length > 120 && (
                    <div className="mt-3 text-center text-xs text-muted-foreground rounded-lg border border-dashed p-3">
                      Showing 120 of {filteredData.spawns.length} matching wild egg spawns. Use the
                      search bar or filters to narrow down specific Pals or locations.
                    </div>
                  )}
                </div>
              )}

              {/* Data Gaps & Correction History */}
              {showGaps && filteredData.gaps.length > 0 && (
                <div>
                  <SectionHeader
                    icon={<AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />}
                    title="Knowledge Gaps & Provenance"
                    count={filteredData.gaps.length}
                  />
                  <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs leading-relaxed">
                    <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-200">
                      <Info className="size-4 shrink-0" />
                      Correction History & Transparency Policy
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      This repository previously corrected an egg incubator dataset error where a
                      single wiki page listed only two incubators, whereas the structured technology
                      catalogue contained five. All missing mechanics are explicitly recorded as gap
                      entries with evidence citations rather than assumed as zero or omitted.
                    </p>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {filteredData.gaps.map((gap, idx) => (
                      <GapCard key={idx} gap={gap} />
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
      <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
        {count}
      </span>
    </div>
  );
}

function IncubatorCard({ incubator }: { incubator: IncubatorStructure }) {
  const isAncient = incubator.technologyId.includes("WithBreed");

  return (
    <article className="rounded-xl border border-border/80 bg-background p-4 shadow-sm transition hover:border-amber-400/40 hover:shadow-md flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Incubator
            </span>
            <h3 className="mt-0.5 text-base font-bold leading-tight">{incubator.name}</h3>
          </div>
          <span className="shrink-0 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 border border-amber-400/30">
            Tech Lv. {incubator.unlockLevel}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-2.5 text-xs">
          <div className="rounded bg-muted/50 p-2">
            <span className="text-[11px] font-semibold text-muted-foreground block uppercase">
              Capacity
            </span>
            <span className="font-bold text-foreground">
              {incubator.capacity !== null
                ? `${incubator.capacity} Egg${incubator.capacity > 1 ? "s" : ""}`
                : "Unknown (unpublished)"}
            </span>
          </div>

          <div className="rounded bg-muted/50 p-2">
            <span className="text-[11px] font-semibold text-muted-foreground block uppercase">
              Speed Bonus
            </span>
            <span className="font-bold text-foreground">
              {incubator.incubationSpeedBonus !== null
                ? `+${(incubator.incubationSpeedBonus * 100).toFixed(0)}%`
                : "Unknown (unpublished)"}
            </span>
          </div>
        </div>

        {incubator.specialEffects.length > 0 && (
          <div className="mt-2.5 space-y-1">
            {incubator.specialEffects.map((effect, idx) => (
              <span
                key={idx}
                className={`block rounded-md px-2.5 py-1 text-xs font-medium ${
                  isAncient
                    ? "bg-purple-500/15 text-purple-800 dark:text-purple-200 border border-purple-500/30"
                    : "bg-amber-500/10 text-amber-800 dark:text-amber-200"
                }`}
              >
                {effect}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 text-[11px] text-muted-foreground border-t pt-2">
        Unlock Cost: <strong>{incubator.technologyPoints} Tech Points</strong>
      </div>
    </article>
  );
}

function BreedingFacilityCard({
  structure,
}: {
  structure: {
    technologyId: string;
    name: string;
    unlockLevel: number;
    technologyPoints: number;
    capacity: number | null;
    incubationSpeedBonus: number | null;
    specialEffects: readonly string[];
  };
}) {
  return (
    <article className="rounded-xl border border-dashed border-amber-400/50 bg-background p-4 shadow-sm transition hover:border-amber-400 hover:shadow-md flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
              Facility · NOT an Incubator
            </span>
            <h3 className="mt-0.5 text-base font-bold leading-tight">{structure.name}</h3>
          </div>
          <span className="shrink-0 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-700 dark:text-rose-300 border border-rose-400/30">
            Tech Lv. {structure.unlockLevel}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-2.5 text-xs">
          <div className="rounded bg-muted/50 p-2">
            <span className="text-[11px] font-semibold text-muted-foreground block uppercase">
              Pal Pair Slot
            </span>
            <span className="font-bold text-foreground">
              {structure.capacity !== null ? `${structure.capacity} Pals (1 Pair)` : "2 Pals"}
            </span>
          </div>

          <div className="rounded bg-muted/50 p-2">
            <span className="text-[11px] font-semibold text-muted-foreground block uppercase">
              Function
            </span>
            <span className="font-bold text-foreground">Breeds Eggs</span>
          </div>
        </div>

        {structure.specialEffects.map((effect, idx) => (
          <span
            key={idx}
            className="mt-2.5 block rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
          >
            {effect}
          </span>
        ))}
      </div>

      <div className="mt-3 text-[11px] text-muted-foreground border-t pt-2">
        Unlock Cost: <strong>{structure.technologyPoints} Tech Points</strong>
      </div>
    </article>
  );
}

function SpecialEggCard({ specialEgg }: { specialEgg: SpecialEggType }) {
  const isOminous = specialEgg.eggName.includes("Ominous");
  const isMutated = specialEgg.eggName.includes("Mutated");

  return (
    <article className="rounded-xl border border-border/80 bg-background p-4 shadow-sm transition hover:border-amber-400/40 hover:shadow-md">
      <div className="flex items-center gap-2">
        <Sparkles
          className={`size-4 ${
            isOminous ? "text-purple-500" : isMutated ? "text-emerald-500" : "text-amber-500"
          }`}
        />
        <h3 className="font-bold text-base">{specialEgg.eggName}</h3>
      </div>

      <div className="mt-2 text-xs">
        <span className="font-semibold text-muted-foreground">Source: </span>
        <span className="font-medium text-foreground">{specialEgg.source}</span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground border-t pt-2">
        {specialEgg.notes}
      </p>
    </article>
  );
}

function PoolCard({ pool }: { pool: EggPool }) {
  const [expanded, setExpanded] = useState(false);

  const displayedPals = expanded ? pool.pals : pool.pals.slice(0, 8);

  return (
    <article className="rounded-xl border border-border/80 bg-background p-4 shadow-sm transition hover:border-amber-400/40 hover:shadow-md flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Hatch Pool #{pool.poolId.replace("egg-pool:", "")}
            </span>
            <h3 className="mt-0.5 text-base font-bold leading-tight">{pool.eggName}</h3>
          </div>
          <span className="shrink-0 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300 border border-amber-400/30">
            {pool.palCount} {pool.palCount === 1 ? "Pal" : "Pals"}
          </span>
        </div>

        <div className="mt-3 border-t pt-2.5">
          <div className="flex flex-wrap gap-1.5">
            {displayedPals.map((pal, idx) => (
              <span
                key={`${pal.internalName}-${idx}`}
                className="inline-flex items-center rounded-md bg-accent/60 px-2 py-0.5 text-xs font-medium text-foreground"
              >
                {pal.palName}
              </span>
            ))}
          </div>

          {pool.pals.length > 8 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-2 min-h-[44px] text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1"
            >
              {expanded ? "Show less" : `+${pool.pals.length - 8} more Pals`}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function SpawnCard({ spawn }: { spawn: WildEggSpawn }) {
  const formattedLoc = formatLocationName(spawn.location);

  return (
    <article className="rounded-xl border border-border/80 bg-background p-3.5 shadow-sm transition hover:border-amber-400/40 hover:shadow-md flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block">
              {formattedLoc}
            </span>
            <h3 className="mt-0.5 text-sm font-bold leading-tight">{spawn.palName}</h3>
          </div>
          <span className="shrink-0 rounded bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-amber-700 dark:text-amber-300 border border-amber-400/20">
            Weight: {spawn.weight}
          </span>
        </div>

        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground border-t pt-2">
          <Egg className="size-3.5 text-amber-500 shrink-0" />
          <span className="font-medium text-foreground truncate">{spawn.eggName}</span>
        </div>
      </div>
    </article>
  );
}

function GapCard({ gap }: { gap: { field: string; reason: string; resolution: string } }) {
  return (
    <article className="rounded-xl border border-border/80 bg-background p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <HelpCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <h3 className="font-bold text-sm text-foreground">{gap.field}</h3>
      </div>

      <div className="mt-2 text-xs space-y-1.5">
        <div>
          <span className="font-semibold text-muted-foreground">Reason: </span>
          <span className="text-foreground">{gap.reason}</span>
        </div>
        <div>
          <span className="font-semibold text-muted-foreground">Resolution: </span>
          <span className="text-muted-foreground leading-relaxed">{gap.resolution}</span>
        </div>
      </div>
    </article>
  );
}

function PackFeedback({ loading, error }: { loading: boolean; error: Error | null }) {
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <main className="mx-auto max-w-xl rounded-2xl border bg-card p-6 text-center shadow-sm">
        <Egg className="mx-auto size-7 text-primary" />
        <h1 className="mt-3 text-xl font-bold">
          {loading ? "Loading Egg Compendium" : "Egg pack unavailable"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {loading
            ? "Preparing the cached offline egg directory."
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
    <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
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

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label className="block text-xs font-medium text-muted-foreground flex-1 min-w-[140px]">
      <span className="block mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-6 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function matchesSizeFilter(eggName: string, sizeFilter: string) {
  const lowerName = eggName.toLocaleLowerCase();
  if (sizeFilter === "Huge") return lowerName.includes("huge");
  if (sizeFilter === "Large")
    return lowerName.includes("large") && !lowerName.includes("large-scale");
  if (sizeFilter === "Normal") return !lowerName.includes("large") && !lowerName.includes("huge");
  return true;
}

function formatLocationName(location: string) {
  if (!location || location === "world") return "World / Overworld Spawn";
  return location.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
