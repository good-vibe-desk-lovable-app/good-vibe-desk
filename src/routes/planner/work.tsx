import { type ReactNode, useEffect, useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { Clipboard, Factory, Loader2, RefreshCw, ShieldAlert, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { findBreedableTargets, confirmedBreedableTargetIds } from "@/lib/breedable-targets";
import { loadCollection, type CollectionEntry } from "@/lib/collection";
import { useOfflineKnowledgePack } from "@/lib/use-offline-knowledge-pack";
import {
  buildWorkComparisonShareUrl,
  countUnknownProgressions,
  decodeWorkComparisonState,
  DEFAULT_WORK_COMPARISON_STATE,
  filterWorkCandidates,
  loadWorkComparisonState,
  saveWorkComparisonState,
  WORK_OPTIONS,
  workCandidates,
  workLabel,
  type RosterScope,
  type WorkComparisonState,
  type WorkComparisonKey,
} from "@/lib/work-comparison";
import type { WorkSuitabilityKnowledge } from "@/data/palworld/knowledgeWorkSuitability";

const MAX_VISIBLE_CANDIDATES = 60;

export const Route = createFileRoute("/planner/work")({
  component: WorkPlannerRoute,
});

const rankOptions = [
  { rank: 0, label: "Base", cumulative: 0, effect: "No condensation bonus" },
  {
    rank: 1,
    label: "Rank 1",
    cumulative: 4,
    effect: "+1 to this Pal’s first source-selected work",
  },
  { rank: 2, label: "Rank 2", cumulative: 12, effect: "+1 to its second source-selected work" },
  { rank: 3, label: "Rank 3", cumulative: 24, effect: "+1 to its third source-selected work" },
  { rank: 4, label: "Rank 4", cumulative: 48, effect: "+1 to every existing work suitability" },
] as const;

const scopeOptions: readonly { value: RosterScope; label: string; note: string }[] = [
  { value: "any", label: "Any Pal", note: "All Pals with a known work-suitability record." },
  { value: "owned", label: "Pals I own", note: "Species present in your local collection." },
  {
    value: "breedable",
    label: "Pals I can breed",
    note: "Positive, fully resolved chains from your local collection only.",
  },
];

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2 rounded-xl border border-amber-500/35 bg-amber-500/5 p-3 text-xs leading-relaxed text-muted-foreground">
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
      <div>{children}</div>
    </div>
  );
}

