import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Compass,
  ExternalLink,
  Flame,
  Globe,
  Hammer,
  HelpCircle,
  Lightbulb,
  MapPin,
  Pickaxe,
  ScrollText,
  ShieldAlert,
  Sliders,
  Sparkles,
  Swords,
  Users,
  Zap,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PALS, type Pal } from "@/data/palworld";
import { DUNGEON_FAMILIES } from "@/data/palworld/dungeons";
import { PAL_ELEMENTS } from "@/data/palworld/elements";
import type { EvidenceRecord } from "@/data/palworld/knowledge";
import type { FieldAlphaKnowledge } from "@/data/palworld/knowledgeFieldAlphas";
import type { MissionKnowledge } from "@/data/palworld/knowledgeMissions";
import type { StructureKnowledge } from "@/data/palworld/knowledgeStructures";
import type { TechnologyKnowledge } from "@/data/palworld/knowledgeTechnologies";
import type {
  WorkSuitabilityKey,
  WorkSuitabilityKnowledge,
} from "@/data/palworld/knowledgeWorkSuitability";
import { PAL_STATS } from "@/data/palworld/stats";
import { PAL_TOWER_BOSSES } from "@/data/palworld/towers";
import { useOfflineKnowledgePack } from "@/lib/use-offline-knowledge-pack";
import { WORK_OPTIONS, type WorkComparisonKey } from "@/lib/work-comparison";

const TITLE = "Palworld Progression Roadmap — Level 1 to 80";
const DESCRIPTION =
  "Sequential level-by-level guide for Palworld: technology unlocks, field alphas, dungeons, tower boss milestones, base work suitabilities, missions, and region level bands.";
const SITE = "https://good-vibe-desk.kevinjackson1114.workers.dev/progression";

export const Route = createFileRoute("/progression")({
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
  component: ProgressionRoadmapPage,
});

interface RegionLevelBand {
  id: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  description: string;
  isContested?: boolean;
  conflictDetails?: string;
}

const REGION_LEVEL_BANDS: readonly RegionLevelBand[] = [
  {
    id: "starter_islands",
    name: "Forgotten Island / Starter Islands",
    minLevel: 1,
    maxLevel: 10,
    description:
      "Opening coastal spawn zones (Forgotten Island, Ice Wind Island, Marsh Island, Sea Breeze Archipelago).",
  },
  {
    id: "windswept_hills",
    name: "Windswept Hills (Plateau of Beginnings)",
    minLevel: 1,
    maxLevel: 15,
    description:
      "Default player spawn location with entry tutorial tasks and initial Alpha bosses.",
  },
  {
    id: "bamboo_groves",
    name: "Bamboo Groves",
    minLevel: 10,
    maxLevel: 20,
    description: "Primary early mid-game forest and valley zone with varied resource nodes.",
  },
  {
    id: "twilight_dunes",
    name: "Twilight Dunes",
    minLevel: 10,
    maxLevel: 25,
    description:
      "Arid desert outpost territory housing high-value Pals and heat-resistant challenge zones.",
  },
  {
    id: "moonless_shore",
    name: "Crescent Moon Shore / Moonless Shore",
    minLevel: 15,
    maxLevel: 25,
    description: "Coastal region surrounding the Free Pal Alliance tower.",
    isContested: true,
    conflictDetails:
      "Contested region boundary: Pre-1.0 maps (Eurogamer/RPS) list Lv 15–25, while 1.0 guides (IGN/Nodecraft) list Lv 20–25 to align with Lily & Lyleen (Lv 20 Tower Boss).",
  },
  {
    id: "verdant_brook",
    name: "Verdant Brook & Frostbound Mountains",
    minLevel: 20,
    maxLevel: 30,
    description: "Dense forest rivers and mountain foothills leading toward central Palpagos.",
  },
  {
    id: "mount_obsidian",
    name: "Mount Obsidian (Volcano)",
    minLevel: 30,
    maxLevel: 40,
    description: "Volcanic environment requiring heat protection, rich in sulfur and fire Pals.",
  },
  {
    id: "desiccated_desert",
    name: "Desiccated Desert",
    minLevel: 40,
    maxLevel: 50,
    description: "Highland desert zone housing late-game Alphas and crude oil facilities.",
  },
  {
    id: "astral_mountains",
    name: "Astral Mountains (Snow)",
    minLevel: 50,
    maxLevel: 60,
    description: "Frigid mountain peak requiring cold protection and high-tier gear.",
  },
  {
    id: "sakurajima",
    name: "Sakurajima Island",
    minLevel: 50,
    maxLevel: 60,
    description: "Expansion island with Japanese-inspired fauna and Moonflower Tower (Saya Lv 55).",
  },
  {
    id: "feybreak",
    name: "Feybreak Island",
    minLevel: 60,
    maxLevel: 70,
    description:
      "Post-50 expansion region with high-difficulty dungeons and Feybreak Tower (Bjorn Lv 60).",
  },
  {
    id: "sunreach",
    name: "Sunreach Archipelago (Sky)",
    minLevel: 65,
    maxLevel: 75,
    description: "High-altitude endgame archipelago featuring Azure Covenant Tower (Auri Lv 68).",
  },
  {
    id: "world_tree",
    name: "World Tree Region",
    minLevel: 75,
    maxLevel: 80,
    description:
      "Final 1.0 endgame zone with max-level encounters and peak technology requirements.",
  },
];

