import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  Clipboard,
  Crosshair,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PALS, palById } from "@/data/palworld";
import type { EvidenceRecord } from "@/data/palworld/knowledge";
import { findBreedableTargets, confirmedBreedableTargetIds } from "@/lib/breedable-targets";
import {
  buildCombatComparisonShareUrl,
  combatCandidates,
  DEFAULT_COMBAT_COMPARISON_STATE,
  decodeCombatComparisonState,
  filterCombatCandidates,
  formatOrdinal,
  formatStat,
  hasCombatWeights,
  loadCombatComparisonState,
  PERSONAL_COMBAT_PRESETS,
  personalPreset,
  saveCombatComparisonState,
  teamElementCoverage,
  toggleCombatTeamMember,
  type CombatComparisonState,
  type CombatWeightKey,
  type EncounterContext,
  type RosterScope,
} from "@/lib/combat-comparison";
import { loadCollection, type CollectionEntry } from "@/lib/collection";
import { useOfflineKnowledgePack } from "@/lib/use-offline-knowledge-pack";

interface EncounterKnowledge {
  kind: "dungeon" | "raid" | "tower";
  internalName?: string;
}

interface FieldAlphaKnowledge {
  palName: string;
}

const MAX_VISIBLE_CANDIDATES = 60;

export const Route = createFileRoute("/planner/combat")({
  component: CombatPlannerRoute,
});

const scopeOptions: readonly { value: RosterScope; label: string; note: string }[] = [
  { value: "any", label: "Any Pal", note: "All Pals in the game." },
  { value: "owned", label: "Pals I own", note: "Pals currently in your collection." },
  {
    value: "breedable",
    label: "Pals I can breed",
    note: "Pals you can breed using your collection.",
  },
];

const contextOptions: readonly { value: EncounterContext; label: string }[] = [
  { value: "all", label: "All record contexts" },
  { value: "field-alpha", label: "Field Alpha record" },
  { value: "dungeon", label: "Dungeon record" },
  { value: "raid", label: "Raid record" },
  { value: "tower", label: "Tower record" },
];

function titleCase(value: string): string {
  return value.replace(/(^|[- ])\w/g, (letter) => letter.toUpperCase());
}

