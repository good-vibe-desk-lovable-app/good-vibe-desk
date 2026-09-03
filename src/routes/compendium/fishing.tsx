import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Anchor,
  ArrowLeft,
  ChevronDown,
  Compass,
  Eye,
  Fish,
  Package,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type {
  FishingEquipmentRecord,
  FishingLootRow,
  FishingSpotRecord,
  FishingSupportPalRecord,
  PalworldFishingKnowledge,
  ShadowTypeRecord,
} from "@/data/palworld/knowledgeFishing";
import { useOfflineKnowledgePack } from "@/lib/use-offline-knowledge-pack";

const TITLE = "Fishing Compendium — Spots, Catches, Bait & Loot Tables";
const DESCRIPTION =
  "Browse 115 Palworld fishing spots, catch tables, loot odds, fishing rods, bait, support Pals, and water shadow indicators.";
const SITE = "https://good-vibe-desk.kevinjackson1114.workers.dev/compendium/fishing";

type SectionFilter = "all" | "spots" | "loot" | "equipment" | "pals" | "shadows";

export const Route = createFileRoute("/compendium/fishing")({
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
  component: FishingCompendiumPage,
});

function FishingCompendiumPage() {
  const [query, setQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>("all");

  const { records, error, loading } = useOfflineKnowledgePack<PalworldFishingKnowledge>("fishing");
  const knowledge = records[0]?.data;

  const filteredData = useMemo(() => {
    if (!knowledge) return null;
    const q = query.trim().toLocaleLowerCase();

    const spotsList = Object.values(knowledge.spots).filter((spot) => {
      if (!q) return true;
      return (
        spot.spotId.toLocaleLowerCase().includes(q) ||
        spot.zone.toLocaleLowerCase().includes(q) ||
        spot.rarity.toLocaleLowerCase().includes(q) ||
        spot.catches.some(
          (c) =>
            c.displayName.toLocaleLowerCase().includes(q) ||
            c.internalName.toLocaleLowerCase().includes(q),
        )
      );
    });

    const lootEntries = Object.entries(knowledge.lootTables).filter(([tableName, rows]) => {
      if (!q) return true;
      return (
        tableName.toLocaleLowerCase().includes(q) ||
        rows.some((r) => r.item.toLocaleLowerCase().includes(q))
      );
    });

    const equipmentList = Object.values(knowledge.equipment).filter((eq) => {
      if (!q) return true;
      const cleanName = formatEquipmentName(eq.id, eq.name);
      return cleanName.toLocaleLowerCase().includes(q) || eq.effect.toLocaleLowerCase().includes(q);
    });

    const supportPalsList = Object.values(knowledge.supportPals).filter((pal) => {
      if (!q) return true;
      return (
        pal.internalName.toLocaleLowerCase().includes(q) ||
        pal.skillName.toLocaleLowerCase().includes(q) ||
        pal.description.toLocaleLowerCase().includes(q)
      );
    });

    const shadowTypesList = knowledge.shadowTypes.filter((shadow) => {
      if (!q) return true;
      return (
        shadow.type.toLocaleLowerCase().includes(q) ||
        shadow.indicator.toLocaleLowerCase().includes(q)
      );
    });

    return {
      spots: spotsList,
      lootTables: lootEntries,
      equipment: equipmentList,
      supportPals: supportPalsList,
      shadowTypes: shadowTypesList,
    };
  }, [knowledge, query]);

  if (loading || error || !knowledge || !filteredData) {
    return <PackFeedback loading={loading} error={error} />;
  }

  const spotsCount = Object.keys(knowledge.spots).length;
  const lootCount = Object.keys(knowledge.lootTables).length;
  const eqCount = Object.keys(knowledge.equipment).length;
  const palsCount = Object.keys(knowledge.supportPals).length;

  const showSpots = sectionFilter === "all" || sectionFilter === "spots";
  const showLoot = sectionFilter === "all" || sectionFilter === "loot";
  const showEquipment = sectionFilter === "all" || sectionFilter === "equipment";
  const showPals = sectionFilter === "all" || sectionFilter === "pals";
  const showShadows = sectionFilter === "all" || sectionFilter === "shadows";

  const totalFilteredCount =
    (showSpots ? filteredData.spots.length : 0) +
    (showLoot ? filteredData.lootTables.length : 0) +
    (showEquipment ? filteredData.equipment.length : 0) +
    (showPals ? filteredData.supportPals.length : 0) +
    (showShadows ? filteredData.shadowTypes.length : 0);

  return (
    <div className="min-h-screen bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60"
        style={{
          background:
            "radial-gradient(65% 100% at 50% 0%, color-mix(in oklch, #06b6d4 18%, transparent) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <BackLink />

        <section className="rounded-2xl border border-cyan-400/25 bg-card/80 p-5 shadow-sm backdrop-blur sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <Eyebrow icon={<Fish className="size-3.5" />}>Offline compendium · Fishing</Eyebrow>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Fishing Directory
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                Explore fishing spots across all regions, catch distributions, loot table odds, rods
                and bait tech, partner skills, and water shadow indicators.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:min-w-72 sm:grid-cols-4">
              <Metric label="Spots" value={String(spotsCount)} />
              <Metric label="Loot Tables" value={String(lootCount)} />
              <Metric label="Rods & Bait" value={String(eqCount)} />
              <Metric label="Support Pals" value={String(palsCount)} />
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
              Provides verified records for 115 fishing spots, catch tables, item drop tables,
              fishing rods, bait, support Pal partner skills, and shadow type indicators.
            </p>
            <p>
              Loot table weights and drop chances are displayed exactly as published without
              percentage recalculation. Unlocks reflect in-game technology level requirements.
            </p>
          </CollapsibleContent>
        </Collapsible>

        <section
          className="mt-7 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
          aria-label="Browse fishing data"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <label className="block flex-1">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Search fishing guide
              </span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Spot, Pal, zone, bait, rod, or item name"
                  className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              </span>
            </label>

            <div className="flex flex-wrap gap-2" aria-label="Fishing section filters">
              <FilterButton
                active={sectionFilter === "all"}
                onClick={() => setSectionFilter("all")}
              >
                All
              </FilterButton>
              <FilterButton
                active={sectionFilter === "spots"}
                onClick={() => setSectionFilter("spots")}
              >
                <Compass className="size-3.5" />
                Spots ({filteredData.spots.length})
              </FilterButton>
              <FilterButton
                active={sectionFilter === "loot"}
                onClick={() => setSectionFilter("loot")}
              >
                <Sparkles className="size-3.5" />
                Loot ({filteredData.lootTables.length})
              </FilterButton>
              <FilterButton
                active={sectionFilter === "equipment"}
                onClick={() => setSectionFilter("equipment")}
              >
                <Anchor className="size-3.5" />
                Rods & Bait ({filteredData.equipment.length})
              </FilterButton>
              <FilterButton
                active={sectionFilter === "pals"}
                onClick={() => setSectionFilter("pals")}
              >
                <Users className="size-3.5" />
                Support Pals ({filteredData.supportPals.length})
              </FilterButton>
              <FilterButton
                active={sectionFilter === "shadows"}
                onClick={() => setSectionFilter("shadows")}
              >
                <Eye className="size-3.5" />
                Shadows ({filteredData.shadowTypes.length})
              </FilterButton>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{totalFilteredCount}</strong> matching
              entries
            </span>
            <span>Source: PalDB Fishing Catalogue (v1.0.3)</span>
          </div>

          {totalFilteredCount === 0 ? (
            <EmptyState text="No fishing records match your search. Try searching for a different spot, Pal, rod, or item name." />
          ) : (
            <div className="mt-6 space-y-8">
              {/* Fishing Spots Section */}
              {showSpots && filteredData.spots.length > 0 && (
                <div>
                  <SectionHeader
                    icon={<Compass className="size-4 text-cyan-600 dark:text-cyan-400" />}
                    title="Fishing Spots"
                    count={filteredData.spots.length}
                  />
                  <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {filteredData.spots.map((spot) => (
                      <SpotCard key={spot.spotId} spot={spot} />
                    ))}
                  </div>
                </div>
              )}

              {/* Support Pals Section */}
              {showPals && filteredData.supportPals.length > 0 && (
                <div>
                  <SectionHeader
                    icon={<Users className="size-4 text-cyan-600 dark:text-cyan-400" />}
                    title="Fishing Support Pals"
                    count={filteredData.supportPals.length}
                  />
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {filteredData.supportPals.map((pal) => (
                      <SupportPalCard key={pal.internalName} pal={pal} />
                    ))}
                  </div>
                </div>
              )}

              {/* Equipment (Rods & Bait) Section */}
              {showEquipment && filteredData.equipment.length > 0 && (
                <div>
                  <SectionHeader
                    icon={<Anchor className="size-4 text-cyan-600 dark:text-cyan-400" />}
                    title="Rods, Bait & Facilities"
                    count={filteredData.equipment.length}
                  />
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {filteredData.equipment.map((eq) => (
                      <EquipmentCard key={eq.id} equipment={eq} />
                    ))}
                  </div>
                </div>
              )}

              {/* Shadow Types Section */}
              {showShadows && filteredData.shadowTypes.length > 0 && (
                <div>
                  <SectionHeader
                    icon={<Eye className="size-4 text-cyan-600 dark:text-cyan-400" />}
                    title="Water Shadow Indicators"
                    count={filteredData.shadowTypes.length}
                  />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {filteredData.shadowTypes.map((shadow) => (
                      <ShadowCard key={shadow.type} shadow={shadow} />
                    ))}
                  </div>
                </div>
              )}

              {/* Loot Tables Section */}
              {showLoot && filteredData.lootTables.length > 0 && (
                <div>
                  <SectionHeader
                    icon={<Package className="size-4 text-cyan-600 dark:text-cyan-400" />}
                    title="Fishing Drop Tables"
                    count={filteredData.lootTables.length}
                  />
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {filteredData.lootTables.map(([tableName, rows]) => (
                      <LootTableCard key={tableName} tableName={tableName} rows={rows} />
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
      <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
        {count}
      </span>
    </div>
  );
}

function SpotCard({ spot }: { spot: FishingSpotRecord }) {
  return (
    <article className="rounded-xl border border-border/80 bg-background p-4 shadow-sm transition hover:border-cyan-400/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
            {formatZoneName(spot.zone)}
          </span>
          <h3 className="mt-0.5 text-base font-bold leading-tight">{spot.spotId}</h3>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            spot.rarity.toLocaleLowerCase() === "rare"
              ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {spot.rarity}
        </span>
      </div>

      <div className="mt-3 border-t pt-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Available Catches ({spot.catches.length})
        </h4>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {spot.catches.map((c, i) => (
            <span
              key={`${c.internalName}-${i}`}
              className="inline-flex items-center rounded-md bg-accent/60 px-2 py-0.5 text-xs font-medium text-foreground"
            >
              {c.displayName}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function LootTableCard({
  tableName,
  rows,
}: {
  tableName: string;
  rows: readonly FishingLootRow[];
}) {
  return (
    <article className="rounded-xl border border-border/80 bg-background p-4 shadow-sm transition hover:border-cyan-400/40 hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold text-base text-foreground">{tableName}</h3>
        <span className="text-xs font-medium text-muted-foreground">
          {rows.length} {rows.length === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="mt-3 divide-y border-t text-xs">
        {rows.map((row, idx) => (
          <div key={idx} className="flex items-center justify-between py-2 gap-2">
            <span className="font-medium text-foreground">{row.item}</span>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-muted-foreground">Qty: {row.quantity}</span>
              <span className="rounded bg-cyan-500/10 px-2 py-0.5 font-mono text-cyan-700 dark:text-cyan-300 font-semibold">
                {row.rate}
              </span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function EquipmentCard({ equipment }: { equipment: FishingEquipmentRecord }) {
  const cleanName = formatEquipmentName(equipment.id, equipment.name);
  const isRod = cleanName.includes("Rod");
  const isBait = cleanName.includes("Bait");
  const isPond = cleanName.includes("Pond");

  return (
    <article className="rounded-xl border border-border/80 bg-background p-4 shadow-sm transition hover:border-cyan-400/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
            {isRod ? "Fishing Rod" : isBait ? "Bait" : isPond ? "Facility" : "Equipment"}
          </span>
          <h3 className="mt-0.5 text-base font-bold leading-tight">{cleanName}</h3>
        </div>
        {equipment.unlockLevel !== undefined ? (
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
            Technology Lv. {equipment.unlockLevel}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Special
          </span>
        )}
      </div>

      <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-muted-foreground border-t pt-2.5">
        {equipment.effect}
      </p>
    </article>
  );
}

function SupportPalCard({ pal }: { pal: FishingSupportPalRecord }) {
  const levelKeys = [1, 2, 3, 4, 5];

  return (
    <article className="rounded-xl border border-border/80 bg-background p-4 shadow-sm transition hover:border-cyan-400/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
            Support Pal
          </span>
          <h3 className="mt-0.5 text-base font-bold leading-tight">{pal.internalName}</h3>
        </div>
      </div>

      <div className="mt-2 text-xs font-semibold text-foreground">{pal.skillName}</div>

      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{pal.description}</p>

      <div className="mt-4 border-t pt-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Partner Skill Scaling (Levels 1–5)
        </h4>
        <div className="space-y-1.5 text-xs">
          {levelKeys.map((lvl) => {
            const stats = pal.levels[lvl] ?? pal.levels[String(lvl) as unknown as number];
            if (!stats) return null;
            const entries = Object.entries(stats).filter(([_, val]) => val !== "");

            return (
              <div
                key={lvl}
                className="flex flex-col sm:flex-row sm:items-center justify-between rounded bg-muted/50 px-2.5 py-1.5 gap-1"
              >
                <span className="font-bold text-primary shrink-0">Level {lvl}</span>
                <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  {entries.map(([key, val]) => (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 bg-background px-1.5 py-0.5 rounded border"
                    >
                      <span className="font-mono text-foreground">{formatSkillParamKey(key)}:</span>
                      <strong className="text-foreground">{val}%</strong>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function ShadowCard({ shadow }: { shadow: ShadowTypeRecord }) {
  const isPurpleSparkle = shadow.type.toLowerCase().includes("purple sparkles");
  const isGreenSparkle = shadow.type.toLowerCase().includes("green sparkles");
  const isGeyser = shadow.type.toLowerCase().includes("geyser");

  return (
    <article className="rounded-xl border border-border/80 bg-background p-4 shadow-sm transition hover:border-cyan-400/40 hover:shadow-md">
      <div className="flex items-center gap-2">
        <span
          className={`size-3 rounded-full ${
            isPurpleSparkle
              ? "bg-purple-500 shadow-sm shadow-purple-500/50 animate-pulse"
              : isGreenSparkle
                ? "bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse"
                : isGeyser
                  ? "bg-indigo-500 shadow-sm shadow-indigo-500/50"
                  : "bg-blue-400"
          }`}
        />
        <h3 className="font-bold text-sm">{shadow.type}</h3>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{shadow.indicator}</p>
    </article>
  );
}

function PackFeedback({ loading, error }: { loading: boolean; error: Error | null }) {
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <main className="mx-auto max-w-xl rounded-2xl border bg-card p-6 text-center shadow-sm">
        <Fish className="mx-auto size-7 text-primary" />
        <h1 className="mt-3 text-xl font-bold">
          {loading ? "Loading Fishing Guide" : "Fishing pack unavailable"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {loading
            ? "Preparing the cached offline fishing directory."
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
    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
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

function formatEquipmentName(id: string, fallbackName: string) {
  const decoded = decodeURIComponent(id);
  return decoded.replaceAll("_", " ");
}

function formatZoneName(zone: string) {
  return zone.replaceAll("_", " ");
}

function formatSkillParamKey(key: string) {
  if (key.includes("ItemAddDrop")) return "Extra Items";
  if (key.includes("EnemyAddDrop")) return "Extra Catch Drops";
  if (key.includes("FailedAmountDown")) return "Minigame Gauge Loss Protection";
  if (key.includes("StartProgressAdd")) return "Minigame Gauge Start Bonus";
  if (key.includes("SuccessAmountUp")) return "Minigame Progress Rate";
  if (key.includes("SwimSpeed")) return "Swim Speed";
  if (key.includes("WorkSpeedUp_Farm")) return "Base Watering Speed";
  if (key.includes("WorkSpeedUp")) return "Base Work Speed";
  if (key.includes("KingSunfish_Thunder")) return "Talented Pal Fishing Rate";
  if (key.includes("KingSunfish")) return "Talented Pal Fishing Rate";
  if (key.includes("GiveElement_TrainerATK")) return "Mounted ATK Boost";
  if (key.includes("GiveAElectricity")) return "Mounted Electric ATK";
  return key.replaceAll("_", " ");
}