const PRESET_LEVELS = [1, 10, 15, 23, 30, 40, 50, 60, 70, 80];

function ProgressionRoadmapPage() {
  const [selectedLevel, setSelectedLevel] = useState<number>(23);
  const [activeWorkType, setActiveWorkType] = useState<WorkComparisonKey>("kindling");

  // Load offline knowledge packs lazily
  const { records: techRecords, loading: techLoading } =
    useOfflineKnowledgePack<TechnologyKnowledge>("technologies");
  const { records: structRecords, loading: structLoading } =
    useOfflineKnowledgePack<StructureKnowledge>("structures");
  const { records: alphaRecords, loading: alphaLoading } =
    useOfflineKnowledgePack<FieldAlphaKnowledge>("field-alphas");
  const { records: workRecords, loading: workLoading } =
    useOfflineKnowledgePack<WorkSuitabilityKnowledge>("work-suitability");
  const { records: missionRecords, loading: missionLoading } =
    useOfflineKnowledgePack<MissionKnowledge>("missions");

  // Section 1: Technology Unlocks at Selected Level
  const currentUnlocks = useMemo(() => {
    return techRecords.filter((record) => record.data.level === selectedLevel);
  }, [selectedLevel, techRecords]);

  const currentLevelStructures = useMemo(() => {
    return structRecords.filter((record) => record.data.technologyUnlock.level === selectedLevel);
  }, [selectedLevel, structRecords]);

  const totalTpCost = useMemo(() => {
    return currentUnlocks.reduce((sum, record) => sum + (record.data.technologyPointCost || 0), 0);
  }, [currentUnlocks]);

  // Section 2: Field Alphas Level-5 through Level
  const nearFieldAlphas = useMemo(() => {
    const minLvl = Math.max(1, selectedLevel - 5);
    return alphaRecords
      .filter((rec) => rec.data.level >= minLvl && rec.data.level <= selectedLevel)
      .sort((a, b) => b.data.level - a.data.level);
  }, [alphaRecords, selectedLevel]);

  // Section 3: Towers & Dungeons
  const towerList = useMemo(() => {
    const list = Object.values(PAL_TOWER_BOSSES).flatMap((arr) => arr);
    return list.sort((a, b) => a.normalLevel - b.normalLevel);
  }, []);

  const nextTowerMilestone = useMemo(() => {
    return towerList.find((tower) => tower.normalLevel >= selectedLevel) ?? null;
  }, [selectedLevel, towerList]);

  const activeDungeonFamilies = useMemo(() => {
    // Unique dungeon families
    const map = new Map<
      string,
      { name: string; minLevel: number; maxLevel: number; dungeonLevel: number }
    >();
    for (const fam of DUNGEON_FAMILIES) {
      if (fam.name === "???") continue; // Exclude unpublished placeholders
      if (!map.has(fam.name)) {
        // Approximate min/max based on known dungeon levels
        let minL = fam.level;
        let maxL = fam.level + 3;
        if (fam.name.includes("Hillside") || fam.name.includes("Isolated")) {
          minL = 10;
          maxL = 13;
        } else if (fam.name.includes("Ravine")) {
          minL = 17;
          maxL = 19;
        } else if (fam.name.includes("Mountain Stream")) {
          minL = 27;
          maxL = 29;
        } else if (fam.name.includes("Volcanic")) {
          minL = 36;
          maxL = 38;
        } else if (fam.name.includes("Dunes")) {
          minL = 37;
          maxL = 40;
        } else if (fam.name.includes("Astral")) {
          minL = 42;
          maxL = 45;
        } else if (fam.name.includes("Cherry Blossom")) {
          minL = 47;
          maxL = 52;
        } else if (fam.name.includes("Feybreak")) {
          minL = 56;
          maxL = 58;
        } else if (fam.name.includes("Sunreach")) {
          minL = 65;
          maxL = 69;
        }
        map.set(fam.name, {
          name: fam.name,
          dungeonLevel: fam.level,
          minLevel: minL,
          maxLevel: maxL,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.minLevel - b.minLevel);
  }, []);

  // Section 4: Best Base Work Pals
  const bestWorkPals = useMemo(() => {
    const recordsMap = new Map(workRecords.map((r) => [r.data.internalName, r]));

    const ranked: { pal: Pal; suitabilityLevel: number; internalName: string }[] = [];

    for (const pal of PALS) {
      const rec = recordsMap.get(pal.internalName);
      let suitabilityLevel = 0;

      if (rec) {
        const lvl = rec.data.levels[0]?.[activeWorkType];
        if (typeof lvl === "number" && lvl > 0) {
          suitabilityLevel = lvl;
        }
      } else {
        // Fallback to PAL_STATS
        const displayWork = WORK_OPTIONS.find((opt) => opt.key === activeWorkType)?.label;
        const statWork = PAL_STATS[pal.internalName]?.work.find(
          (w) => w.work.toLowerCase() === displayWork?.toLowerCase(),
        );
        if (statWork && statWork.level > 0) {
          suitabilityLevel = statWork.level;
        }
      }

      if (suitabilityLevel > 0) {
        ranked.push({ pal, suitabilityLevel, internalName: pal.internalName });
      }
    }

    return ranked.sort((a, b) => {
      if (b.suitabilityLevel !== a.suitabilityLevel) {
        return b.suitabilityLevel - a.suitabilityLevel;
      }
      return a.pal.name.localeCompare(b.pal.name);
    });
  }, [activeWorkType, workRecords]);

  // Section 5: Missions Prerequisite Sequence
  const missionChains = useMemo(() => {
    // Map missions by sourceId/title for fast next lookup
    const map = new Map<string, EvidenceRecord<MissionKnowledge>>();
    for (const m of missionRecords) {
      if (m.data.title) map.set(m.data.title, m);
      map.set(m.data.sourceId, m);
    }

    const mainMissions = missionRecords.filter((m) => m.data.kind === "Main Mission");
    return mainMissions.slice(0, 15); // Show top sequential chain
  }, [missionRecords]);

  // Section 6: Region Level Bands
  const activeRegions = useMemo(() => {
    return REGION_LEVEL_BANDS.map((region) => {
      const isCurrent = selectedLevel >= region.minLevel && selectedLevel <= region.maxLevel;
      const isNear =
        Math.abs(selectedLevel - region.minLevel) <= 3 ||
        Math.abs(selectedLevel - region.maxLevel) <= 3;
      return { ...region, isCurrent, isNear };
    });
  }, [selectedLevel]);

  return (
    <div className="min-h-screen bg-background">
      {/* Background radial glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 opacity-60"
        style={{
          background:
            "radial-gradient(65% 100% at 50% 0%, color-mix(in oklch, #6366f1 22%, transparent) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation back link */}
        <Button asChild variant="ghost" size="sm" className="min-h-[44px] -ml-2">
          <Link to="/">
            <ArrowLeft className="size-4 mr-1.5" />
            Back to Pathfinder
          </Link>
        </Button>

        {/* Page Header */}
        <section className="rounded-2xl border border-indigo-500/25 bg-card/85 p-5 shadow-sm backdrop-blur sm:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl space-y-2">
              <Badge
                variant="outline"
                className="border-indigo-400/40 bg-indigo-400/10 text-indigo-700 dark:text-indigo-300"
              >
                <Compass className="size-3.5 mr-1.5" />
                Beginner Progression Guide · Palworld
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Progression Roadmap</h1>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                Sequential, level-keyed guide answering:{" "}
                <strong className="text-foreground font-semibold">
                  "I am Level {selectedLevel}. What should I be doing?"
                </strong>
              </p>
            </div>

            {/* Quick stats banner */}
            <div className="grid grid-cols-2 gap-2 text-center sm:min-w-64">
              <Metric label="Selected Level" value={`Lv. ${selectedLevel}`} />
              <Metric
                label="Next Milestone"
                value={
                  nextTowerMilestone
                    ? `${nextTowerMilestone.leader} (Lv.${nextTowerMilestone.normalLevel})`
                    : "Max Level"
                }
              />
            </div>
          </div>

          {/* Level Selector Interface */}
          <div className="mt-6 border-t pt-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label
                htmlFor="level-slider"
                className="flex items-center gap-2 text-sm font-bold text-foreground"
              >
                <Sliders className="size-4 text-indigo-500" />
                Select Your Player Level (1 to 80):
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] min-w-[44px] text-base font-bold"
                  onClick={() => setSelectedLevel((l) => Math.max(1, l - 1))}
                  disabled={selectedLevel <= 1}
                  aria-label="Decrease level"
                >
                  -
                </Button>
                <input
                  id="level-number-input"
                  type="number"
                  min={1}
                  max={80}
                  value={selectedLevel}
                  onChange={(e) => {
                    const val = Number.parseInt(e.target.value, 10);
                    if (!Number.isNaN(val)) {
                      setSelectedLevel(Math.max(1, Math.min(80, val)));
                    }
                  }}
                  className="h-11 w-20 rounded-lg border border-input bg-background text-center text-lg font-bold outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Level input"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] min-w-[44px] text-base font-bold"
                  onClick={() => setSelectedLevel((l) => Math.min(80, l + 1))}
                  disabled={selectedLevel >= 80}
                  aria-label="Increase level"
                >
                  +
                </Button>
              </div>
            </div>

            {/* Slider */}
            <input
              id="level-slider"
              type="range"
              min={1}
              max={80}
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(Number.parseInt(e.target.value, 10))}
              className="h-2 w-full cursor-pointer accent-indigo-500"
              aria-label="Level slider"
            />

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs font-semibold text-muted-foreground mr-1">Quick Jump:</span>
              {PRESET_LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevel(lvl)}
                  className={`min-h-[44px] min-w-[44px] rounded-lg border px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selectedLevel === lvl
                      ? "border-indigo-500 bg-indigo-500 text-white shadow"
                      : "border-input bg-card text-foreground hover:bg-accent"
                  }`}
                >
                  Lv. {lvl}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Informational Collapsible */}
        <Collapsible className="rounded-xl border bg-card/60 p-4">
          <CollapsibleTrigger className="flex min-h-[44px] w-full items-center justify-between font-semibold text-sm text-muted-foreground hover:text-foreground">
            <span>What this roadmap provides (Source & Fact Policy)</span>
            <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 text-xs leading-relaxed text-muted-foreground space-y-2">
            <p>
              1. <strong>Datamined Unlocks & Suitability:</strong> Unlocks, Technology Points, Work
              Suitabilities, and Field Alphas are exact datamined facts.
            </p>
            <p>
              2. <strong>No Combat Rankings:</strong> Combat performance formula is unobtainable
              (recorded in modelGaps.ts). Work suitabilities are game-file facts and ranked plainly.
            </p>
            <p>
              3. <strong>Community Tier Region Level Bands:</strong> Map level bands are sourced
              from audited community guides (Eurogamer, RPS, IGN, Bamboo Gaming, Nodecraft).
            </p>
          </CollapsibleContent>
        </Collapsible>

        {/* SECTION 1: WHAT UNLOCKS NOW */}
        <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="size-5 text-indigo-500" />
              <h2 className="text-xl font-bold tracking-tight">
                1. What Unlocks at Level {selectedLevel}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Badge variant="secondary">{currentUnlocks.length} Technologies</Badge>
              <Badge
                variant="outline"
                className="border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
              >
                {totalTpCost} Tech Points Total
              </Badge>
            </div>
          </div>

          {techLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Loading technology unlocks...
            </div>
          ) : currentUnlocks.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No new technology unlocks at Level {selectedLevel}. Try browsing adjacent levels!
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {currentUnlocks.map((rec) => {
                const u = rec.data;
                const linkedStructs = currentLevelStructures.filter(
                  (s) =>
                    s.data.name.toLowerCase() === u.name.toLowerCase() ||
                    s.data.sourceKey.toLowerCase() === u.sourceKey.toLowerCase(),
                );

                return (
                  <article
                    key={rec.id}
                    className="flex flex-col justify-between rounded-xl border border-border/80 bg-background p-4 shadow-sm hover:border-indigo-400/40 transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                          {u.category}
                        </span>
                        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                          {u.technologyPointCost} TP
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-bold">{u.name}</h3>
                      {u.describedEffect && (
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          {u.describedEffect}
                        </p>
                      )}
                    </div>

                    {linkedStructs.length > 0 && (
                      <div className="mt-3 border-t pt-2 space-y-1">
                        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                          <Building2 className="size-3 text-sky-500" /> Enables Structure:
                        </span>
                        {linkedStructs.map((st) => (
                          <div
                            key={st.id}
                            className="rounded bg-muted/60 p-2 text-xs font-medium space-y-1"
                          >
                            <div className="font-semibold text-foreground">{st.data.name}</div>
                            {st.data.materials.length > 0 && (
                              <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                                {st.data.materials.map((m, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-background px-1.5 py-0.5 rounded border"
                                  >
                                    {m.materialName}: {m.quantity}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 2: FIELD ALPHAS AT OR NEAR LEVEL */}
        <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-amber-500" />
              <h2 className="text-xl font-bold tracking-tight">
                2. Field Alphas (Levels {Math.max(1, selectedLevel - 5)} – {selectedLevel})
              </h2>
            </div>
            <Badge
              variant="outline"
              className="border-amber-500/30 text-amber-700 dark:text-amber-300"
            >
              {nearFieldAlphas.length} Available Bosses
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground">
            Overworld Alpha Pal encounters in your level range (Level{" "}
            {Math.max(1, selectedLevel - 5)} to {selectedLevel}):
          </p>

          {alphaLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Loading Field Alpha bosses...
            </div>
          ) : nearFieldAlphas.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No fixed Field Alphas found in the range Lv. {Math.max(1, selectedLevel - 5)} –{" "}
              {selectedLevel}. Check adjacent levels!
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {nearFieldAlphas.map((rec) => {
                const a = rec.data;
                const elems = PAL_ELEMENTS[a.palName] ?? [];

                return (
                  <article
                    key={rec.id}
                    className="rounded-xl border border-border/80 bg-background p-4 shadow-sm hover:border-amber-400/40 transition space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                          Field Boss Alpha
                        </span>
                        <h3 className="text-base font-bold">{a.palName}</h3>
                      </div>
                      <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30 font-bold">
                        Lv. {a.level}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-muted-foreground">Element:</span>
                      {elems.length > 0 ? (
                        elems.map((el) => (
                          <Badge key={el} variant="secondary" className="text-[11px]">
                            {el}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">Normal</span>
                      )}
                    </div>

                    <div className="border-t pt-2 text-xs text-muted-foreground space-y-1">
                      <div>
                        <strong className="text-foreground">Location:</strong>{" "}
                        {a.sourceHref ? a.sourceHref.replaceAll("_", " ") : "Overworld Spawn"}
                      </div>
                      <div className="font-mono text-[11px]">
                        Pos: X {Math.round(a.rawPosition.x)} · Y {Math.round(a.rawPosition.y)}
                      </div>
                      {a.onlyTime && (
                        <div className="text-indigo-600 dark:text-indigo-400 font-medium">
                          Spawn Time: {a.onlyTime} Only
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 3: DUNGEONS AND TOWERS */}
        <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b pb-3">
            <Swords className="size-5 text-purple-500" />
            <h2 className="text-xl font-bold tracking-tight">
              3. Dungeons & Tower Boss Milestones
            </h2>
          </div>

          {/* Tower Boss Next Milestone Callout */}
          {nextTowerMilestone ? (
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                  <Award className="size-4" /> Next Tower Boss Milestone
                </span>
                <Badge className="bg-purple-600 text-white font-bold">
                  Target Lv. {nextTowerMilestone.normalLevel}
                </Badge>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {nextTowerMilestone.leader} & {nextTowerMilestone.pal}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {nextTowerMilestone.tower} ({nextTowerMilestone.region} · Coords:{" "}
                    {nextTowerMilestone.coordinates})
                  </p>
                </div>
                {selectedLevel >= nextTowerMilestone.normalLevel ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold"
                  >
                    <CheckCircle2 className="size-3.5 mr-1" /> Level Ready!
                  </Badge>
                ) : (
                  <div className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                    {nextTowerMilestone.normalLevel - selectedLevel} levels away
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-muted p-4 text-xs text-muted-foreground">
              You have reached or exceeded the highest Tower Boss level in current 1.0 content!
            </div>
          )}

          {/* Tower Bosses Overview Grid */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-foreground">All Tower Bosses Order</h3>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
              {towerList.map((t) => {
                const isCurrentMilestone = nextTowerMilestone?.tower === t.tower;
                const isPassed = selectedLevel >= t.normalLevel;

                return (
                  <div
                    key={t.tower}
                    className={`rounded-lg border p-3 text-xs space-y-1 ${
                      isCurrentMilestone
                        ? "border-purple-500 bg-purple-500/15 shadow-sm"
                        : isPassed
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-border/70 bg-background"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>{t.leader}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono ${
                          isPassed
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        Lv. {t.normalLevel}
                      </span>
                    </div>
                    <div className="text-muted-foreground font-medium">{t.pal}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{t.region}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dungeons Section */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-bold text-foreground">
              Dungeon Families Relevant to Level {selectedLevel}
            </h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {activeDungeonFamilies.map((d) => {
                const isAppropriate =
                  selectedLevel >= d.minLevel - 3 && selectedLevel <= d.maxLevel + 5;

                return (
                  <div
                    key={d.name}
                    className={`rounded-xl border p-3.5 text-xs transition space-y-1.5 ${
                      isAppropriate
                        ? "border-indigo-500/40 bg-indigo-500/5 shadow-sm"
                        : "border-border/70 bg-background opacity-80"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-sm">{d.name}</span>
                      <Badge
                        variant={isAppropriate ? "default" : "outline"}
                        className="text-[11px]"
                      >
                        Lv. {d.minLevel}–{d.maxLevel}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      Recommended Entry Level: <strong>Lv. {d.dungeonLevel}</strong>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 4: BEST PALS FOR BASE WORK */}
        <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div className="flex items-center gap-2">
              <Pickaxe className="size-5 text-emerald-500" />
              <h2 className="text-xl font-bold tracking-tight">4. Best Pals for Base Work</h2>
            </div>
            <Badge
              variant="outline"
              className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
            >
              Game-File Fact Ranks
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground">
            Ranked plainly by base work suitability level from game files (`pals.ts` and
            `knowledgeWorkSuitability.ts`). No combat claims or unverified formulas.
          </p>

          {/* Work Type Filter Chips */}
          <div className="flex flex-wrap gap-1.5" aria-label="Select work suitability type">
            {WORK_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setActiveWorkType(opt.key)}
                className={`min-h-[44px] rounded-lg border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  activeWorkType === opt.key
                    ? "border-emerald-500 bg-emerald-500 text-white shadow"
                    : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Ranked List for Active Work Type */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground border-b pb-2">
              <span>Pal Name</span>
              <span>Base Suitability Level</span>
            </div>

            {workLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading work suitability ranks...
              </div>
            ) : bestWorkPals.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No Pals found with this work suitability.
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {bestWorkPals.slice(0, 18).map(({ pal, suitabilityLevel }) => (
                  <div
                    key={pal.id}
                    className="flex items-center justify-between rounded-lg border border-border/80 bg-background p-3 text-xs"
                  >
                    <div className="font-bold text-foreground">
                      #{pal.palDexNo} {pal.name}
                    </div>
                    <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30 font-bold">
                      Lv. {suitabilityLevel}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* SECTION 5: MISSIONS & TUTORIAL SEQUENCES */}
        <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div className="flex items-center gap-2">
              <ScrollText className="size-5 text-sky-500" />
              <h2 className="text-xl font-bold tracking-tight">
                5. Missions & Base Tutorial Order
              </h2>
            </div>
            <Badge variant="outline" className="border-sky-500/30 text-sky-700 dark:text-sky-300">
              Sequence-Gated (Prerequisite Links)
            </Badge>
          </div>

          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-xs leading-relaxed text-sky-900 dark:text-sky-100 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-sm">
              <HelpCircle className="size-4 text-sky-500" /> Mission Mechanic Fact
            </div>
            <p>
              Audited across 5 major database sources:{" "}
              <strong className="font-semibold">
                0 of 117 missions have numeric player level requirements
              </strong>
              . Missions follow prerequisite chains (`Next` links) and base upgrade milestones
              rather than character level checks.
            </p>
          </div>

          {missionLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Loading mission sequence...
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {missionChains.map((record) => {
                const m = record.data;
                return (
                  <article
                    key={record.id}
                    className="rounded-xl border border-border/80 bg-background p-4 shadow-sm space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-sky-600 dark:text-sky-400">{m.kind}</span>
                      {m.next && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-semibold">
                          Next <ChevronRight className="size-3" /> {m.next}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-foreground">{m.title || m.sourceId}</h3>
                    <p className="text-muted-foreground">{m.objective}</p>
                    {m.reward && (
                      <div className="pt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        Reward: {m.reward}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 6: WHERE TO GO (REGION LEVEL BANDS) */}
        <section className="rounded-2xl border border-amber-500/30 bg-card p-5 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div className="flex items-center gap-2">
              <Globe className="size-5 text-amber-500" />
              <h2 className="text-xl font-bold tracking-tight">
                6. Where to Go — Region Level Bands
              </h2>
            </div>
            <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40 font-bold">
              Community Tier (Tier 4)
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground">
            Region level bands compiled from Eurogamer, RPS, IGN, Bamboo Gaming, and Nodecraft.
            Displayed distinctly from datamined facts.
          </p>

          {/* Region Level Cards */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {activeRegions.map((region) => (
              <article
                key={region.id}
                className={`rounded-xl border p-4 shadow-sm transition space-y-2 text-xs ${
                  region.isCurrent
                    ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30 shadow-md"
                    : region.isNear
                      ? "border-amber-400/40 bg-card"
                      : "border-border/70 bg-background/60 opacity-80"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-foreground">{region.name}</h3>
                  <Badge
                    className={`${
                      region.isCurrent
                        ? "bg-amber-500 text-white font-bold"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    Lv. {region.minLevel}–{region.maxLevel}
                  </Badge>
                </div>

                <p className="text-muted-foreground leading-relaxed">{region.description}</p>

                {region.isContested && region.conflictDetails && (
                  <div className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/15 p-2.5 text-[11px] text-amber-900 dark:text-amber-100 space-y-1">
                    <div className="flex items-center gap-1 font-bold">
                      <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      Data Conflict Surfaced
                    </div>
                    <p className="leading-normal">{region.conflictDetails}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/75 px-3 py-2.5">
      <div className="text-base font-bold leading-none text-foreground">{value}</div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