function WorkPlannerRoute() {
  const [state, setState] = useState<WorkComparisonState>(DEFAULT_WORK_COMPARISON_STATE);
  const [collection, setCollection] = useState<CollectionEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState("");
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [breedableIds, setBreedableIds] = useState<Set<number>>(new Set());
  const [breedableProgress, setBreedableProgress] = useState({
    running: false,
    done: 0,
    total: 0,
    truncated: false,
  });
  const { records, loading, error } =
    useOfflineKnowledgePack<WorkSuitabilityKnowledge>("work-suitability");

  useEffect(() => {
    const shared = decodeWorkComparisonState(window.location.search);
    setState(shared ?? loadWorkComparisonState());
    setCollection(loadCollection());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveWorkComparisonState(state);
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
  const candidates = useMemo(
    () => filterWorkCandidates(workCandidates(state, records), state, ownedIds, breedableIds),
    [breedableIds, ownedIds, records, state],
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
  const unknownProgressions = useMemo(
    () => countUnknownProgressions(state, records),
    [records, state],
  );
  const selectedRank = rankOptions[state.condensationRank];
  const scopeNote = scopeOptions.find((option) => option.value === state.scope)?.note;

  const update = (change: Partial<WorkComparisonState>) =>
    setState((previous) => ({ ...previous, ...change }));

  const copyShare = async () => {
    const url = buildWorkComparisonShareUrl(state);
    try {
      await navigator.clipboard.writeText(url);
      setShareNotice(
        "Share link copied. It contains your work task, condensation plan, and scope—not your collection.",
      );
    } catch {
      setShareNotice(
        "Could not copy automatically. Copy this address from your browser to share the configuration.",
      );
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-3 py-5 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <Link to="/compendium" className="hover:text-foreground">
          ← Back to the compendium
        </Link>
        <Link to="/planner/combat" className="hover:text-foreground">
          Combat comparison →
        </Link>
      </div>

      <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm sm:p-7">
        <div className="max-w-3xl space-y-2">
          <Badge variant="outline" className="border-primary/35 bg-primary/10 text-primary">
            Team planner · base work mode
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Base work comparison</h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Select one job and the condensation rank you are willing to farm. Rows show the sourced
            work-suitability level for that exact Pal and rank; this is not a universal “best
            worker” score or a production-time forecast.
          </p>
        </div>
      </section>

      <Notice>
        <strong className="text-foreground">Suitability is not throughput.</strong> Work levels
        scale nonlinearly in-game, but the offline packs do not include a validated work-output
        curve or a full task-time formula. Passives, research, facilities, SAN, food, pathing, and
        animation time are deliberately excluded rather than converted into invented
        output-per-minute numbers.
      </Notice>

      <div className="grid gap-5 xl:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.7fr)]">
        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Factory className="size-4 text-primary" /> Your work target
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="space-y-1 text-xs font-medium text-muted-foreground">
                <span>Work suitability</span>
                <select
                  value={state.work ?? ""}
                  onChange={(event) =>
                    update({
                      work: event.target.value ? (event.target.value as WorkComparisonKey) : null,
                    })
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="">No task selected — browse alphabetically</option>
                  {WORK_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {state.work === null ? (
                <p className="rounded-lg bg-muted/55 p-2 text-xs leading-relaxed text-muted-foreground">
                  No task selected. Rows are alphabetical and no default worker ranking is applied.
                </p>
              ) : (
                <p className="rounded-lg bg-primary/10 p-2 text-xs leading-relaxed text-primary">
                  <strong>Your comparison:</strong> {workLabel(state.work)} suitability at{" "}
                  {selectedRank.label}. Higher levels sort first; equal levels sort alphabetically.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Condensation plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="space-y-1 text-xs font-medium text-muted-foreground">
                <span>Planned rank</span>
                <select
                  value={state.condensationRank}
                  onChange={(event) => update({ condensationRank: Number(event.target.value) })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  {rankOptions.map((option) => (
                    <option key={option.rank} value={option.rank}>
                      {option.label} · {option.cumulative} same-species Pals total
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-lg border border-border/70 bg-background/55 p-3 text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">{selectedRank.label}:</strong>{" "}
                {selectedRank.effect}.{" "}
                {selectedRank.cumulative === 0
                  ? "No sacrifices assumed."
                  : `${selectedRank.cumulative} same-species Pals total are required from base rank.`}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Ranks 1–3 use each Pal’s source-defined progression order, including tied base
                levels; rank 4 raises every existing suitability. This board does not assume a
                condensation rank.
              </p>
              {unknownProgressions > 0 ? (
                <p className="rounded-lg border border-amber-500/35 bg-amber-500/5 p-2 text-xs leading-relaxed text-muted-foreground">
                  <strong className="text-foreground">
                    {unknownProgressions} progression unknown:
                  </strong>{" "}
                  a working Pal has a validated base value but no matching per-rank source record.
                  It is withheld at this rank instead of inheriting another Pal’s progression.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4 text-primary" /> Roster
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
              <Button className="w-full" variant="secondary" onClick={copyShare}>
                <Clipboard className="mr-2 size-4" /> Copy share link
              </Button>
              {shareNotice ? <p className="text-xs text-muted-foreground">{shareNotice}</p> : null}
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-4">
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex-1">
                <span className="sr-only">Search Pal name</span>
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

          {loading ? (
            <Card>
              <CardContent className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading the offline work-progression
                pack…
              </CardContent>
            </Card>
          ) : null}
          {error ? (
            <Card>
              <CardContent className="p-5 text-sm text-destructive">
                The offline work-progression pack is unavailable. The planner will not substitute an
                inferred condensation order.
              </CardContent>
            </Card>
          ) : null}
          {state.scope === "breedable" && breedableProgress.running ? (
            <Card>
              <CardContent className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Waiting for the existing breeding search
                before showing positive reachable rows.
              </CardContent>
            </Card>
          ) : null}
          {!loading && !error && !breedableProgress.running && visibleCandidates.length === 0 ? (
            <Card>
              <CardContent className="p-5 text-sm text-muted-foreground">
                No rows match the selected filters. This is not a claim that no other Pal can
                perform the job.
              </CardContent>
            </Card>
          ) : null}

          {!loading && !error && !breedableProgress.running ? (
            <div className="grid gap-3 md:grid-cols-2">
              {visibleCandidates.map((candidate) => (
                <Card key={candidate.pal.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold">
                          #{candidate.pal.palDexNo} {candidate.pal.name}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {candidate.knownProgression
                            ? "Rank progression source-backed"
                            : "Base value only; later ranks UNKNOWN"}
                        </p>
                      </div>
                      {candidate.level === null ? (
                        <Badge variant="secondary">Browse only</Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-primary/35 bg-primary/10 text-primary"
                        >
                          Lv. {candidate.level}
                        </Badge>
                      )}
                    </div>
                    {candidate.level === null ? (
                      <p className="rounded-lg bg-muted/55 p-2 text-xs leading-relaxed text-muted-foreground">
                        Choose one work task to compare work-suitability levels. This mode
                        intentionally has no all-jobs total or default “best worker.”
                      </p>
                    ) : (
                      <p className="rounded-lg bg-primary/10 p-2 text-xs leading-relaxed text-primary">
                        <strong>{workLabel(state.work)} suitability:</strong> level{" "}
                        {candidate.level} at {selectedRank.label}. This is a sourced suitability
                        rank, not items per minute.
                      </p>
                    )}
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Individual passive traits, base-wide Partner Skills, Applied Technique books,
                      research, and task environment are not merged into this species-level
                      comparison.
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <Notice>
        <strong className="text-foreground">Scope boundary:</strong> this mode compares one existing
        work suitability at a time. It does not simulate task scheduling, ranch drops, stackable
        base buffs, individual passives, book allocation, or actual crafting/mining time.
      </Notice>
    </main>
  );
}