function statLabel(key: CombatWeightKey): string {
  return key === "health" ? "Health" : titleCase(key);
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-1 text-xs font-medium text-muted-foreground">
      <span>{label} weight</span>
      <Input
        aria-label={`${label} preference weight`}
        className="h-10 bg-background tabular-nums"
        inputMode="numeric"
        min={0}
        max={100}
        step={1}
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function sourceContextIds(
  context: EncounterContext,
  encounters: readonly EvidenceRecord<EncounterKnowledge>[],
  fieldAlphas: readonly EvidenceRecord<FieldAlphaKnowledge>[],
): Set<number> {
  if (context === "all") return new Set(PALS.map((pal) => pal.id));
  if (context === "field-alpha") {
    const names = new Set(fieldAlphas.map((record) => record.data.palName));
    return new Set(PALS.filter((pal) => names.has(pal.name)).map((pal) => pal.id));
  }
  return new Set(
    encounters
      .filter((record) => record.data.kind === context)
      .map((record) => record.data.internalName)
      .filter((internalName): internalName is string => typeof internalName === "string")
      .flatMap((internalName) =>
        PALS.filter((pal) => pal.internalName === internalName).map((pal) => pal.id),
      ),
  );
}

function CombatPlannerRoute() {
  const [state, setState] = useState<CombatComparisonState>(DEFAULT_COMBAT_COMPARISON_STATE);
  const [collection, setCollection] = useState<CollectionEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [breedableIds, setBreedableIds] = useState<Set<number>>(new Set());
  const [breedableProgress, setBreedableProgress] = useState({
    running: false,
    done: 0,
    total: 0,
    truncated: false,
  });
  const {
    records: encounterRecords,
    loading: encountersLoading,
    error: encountersError,
  } = useOfflineKnowledgePack<EncounterKnowledge>("encounters");
  const {
    records: fieldAlphaRecords,
    loading: fieldAlphasLoading,
    error: fieldAlphasError,
  } = useOfflineKnowledgePack<FieldAlphaKnowledge>("field-alphas");

  useEffect(() => {
    const shared = decodeCombatComparisonState(window.location.search);
    setState(shared ?? loadCombatComparisonState());
    setCollection(loadCollection());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveCombatComparisonState(state);
  }, [hydrated, state]);

  useEffect(() => {
    if (!hydrated || state.scope !== "breedable" || collection.length === 0) return;
    let active = true;
    setBreedableProgress({ running: true, done: 0, total: 0, truncated: false });
    void findBreedableTargets(collection, {
      onProgress: (done, total) => {
        if (active) setBreedableProgress((previous) => ({ ...previous, done, total }));
      },
    })
      .then((run) => {
        if (!active) return;
        setBreedableIds(confirmedBreedableTargetIds(run));
        setBreedableProgress((previous) => ({
          ...previous,
          running: false,
          truncated: run.truncated,
        }));
      })
      .catch(() => {
        if (active)
          setBreedableProgress((previous) => ({ ...previous, running: false, truncated: true }));
      });
    return () => {
      active = false;
    };
  }, [collection, hydrated, state.scope]);

  const ownedIds = useMemo(() => new Set(collection.map((entry) => entry.palId)), [collection]);
  const contextIds = useMemo(
    () => sourceContextIds(state.encounter, encounterRecords, fieldAlphaRecords),
    [encounterRecords, fieldAlphaRecords, state.encounter],
  );
  const candidates = useMemo(
    () =>
      filterCombatCandidates(
        combatCandidates(state.weights),
        state,
        ownedIds,
        breedableIds,
        contextIds,
      ),
    [breedableIds, contextIds, ownedIds, state],
  );
  const filtered = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase();
    return normalized
      ? candidates.filter((candidate) =>
          candidate.pal.name.toLocaleLowerCase().includes(normalized),
        )
      : candidates;
  }, [candidates, search]);
  const visibleCandidates = filtered.slice(0, MAX_VISIBLE_CANDIDATES);
  const selected = state.selectedPalIds.map((id) => palById.get(id)).filter(Boolean);
  const elements = teamElementCoverage(state.selectedPalIds);
  const encounterPending =
    state.encounter !== "all" &&
    ((state.encounter === "field-alpha" && fieldAlphasLoading) ||
      (state.encounter !== "field-alpha" && encountersLoading));

  const update = (change: Partial<CombatComparisonState>) =>
    setState((previous) => ({ ...previous, ...change }));
  const updateWeight = (key: CombatWeightKey, value: number) =>
    setState((previous) => ({
      ...previous,
      weights: { ...previous.weights, [key]: Math.max(0, Math.min(100, Math.round(value || 0))) },
    }));

  const applyPreset = (id: string) => {
    const preset = personalPreset(id);
    if (preset) setState((previous) => ({ ...previous, weights: preset.weights }));
  };

  const copyShare = async () => {
    const url = buildCombatComparisonShareUrl(state);
    try {
      await navigator.clipboard.writeText(url);
      setShareNotice(
        "Share link copied. It contains planner preferences and team selection, not your collection.",
      );
    } catch {
      setShareNotice(
        "Could not copy automatically. Copy this address from your browser to share the configuration.",
      );
    }
  };

  const scopeNote = scopeOptions.find((option) => option.value === state.scope)?.note;
  const sourceUnavailable =
    (state.encounter === "field-alpha" && fieldAlphasError) ||
    (state.encounter !== "all" && state.encounter !== "field-alpha" && encountersError);

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-3 py-5 sm:px-6 sm:py-8">
      <Link
        to="/"
        className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Back to the pathfinder
      </Link>

      <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="max-w-3xl space-y-2">
            <Badge variant="outline" className="border-primary/35 bg-primary/10 text-primary">
              Team planner · comparison mode
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Combat comparison</h1>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Compare any Pal's Attack, Health, and Defense. Set what you care about and the list
              re-sorts.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs sm:w-52">
            <div className="rounded-xl border border-border/70 bg-background/65 p-3">
              <strong className="block text-lg text-foreground">{selected.length}/5</strong>
              team slots
            </div>
            <div className="rounded-xl border border-border/70 bg-background/65 p-3">
              <strong className="block text-lg text-foreground">{filtered.length}</strong>
              visible rows
            </div>
          </div>
        </div>
      </section>

      <Collapsible className="rounded-xl border bg-card/60 p-4">
        <CollapsibleTrigger className="flex w-full items-center justify-between font-semibold text-sm text-muted-foreground hover:text-foreground">
          <span>What this can and can't tell you</span>
          <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 text-xs leading-relaxed text-muted-foreground space-y-2">
          <p>
            <strong>
              This doesn't tell you who wins a fight — there's no public damage formula.
            </strong>{" "}
            This tool compares base stats (Attack, Health, Defense) across Pals.
          </p>
          <p>
            It does not calculate move damage, attack cooldowns, level scaling, equipment bonuses,
            or player stats.
          </p>
          <p>
            Element tags show each Pal's element type, not calculated elemental damage multipliers
            or counter advantages.
          </p>
        </CollapsibleContent>
      </Collapsible>

      <div className="grid gap-5 xl:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.7fr)]">
        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <SlidersHorizontal className="size-4 text-primary" /> Your comparison priorities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Presets are starting points. Set all weights to zero to browse alphabetically.
              </p>
              <div className="grid gap-2">
                {PERSONAL_COMBAT_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    variant="outline"
                    size="sm"
                    className="justify-start text-left"
                    onClick={() => applyPreset(preset.id)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <NumberInput
                  label="Attack"
                  value={state.weights.attack}
                  onChange={(value) => updateWeight("attack", value)}
                />
                <NumberInput
                  label="Health"
                  value={state.weights.health}
                  onChange={(value) => updateWeight("health", value)}
                />
                <NumberInput
                  label="Defense"
                  value={state.weights.defense}
                  onChange={(value) => updateWeight("defense", value)}
                />
              </div>
              {hasCombatWeights(state.weights) ? (
                <p className="rounded-lg bg-muted/55 p-2 text-xs leading-relaxed text-muted-foreground">
                  <strong className="text-foreground">Your custom ranking score:</strong> combines
                  stat ranks using your weights above. It helps you compare Pals by what you care
                  about, not an official game rating.
                </p>
              ) : (
                <p className="rounded-lg bg-muted/55 p-2 text-xs text-muted-foreground">
                  Set a weight above to rank these.
                </p>
              )}
              <Button className="w-full" variant="secondary" onClick={copyShare}>
                <Clipboard className="mr-2 size-4" /> Copy share link
              </Button>
              {shareNotice ? <p className="text-xs text-muted-foreground">{shareNotice}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4 text-primary" /> Roster and context
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="space-y-1 text-xs font-medium text-muted-foreground">
                <span>Roster scope</span>
                <select
                  value={state.scope}
                  onChange={(event) => update({ scope: event.target.value as RosterScope })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  {scopeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs leading-relaxed text-muted-foreground">{scopeNote}</p>
              {state.scope === "owned" && collection.length === 0 ? (
                <p className="rounded-lg bg-muted/55 p-2 text-xs text-muted-foreground">
                  Your local collection is empty. Add Pals on the breeding page to use this filter.
                </p>
              ) : null}
              {state.scope === "breedable" && collection.length === 0 ? (
                <p className="rounded-lg bg-muted/55 p-2 text-xs text-muted-foreground">
                  Add Pals on the breeding page before a positive breedability search can run.
                </p>
              ) : null}
              {state.scope === "breedable" && breedableProgress.running ? (
                <div className="space-y-1">
                  <Progress
                    value={
                      breedableProgress.total
                        ? (breedableProgress.done / breedableProgress.total) * 100
                        : 0
                    }
                  />
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> Checking existing breeding chains{" "}
                    {breedableProgress.done}/{breedableProgress.total || "…"}
                  </p>
                </div>
              ) : null}
              {state.scope === "breedable" && breedableProgress.truncated ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  The breeding search was incomplete. Omitted Pals are unknown to this filter, not
                  declared unbreedable.
                </p>
              ) : null}

              <label className="space-y-1 text-xs font-medium text-muted-foreground">
                <span>Encounter record filter</span>
                <select
                  value={state.encounter}
                  onChange={(event) =>
                    update({ encounter: event.target.value as EncounterContext })
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  {contextOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Filters for Pals that appear in this encounter type. This does not recommend
                counter-teams.
              </p>
              {encounterPending ? (
                <p className="text-xs text-muted-foreground">Loading offline encounter records…</p>
              ) : null}
              {sourceUnavailable ? (
                <p className="text-xs text-destructive">
                  The relevant offline record pack is unavailable, so this filter cannot claim a
                  result.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Crosshair className="size-4 text-primary" /> Selected team
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selected.length === 0 ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Add up to five Pals from the list. Shows element types in your team, not damage
                  bonuses.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.map((pal) => (
                      <Badge key={pal!.id} variant="secondary">
                        {pal!.name}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {elements.length
                      ? `Element identities: ${elements.join(", ")}.`
                      : "Element identity is UNKNOWN for this selection."}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-4">
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex-1">
                <span className="sr-only">Search comparison rows</span>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search Pal name"
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Showing {visibleCandidates.length} of {filtered.length} matching rows
                {filtered.length > MAX_VISIBLE_CANDIDATES ? ". Narrow search to see more." : "."}
              </p>
            </CardContent>
          </Card>

          {state.scope === "breedable" && breedableProgress.running ? (
            <Card>
              <CardContent className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Waiting for the existing breeding search
                before showing positive reachable rows.
              </CardContent>
            </Card>
          ) : null}

          {visibleCandidates.length === 0 && !breedableProgress.running ? (
            <Card>
              <CardContent className="p-5 text-sm text-muted-foreground">
                No rows match the selected filters. This is not a negative acquisition, breeding, or
                combat claim.
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            {visibleCandidates.map((candidate) => {
              const selectedHere = state.selectedPalIds.includes(candidate.pal.id);
              return (
                <Card
                  key={candidate.pal.id}
                  className={selectedHere ? "border-primary/60 bg-primary/5" : undefined}
                >
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold">
                          #{candidate.pal.palDexNo} {candidate.pal.name}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {candidate.elements.length
                            ? candidate.elements.join(" · ")
                            : "Element identity UNKNOWN"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={selectedHere ? "secondary" : "outline"}
                        disabled={!selectedHere && state.selectedPalIds.length >= 5}
                        onClick={() =>
                          setState((previous) => toggleCombatTeamMember(previous, candidate.pal.id))
                        }
                      >
                        {selectedHere ? <Check className="mr-1 size-3.5" /> : null}
                        {selectedHere ? "In team" : "Add"}
                      </Button>
                    </div>

                    {candidate.score === null ? (
                      <p className="rounded-lg bg-muted/55 p-2 text-xs text-muted-foreground">
                        Set a weight above to rank these.
                      </p>
                    ) : (
                      <p className="rounded-lg bg-primary/10 p-2 text-xs text-primary">
                        Your custom rank score: <strong>{candidate.score.toFixed(1)}/100</strong>
                      </p>
                    )}

                    <dl className="grid grid-cols-3 gap-2 text-center text-xs">
                      {(["attack", "health", "defense"] as const).map((key) => (
                        <div
                          key={key}
                          className="rounded-lg border border-border/70 bg-background/55 p-2"
                        >
                          <dt className="text-muted-foreground">{statLabel(key)}</dt>
                          <dd className="mt-1 font-semibold tabular-nums">
                            {formatStat(candidate.raw[key])}
                          </dd>
                          <dd className="text-[10px] text-muted-foreground">
                            {formatOrdinal(candidate.percentiles[key])} percentile
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Base stats only. Ranks compare raw base values across Pals, not level 50
                      stats, skills, or damage.
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
