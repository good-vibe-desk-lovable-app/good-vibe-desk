import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronDown,
  Dna,
  Filter,
  Flame,
  Info,
  Layers,
  Search,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type {
  ActiveSkillCatalogueItem,
  ActiveSkillInheritanceRule,
  GuaranteedPassiveRelation,
  PalActiveLearnsetRow,
  PalworldSkillsKnowledge,
  PassiveSkillCatalogueItem,
  PassiveSkillInheritanceRule,
  SpeciesPartnerSkill,
} from "@/data/palworld/knowledgeSkills";
import { useOfflineKnowledgePack } from "@/lib/use-offline-knowledge-pack";

const TITLE = "Skills & Passives Compendium — Active, Passive, Learnsets & Inheritance";
const DESCRIPTION =
  "Browse Palworld active skills, passive skills, Pal level learnsets, partner skills, guaranteed passives, and inheritance rules.";
const SITE = "https://good-vibe-desk.kevinjackson1114.workers.dev/compendium/skills";

type SectionFilter = "all" | "active" | "passive" | "learnsets" | "inheritance";

export const Route = createFileRoute("/compendium/skills")({
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
  component: SkillsCompendiumPage,
});

function SkillsCompendiumPage() {
  const [query, setQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>("all");
  const [selectedElement, setSelectedElement] = useState<string>("all");
  const [selectedRank, setSelectedRank] = useState<string>("all");
  const [inheritableFilter, setInheritableFilter] = useState<string>("all");

  const { records, error, loading } = useOfflineKnowledgePack<PalworldSkillsKnowledge>("skills");
  const knowledge = records[0]?.data;

  // Build lookup maps for cross-referencing active skill inheritance
  const activeInheritanceMap = useMemo(() => {
    if (!knowledge) return new Map<string, ActiveSkillInheritanceRule>();
    const map = new Map<string, ActiveSkillInheritanceRule>();
    for (const rule of knowledge.inheritanceRules.activeSkillInheritance) {
      map.set(rule.internalName, rule);
    }
    return map;
  }, [knowledge]);

  const filteredData = useMemo(() => {
    if (!knowledge) return null;
    const q = query.trim().toLocaleLowerCase();

    // 1. Active Skill Catalogue
    const activeList = knowledge.activeSkillCatalogue.filter((item) => {
      if (selectedElement !== "all" && item.element !== selectedElement) return false;

      const rule = activeInheritanceMap.get(item.internalId);
      if (inheritableFilter === "inheritable" && (!rule || !rule.canInherit)) return false;
      if (inheritableFilter === "skill-fruit" && (!rule || !rule.hasSkillFruit)) return false;
      if (inheritableFilter === "non-inheritable" && rule && rule.canInherit) return false;

      if (!q) return true;
      return (
        item.name.toLocaleLowerCase().includes(q) ||
        item.internalId.toLocaleLowerCase().includes(q) ||
        (item.element && item.element.toLocaleLowerCase().includes(q)) ||
        item.category.toLocaleLowerCase().includes(q)
      );
    });

    // 2. Passive Skill Catalogue
    const passiveList = knowledge.passiveSkillCatalogue.filter((item) => {
      if (selectedRank !== "all") {
        if (selectedRank === "null" && item.rank !== null) return false;
        if (selectedRank !== "null" && String(item.rank) !== selectedRank) return false;
      }

      if (!q) return true;
      return (
        item.name.toLocaleLowerCase().includes(q) ||
        item.description.toLocaleLowerCase().includes(q) ||
        item.category.toLocaleLowerCase().includes(q)
      );
    });

    // 3. Pal Learnsets
    const learnsetsList = knowledge.palActiveLearnsets.filter((row) => {
      if (selectedElement !== "all" && row.element !== selectedElement) return false;

      if (!q) return true;
      return (
        row.palInternalName.toLocaleLowerCase().includes(q) ||
        row.name.toLocaleLowerCase().includes(q) ||
        (row.element && row.element.toLocaleLowerCase().includes(q))
      );
    });

    // 4. Partner Skills & Inheritance
    const partnerList = knowledge.speciesPartnerSkills.filter((partner) => {
      if (!q) return true;
      return (
        partner.palInternalName.toLocaleLowerCase().includes(q) ||
        partner.name.toLocaleLowerCase().includes(q) ||
        partner.description.toLocaleLowerCase().includes(q)
      );
    });

    const guaranteedList = knowledge.inheritanceRules.guaranteedPassives.filter((g) => {
      if (!q) return true;
      return (
        g.palInternalName.toLocaleLowerCase().includes(q) ||
        g.passiveInternalId.toLocaleLowerCase().includes(q)
      );
    });

    const activeInhList = knowledge.inheritanceRules.activeSkillInheritance.filter((rule) => {
      if (inheritableFilter === "inheritable" && !rule.canInherit) return false;
      if (inheritableFilter === "skill-fruit" && !rule.hasSkillFruit) return false;
      if (inheritableFilter === "non-inheritable" && rule.canInherit) return false;

      if (!q) return true;
      return (
        rule.name.toLocaleLowerCase().includes(q) ||
        rule.internalName.toLocaleLowerCase().includes(q)
      );
    });

    const passiveInhList = knowledge.inheritanceRules.passiveSkillInheritance.filter((rule) => {
      if (!q) return true;
      return (
        rule.name.toLocaleLowerCase().includes(q) ||
        rule.internalName.toLocaleLowerCase().includes(q)
      );
    });

    return {
      active: activeList,
      passive: passiveList,
      learnsets: learnsetsList,
      partner: partnerList,
      guaranteed: guaranteedList,
      activeInheritance: activeInhList,
      passiveInheritance: passiveInhList,
    };
  }, [knowledge, query, selectedElement, selectedRank, inheritableFilter, activeInheritanceMap]);

  if (loading || error || !knowledge || !filteredData) {
    return <PackFeedback loading={loading} error={error} />;
  }

  const activeCount = knowledge.activeSkillCatalogue.length;
  const passiveCount = knowledge.passiveSkillCatalogue.length;
  const learnsetCount = knowledge.palActiveLearnsets.length;
  const partnerCount = knowledge.speciesPartnerSkills.length;

  const showActive = sectionFilter === "all" || sectionFilter === "active";
  const showPassive = sectionFilter === "all" || sectionFilter === "passive";
  const showLearnsets = sectionFilter === "all" || sectionFilter === "learnsets";
  const showInheritance = sectionFilter === "all" || sectionFilter === "inheritance";

  const totalFilteredCount =
    (showActive ? filteredData.active.length : 0) +
    (showPassive ? filteredData.passive.length : 0) +
    (showLearnsets ? filteredData.learnsets.length : 0) +
    (showInheritance
      ? filteredData.partner.length +
        filteredData.guaranteed.length +
        filteredData.activeInheritance.length +
        filteredData.passiveInheritance.length
      : 0);

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

        <section className="rounded-2xl border border-purple-400/25 bg-card/80 p-5 shadow-sm backdrop-blur sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <Eyebrow icon={<Sparkles className="size-3.5" />}>
                Offline compendium · Skills & Passives
              </Eyebrow>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Skills & Passives Directory
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                Browse Palworld active skill moves, passive skills, Pal level learnsets, species
                partner skills, and verified inheritance rules.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:min-w-72 sm:grid-cols-4">
              <Metric label="Active Moves" value={String(activeCount)} />
              <Metric label="Passive Skills" value={String(passiveCount)} />
              <Metric label="Pal Learnsets" value={String(learnsetCount)} />
              <Metric label="Partner Skills" value={String(partnerCount)} />
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
              Provides verified records for 395 active skills, 412 passive skills, 2,388 Pal active
              learnset rows, 299 partner skills, 53 guaranteed passives, 320 active inheritance
              rules, and 85 passive inheritance rules.
            </p>
            <p>
              <strong>Catalogue vs Roster Distinction:</strong> The 395 active catalogue rows
              include NPC, boss, and unused code entries, while the Pal roster uses 307 distinct
              natural learnset names. Similarly, the 412 passive catalogue rows contain internal and
              special entries alongside 115 player-obtainable passives.
            </p>
            <p>
              <strong>Availability vs Inheritability:</strong> Natural learnsets and natural rolling
              pools determine what a Pal naturally possesses, whereas breeding rules and Skill
              Fruits govern what can be inherited or taught.
            </p>
            <p>
              <strong>Natural Passive Pool Gap:</strong> The natural passive pool per species is an
              explicit gap (reason: <code>no-source</code>) because wild passive rolling weights are
              unpublished in public game exports.
            </p>
          </CollapsibleContent>
        </Collapsible>

        <section
          className="mt-7 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
          aria-label="Browse skills and passives data"
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <label className="block flex-1">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Search skills & passives guide
                </span>
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Skill name, Pal, element, description, or internal ID"
                    className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                </span>
              </label>

              <div className="flex flex-wrap gap-2" aria-label="Section filters">
                <FilterButton
                  active={sectionFilter === "all"}
                  onClick={() => setSectionFilter("all")}
                >
                  All
                </FilterButton>
                <FilterButton
                  active={sectionFilter === "active"}
                  onClick={() => setSectionFilter("active")}
                >
                  <Swords className="size-3.5" />
                  Active ({filteredData.active.length})
                </FilterButton>
                <FilterButton
                  active={sectionFilter === "passive"}
                  onClick={() => setSectionFilter("passive")}
                >
                  <Sparkles className="size-3.5" />
                  Passives ({filteredData.passive.length})
                </FilterButton>
                <FilterButton
                  active={sectionFilter === "learnsets"}
                  onClick={() => setSectionFilter("learnsets")}
                >
                  <Layers className="size-3.5" />
                  Learnsets ({filteredData.learnsets.length})
                </FilterButton>
                <FilterButton
                  active={sectionFilter === "inheritance"}
                  onClick={() => setSectionFilter("inheritance")}
                >
                  <Dna className="size-3.5" />
                  Partner & Rules (
                  {filteredData.partner.length +
                    filteredData.guaranteed.length +
                    filteredData.activeInheritance.length +
                    filteredData.passiveInheritance.length}
                  )
                </FilterButton>
              </div>
            </div>

            {/* Additional Filter Selectors */}
            <div className="flex flex-wrap items-center gap-3 border-t pt-3 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <Filter className="size-3.5" />
                <span>Filters:</span>
              </div>

              <label className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Element:</span>
                <select
                  value={selectedElement}
                  onChange={(e) => setSelectedElement(e.target.value)}
                  className="min-h-[44px] sm:min-h-0 h-8 rounded border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="all">All Elements</option>
                  <option value="Dark">Dark</option>
                  <option value="Dragon">Dragon</option>
                  <option value="Electric">Electric</option>
                  <option value="Fire">Fire</option>
                  <option value="Grass">Grass</option>
                  <option value="Ground">Ground</option>
                  <option value="Ice">Ice</option>
                  <option value="Neutral">Neutral</option>
                  <option value="Water">Water</option>
                </select>
              </label>

              <label className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Passive Rank:</span>
                <select
                  value={selectedRank}
                  onChange={(e) => setSelectedRank(e.target.value)}
                  className="min-h-[44px] sm:min-h-0 h-8 rounded border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="all">All Ranks</option>
                  <option value="5">Rank 5 (Special/World Tree)</option>
                  <option value="4">Rank 4 (Legendary/Special)</option>
                  <option value="3">Rank 3 (Tier 3)</option>
                  <option value="2">Rank 2 (Tier 2)</option>
                  <option value="1">Rank 1 (Tier 1)</option>
                  <option value="null">Unranked / Special</option>
                </select>
              </label>

              <label className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Inheritability:</span>
                <select
                  value={inheritableFilter}
                  onChange={(e) => setInheritableFilter(e.target.value)}
                  className="min-h-[44px] sm:min-h-0 h-8 rounded border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="all">All Skills</option>
                  <option value="inheritable">Inheritable via Breeding</option>
                  <option value="skill-fruit">Teachable via Skill Fruit</option>
                  <option value="non-inheritable">Exclusive / Non-inheritable</option>
                </select>
              </label>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{totalFilteredCount}</strong> matching
              entries
            </span>
            <span>Source: PalDB & PalCalc DB (v1.0.3 / vv27)</span>
          </div>

          {totalFilteredCount === 0 ? (
            <EmptyState text="No skills, passives, learnsets, or rules match your search or filters. Try adjusting your search query." />
          ) : (
            <div className="mt-6 space-y-10">
              {/* RELATION 1: Active Skill Catalogue */}
              {showActive && filteredData.active.length > 0 && (
                <div>
                  <SectionHeader
                    icon={<Swords className="size-4 text-purple-600 dark:text-purple-400" />}
                    title="1. Active Skill Catalogue"
                    count={filteredData.active.length}
                  />

                  <CatalogueDistinctionCallout
                    title="Active Catalogue vs. Pal Roster"
                    catalogueCount={395}
                    rosterCount={307}
                    type="active"
                  />

                  <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {filteredData.active.map((skill, idx) => (
                      <ActiveSkillCard
                        key={`${skill.internalId}-${idx}`}
                        skill={skill}
                        inheritanceRule={activeInheritanceMap.get(skill.internalId)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* RELATION 2: Passive Skill Catalogue */}
              {showPassive && filteredData.passive.length > 0 && (
                <div>
                  <SectionHeader
                    icon={<Sparkles className="size-4 text-purple-600 dark:text-purple-400" />}
                    title="2. Passive Skill Catalogue"
                    count={filteredData.passive.length}
                  />

                  <CatalogueDistinctionCallout
                    title="Passive Catalogue vs. Obtainable Passives"
                    catalogueCount={412}
                    rosterCount={115}
                    type="passive"
                  />

                  <NaturalPassiveGapCallout />

                  <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {filteredData.passive.map((passive, idx) => (
                      <PassiveSkillCard key={`${passive.name}-${idx}`} passive={passive} />
                    ))}
                  </div>
                </div>
              )}

              {/* RELATION 3: Pal Active Learnsets */}
              {showLearnsets && filteredData.learnsets.length > 0 && (
                <div>
                  <SectionHeader
                    icon={<Layers className="size-4 text-purple-600 dark:text-purple-400" />}
                    title="3. Pal Active Learnsets"
                    count={filteredData.learnsets.length}
                  />

                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Shows which active move each Pal species learns naturally as it levels up
                    in-game.
                  </p>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {filteredData.learnsets.slice(0, 150).map((row, idx) => (
                      <PalLearnsetCard
                        key={`${row.palInternalName}-${row.name}-${idx}`}
                        row={row}
                      />
                    ))}
                  </div>
                  {filteredData.learnsets.length > 150 && (
                    <p className="mt-3 text-center text-xs text-muted-foreground italic">
                      Showing first 150 learnset matches. Use search or element filters to narrow
                      results.
                    </p>
                  )}
                </div>
              )}

              {/* RELATION 4: Species Partner Skills and Inheritance Rules */}
              {showInheritance && (
                <div>
                  <SectionHeader
                    icon={<Dna className="size-4 text-purple-600 dark:text-purple-400" />}
                    title="4. Species Partner Skills & Inheritance Rules"
                    count={
                      filteredData.partner.length +
                      filteredData.guaranteed.length +
                      filteredData.activeInheritance.length +
                      filteredData.passiveInheritance.length
                    }
                  />

                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Covers Pal-unique partner skills, guaranteed species passives upon
                    hatching/capture, breeding inheritance rules, and RNG weights.
                  </p>

                  <div className="mt-4 space-y-6">
                    {/* Breeding Mechanic Weights */}
                    <BreedingMechanicWeightsCard
                      weights={knowledge.inheritanceRules.breedingMechanicWeights}
                    />

                    {/* Species Partner Skills */}
                    {filteredData.partner.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold tracking-tight text-foreground mb-3">
                          Species Partner Skills ({filteredData.partner.length})
                        </h3>
                        <div className="grid gap-3 md:grid-cols-2">
                          {filteredData.partner.map((partner, idx) => (
                            <PartnerSkillCard
                              key={`${partner.palInternalName}-${idx}`}
                              partner={partner}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Guaranteed Passives */}
                    {filteredData.guaranteed.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold tracking-tight text-foreground mb-3">
                          Guaranteed Species Passives ({filteredData.guaranteed.length})
                        </h3>
                        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                          {filteredData.guaranteed.map((g, idx) => (
                            <GuaranteedPassiveCard
                              key={`${g.palInternalName}-${idx}`}
                              guaranteed={g}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Active Skill Inheritance Rules */}
                    {filteredData.activeInheritance.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold tracking-tight text-foreground mb-3">
                          Active Move Inheritance Rules ({filteredData.activeInheritance.length})
                        </h3>
                        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                          {filteredData.activeInheritance.slice(0, 100).map((rule, idx) => (
                            <ActiveInheritanceCard
                              key={`${rule.internalName}-${idx}`}
                              rule={rule}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Passive Skill Inheritance Rules */}
                    {filteredData.passiveInheritance.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold tracking-tight text-foreground mb-3">
                          Passive Skill Inheritance Rules ({filteredData.passiveInheritance.length})
                        </h3>
                        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                          {filteredData.passiveInheritance.map((rule, idx) => (
                            <PassiveInheritanceCard
                              key={`${rule.internalName}-${idx}`}
                              rule={rule}
                            />
                          ))}
                        </div>
                      </div>
                    )}
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
      <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
        {count}
      </span>
    </div>
  );
}

function CatalogueDistinctionCallout({
  title,
  catalogueCount,
  rosterCount,
  type,
}: {
  title: string;
  catalogueCount: number;
  rosterCount: number;
  type: "active" | "passive";
}) {
  return (
    <div className="mt-3 rounded-xl border border-purple-500/20 bg-purple-500/5 p-3.5 text-xs leading-relaxed text-muted-foreground">
      <div className="flex items-center gap-1.5 font-bold text-foreground">
        <Info className="size-4 text-purple-600 dark:text-purple-400 shrink-0" />
        <span>{title}</span>
      </div>
      <p className="mt-1">
        {type === "active" ? (
          <>
            The <strong>{catalogueCount} active catalogue rows</strong> contain every move defined
            in game code (including NPC, tower boss exclusive, and unreleased assets). In contrast,
            the natural Pal roster learnsets use{" "}
            <strong>{rosterCount} distinct active move names</strong>.
          </>
        ) : (
          <>
            The <strong>{catalogueCount} passive catalogue rows</strong> hold all internal passive
            definitions (including boss traits and NPC skills). Only{" "}
            <strong>{rosterCount} passives are player-obtainable</strong> via wild capture,
            breeding, or rainbow passive rolls.
          </>
        )}
      </p>
    </div>
  );
}

function NaturalPassiveGapCallout() {
  return (
    <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
      <div className="flex items-center gap-1.5 font-bold">
        <Zap className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>Natural Passive Pool — Recorded Gap (no-source)</span>
      </div>
      <p className="mt-1">
        Which passives a wild Pal species can naturally roll upon spawn or hatching is genuinely
        unpublished in public game exports or PalDB. This natural rolling pool is retained as an
        explicit gap.
      </p>
    </div>
  );
}

function ActiveSkillCard({
  skill,
  inheritanceRule,
}: {
  skill: ActiveSkillCatalogueItem;
  inheritanceRule?: ActiveSkillInheritanceRule;
}) {
  return (
    <article className="rounded-xl border border-border/80 bg-background p-4 shadow-sm transition hover:border-purple-400/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold leading-tight">{skill.name}</h3>
          <span className="text-[11px] font-mono text-muted-foreground">{skill.internalId}</span>
        </div>
        {skill.element && <ElementBadge element={skill.element} />}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-2.5 text-xs">
        <div>
          <span className="text-muted-foreground">Power:</span>{" "}
          <strong className="text-foreground">
            {skill.power !== null && skill.power > 0 ? skill.power : "Status"}
          </strong>
        </div>
        <div>
          <span className="text-muted-foreground">Cooldown:</span>{" "}
          <strong className="text-foreground">
            {skill.cooldown !== null ? `${skill.cooldown}s` : "—"}
          </strong>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-2 text-[11px]">
        {inheritanceRule ? (
          <>
            <span
              className={`rounded px-1.5 py-0.5 font-medium ${
                inheritanceRule.canInherit
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {inheritanceRule.canInherit ? "Inheritable" : "Non-inheritable"}
            </span>
            {inheritanceRule.hasSkillFruit && (
              <span className="rounded bg-sky-500/10 px-1.5 py-0.5 font-medium text-sky-700 dark:text-sky-300">
                Skill Fruit
              </span>
            )}
          </>
        ) : (
          <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
            {skill.category}
          </span>
        )}
      </div>
    </article>
  );
}

function PassiveSkillCard({ passive }: { passive: PassiveSkillCatalogueItem }) {
  const isNegative =
    passive.description.includes("-") ||
    passive.name.includes("Coward") ||
    passive.name.includes("Clumsy") ||
    passive.name.includes("Slacker") ||
    passive.name.includes("Glutton");

  return (
    <article className="rounded-xl border border-border/80 bg-background p-4 shadow-sm transition hover:border-purple-400/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold leading-tight">{passive.name}</h3>
          <span className="text-[11px] text-muted-foreground">{passive.category}</span>
        </div>
        {passive.rank !== null ? (
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
              passive.rank >= 4
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                : isNegative
                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  : "bg-purple-500/10 text-purple-700 dark:text-purple-300"
            }`}
          >
            Rank {passive.rank}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            Unranked
          </span>
        )}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground border-t pt-2.5">
        {passive.description}
      </p>
    </article>
  );
}

function PalLearnsetCard({ row }: { row: PalActiveLearnsetRow }) {
  return (
    <article className="rounded-xl border border-border/80 bg-background p-3.5 shadow-sm transition hover:border-purple-400/40">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-sm text-foreground">{row.palInternalName}</span>
        <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
          Lv. {row.level}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between border-t pt-2 gap-2">
        <span className="font-medium text-xs text-foreground">{row.name}</span>
        {row.element && <ElementBadge element={row.element} />}
      </div>

      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Power: {row.power ?? "—"}</span>
        <span>CD: {row.cooldown !== null ? `${row.cooldown}s` : "—"}</span>
      </div>
    </article>
  );
}

function PartnerSkillCard({ partner }: { partner: SpeciesPartnerSkill }) {
  return (
    <article className="rounded-xl border border-border/80 bg-background p-4 shadow-sm transition hover:border-purple-400/40">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
            {partner.palInternalName}
          </span>
          <h4 className="mt-0.5 text-base font-bold leading-tight">{partner.name}</h4>
        </div>
      </div>
      <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground border-t pt-2.5">
        {partner.description}
      </p>
    </article>
  );
}

function GuaranteedPassiveCard({ guaranteed }: { guaranteed: GuaranteedPassiveRelation }) {
  return (
    <div className="rounded-lg border bg-background p-2.5 text-xs shadow-sm">
      <div className="font-bold text-foreground">{guaranteed.palInternalName}</div>
      <div className="text-muted-foreground text-[11px] font-mono mt-0.5">
        {guaranteed.passiveInternalId}
      </div>
    </div>
  );
}

function ActiveInheritanceCard({ rule }: { rule: ActiveSkillInheritanceRule }) {
  return (
    <div className="rounded-lg border bg-background p-2.5 text-xs shadow-sm flex flex-col justify-between">
      <div>
        <div className="font-bold text-foreground">{rule.name}</div>
        <div className="text-muted-foreground text-[11px] font-mono">{rule.internalName}</div>
      </div>
      <div className="mt-2 flex gap-1 text-[10px]">
        <span
          className={`rounded px-1.5 py-0.5 font-medium ${
            rule.canInherit
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {rule.canInherit ? "Inheritable" : "No Inherit"}
        </span>
        {rule.hasSkillFruit && (
          <span className="rounded bg-sky-500/10 px-1.5 py-0.5 font-medium text-sky-700 dark:text-sky-300">
            Fruit
          </span>
        )}
      </div>
    </div>
  );
}

function PassiveInheritanceCard({ rule }: { rule: PassiveSkillInheritanceRule }) {
  return (
    <div className="rounded-lg border bg-background p-2.5 text-xs shadow-sm flex flex-col justify-between">
      <div>
        <div className="font-bold text-foreground">{rule.name}</div>
        <div className="text-muted-foreground text-[11px] font-mono">{rule.internalName}</div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] border-t pt-1">
        <span className="text-muted-foreground">
          Random: {rule.randomInheritanceAllowed ? "Yes" : "No"}
        </span>
        <span className="font-bold text-primary">Weight {rule.weight}</span>
      </div>
    </div>
  );
}

function BreedingMechanicWeightsCard({
  weights,
}: {
  weights: PalworldSkillsKnowledge["inheritanceRules"]["breedingMechanicWeights"];
}) {
  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 shadow-sm text-xs">
      <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
        <Dna className="size-4 text-purple-600 dark:text-purple-400" />
        Breeding Mechanic RNG Weights (Datamined v27)
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded bg-background p-2.5 border">
          <div className="font-semibold text-foreground mb-1">IV Inheritance Weights</div>
          <div className="space-y-0.5 text-muted-foreground">
            {Object.entries(weights.ivInheritanceWeights).map(([count, w]) => (
              <div key={count} className="flex justify-between">
                <span>{count} IV(s) inherited:</span>
                <strong className="text-foreground">Weight {w}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded bg-background p-2.5 border">
          <div className="font-semibold text-foreground mb-1">Passive Inheritance Weights</div>
          <div className="space-y-0.5 text-muted-foreground">
            {Object.entries(weights.passiveInheritanceWeights).map(([count, w]) => (
              <div key={count} className="flex justify-between">
                <span>{count} Passive(s) inherited:</span>
                <strong className="text-foreground">Weight {w}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded bg-background p-2.5 border">
          <div className="font-semibold text-foreground mb-1">Passive Random Weights</div>
          <div className="space-y-0.5 text-muted-foreground">
            {Object.entries(weights.passiveRandomWeights).map(([count, w]) => (
              <div key={count} className="flex justify-between">
                <span>{count} Random passive(s):</span>
                <strong className="text-foreground">Weight {w}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ElementBadge({ element }: { element: string }) {
  const colors: Record<string, string> = {
    Dark: "bg-purple-950/40 text-purple-300 border-purple-800/40",
    Dragon: "bg-indigo-950/40 text-indigo-300 border-indigo-800/40",
    Electric: "bg-yellow-950/40 text-yellow-300 border-yellow-800/40",
    Fire: "bg-rose-950/40 text-rose-300 border-rose-800/40",
    Grass: "bg-emerald-950/40 text-emerald-300 border-emerald-800/40",
    Ground: "bg-amber-950/40 text-amber-300 border-amber-800/40",
    Ice: "bg-cyan-950/40 text-cyan-300 border-cyan-800/40",
    Neutral: "bg-stone-800/40 text-stone-300 border-stone-700/40",
    Water: "bg-blue-950/40 text-blue-300 border-blue-800/40",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
        colors[element] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {element === "Fire" && <Flame className="size-3 mr-1" />}
      {element}
    </span>
  );
}

function PackFeedback({ loading, error }: { loading: boolean; error: Error | null }) {
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <main className="mx-auto max-w-xl rounded-2xl border bg-card p-6 text-center shadow-sm">
        <Sparkles className="mx-auto size-7 text-primary" />
        <h1 className="mt-3 text-xl font-bold">
          {loading ? "Loading Skills Guide" : "Skills pack unavailable"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {loading
            ? "Preparing the cached offline skills & passives directory."
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
    <span className="inline-flex items-center gap-2 rounded-full border border-purple-400/40 bg-purple-400/10 px-3 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300">
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
