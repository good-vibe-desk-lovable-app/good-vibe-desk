import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Egg, Loader2, PawPrint, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { DATA_VERSION, PALS } from "@/data/palworld";
import type { Pal } from "@/data/palworld";
import {
  loadCollection,
  loadFavorites,
  loadLastTarget,
  saveCollection,
  saveFavorites,
  saveLastTarget,
  type CollectionEntry,
} from "@/lib/collection";
import { findAlternative, runPathfinder, type PathfinderInput, type Result } from "@/lib/pathfinder";
import { Button } from "@/components/ui/button";
import { AlternativesPanel } from "@/components/pbp/alternatives-panel";
import { BreedingPowerTool } from "@/components/pbp/breeding-power-tool";
import { CollectionPanel } from "@/components/pbp/collection-panel";
import { HowBreedingWorks } from "@/components/pbp/how-breeding-works";
import { PassivesPanel } from "@/components/pbp/passives-panel";
import { ResultsErrorBoundary } from "@/components/pbp/results-error-boundary";
import { ResultsPanel } from "@/components/pbp/results-panel";
import { TargetPanel } from "@/components/pbp/target-panel";

const SITE = "https://good-vibe-desk.lovable.app";
// Renders the footer anchor. A literal `<a` open tag gets stripped by some
// mobile clipboard sanitizers when pasted through GitHub's web editor (this
// file was corrupted that way once); `A` is just the string "a", which React
// renders as a normal anchor element.
const A = "a";
const TITLE = "Palworld Breeding Pathfinder — Plan Passive Trait Chains";
const DESCRIPTION =
  "Build your Pal collection, pick a target species, and plan the breeding chain that carries the passives you want onto it. Offline data, no account needed.";

export const Route = createFileRoute("/")({
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
  component: Index,
});

function Index() {
  const [entries, setEntries] = useState<CollectionEntry[]>([]);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [selections, setSelections] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [running, setRunning] = useState(false);
  const [altLoading, setAltLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [alternatives, setAlternatives] = useState<Result[]>([]);

  /**
   * Search epoch. A "Find chain" click kicks off up to four sequential worker
   * runs (main result + three background alternatives) spanning many seconds.
   * Any input edit during that window — collection change, target change, or a
   * newer search — must invalidate the in-flight work, or its late setState
   * calls resurrect results computed against inputs that no longer exist.
   * Every async path captures the epoch at start and re-checks it before each
   * state write; bumping the ref is how the current work is cancelled.
   */
  const runEpoch = useRef(0);

  // localStorage is browser-only; hydrate after mount so SSR markup matches.
  useEffect(() => {
    setEntries(loadCollection());
    setTargetId(loadLastTarget());
    setFavorites(loadFavorites());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveCollection(entries);
  }, [entries, hydrated]);

  useEffect(() => {
    if (hydrated) saveLastTarget(targetId);
  }, [targetId, hydrated]);

  useEffect(() => {
    if (hydrated) saveFavorites(favorites);
  }, [favorites, hydrated]);

  const target: Pal | null = useMemo(
    () => (targetId === null ? null : (PALS.find((p) => p.id === targetId) ?? null)),
    [targetId],
  );

  function toggleFavorite(palId: number) {
    setFavorites((prev) =>
      prev.includes(palId) ? prev.filter((id) => id !== palId) : [...prev, palId],
    );
  }

  // Drop selections whose Pal or passive no longer exists in the collection.
  function handleCollectionChange(next: CollectionEntry[]) {
    runEpoch.current++; // cancel in-flight searches against the old collection
    const valid = new Set(next.flatMap((e) => e.passiveIds.map((p) => `${e.instanceId}:${p}`)));
    setSelections((prev) => new Set(Array.from(prev).filter((key) => valid.has(key))));
    setEntries(next);
    setResult(null);
    setAlternatives([]);
    setAltLoading(false);
  }

  // A stale result rendered against a new target mislabels every panel.
  function handleTargetSelect(id: number | null) {
    if (id !== targetId) {
      runEpoch.current++;
      setResult(null);
      setAlternatives([]);
      setAltLoading(false);
    }
    setTargetId(id);
  }

  const canCalculate = target !== null && selections.size > 0;

  const desiredSources = useMemo(
    () =>
      Array.from(new Set(Array.from(selections).map((key) => key.slice(0, key.lastIndexOf(":"))))),
    [selections],
  );

  const selectedPassives = useCallback(
    (instanceId: string) =>
      Array.from(selections)
        .filter((key) => key.slice(0, key.lastIndexOf(":")) === instanceId)
        .map((key) => key.slice(key.lastIndexOf(":") + 1)),
    [selections],
  );

  const buildInput = useCallback((): PathfinderInput | null => {
    if (targetId === null) return null;
    return { targetId, collection: entries, desiredSources, options: { timeoutMs: 5000 } };
  }, [targetId, entries, desiredSources]);

  /** Chains alternatives, each forbidding the previous one's final pair. */
  async function collectAlternatives(base: Result, input: PathfinderInput, epoch: number) {
    setAltLoading(true);
    try {
      const found: Result[] = [];
      let previous = base;
      for (let i = 0; i < 3; i++) {
        const next = await findAlternative(previous, input, { timeoutMs: 4000 });
        if (runEpoch.current !== epoch) return; // superseded — discard silently
        if (next.steps.length === 0) break;
        const signature = next.steps.map((s) => `${s.parent1}+${s.parent2}`).join("|");
        const baseSig = base.steps.map((s) => `${s.parent1}+${s.parent2}`).join("|");
        if (signature === baseSig || found.some((f) =>
          f.steps.map((s) => `${s.parent1}+${s.parent2}`).join("|") === signature,
        )) {
          break;
        }
        found.push(next);
        previous = next;
      }
      found.sort(
        (a, b) => a.steps.length - b.steps.length || b.coveredSources.length - a.coveredSources.length,
      );
      setAlternatives(found);
    } finally {
      if (runEpoch.current === epoch) setAltLoading(false);
    }
  }

  async function handleFindChain() {
    const input = buildInput();
    if (!input) return;
    const epoch = ++runEpoch.current;
    setRunning(true);
    setAlternatives([]);
    try {
      const next = await runPathfinder(input, { timeoutMs: 5000 });
      if (runEpoch.current !== epoch) return;
      setResult(next);
      if (next.steps.length > 0) void collectAlternatives(next, input, epoch);
    } catch (error) {
      if (runEpoch.current === epoch) {
        toast.error(error instanceof Error ? error.message : "The search failed.");
      }
    } finally {
      if (runEpoch.current === epoch) setRunning(false);
    }
  }

  async function handleAlternative() {
    const input = buildInput();
    if (!input || !result) return;
    const epoch = ++runEpoch.current; // supersedes any background alternative collection
    setRunning(true);
    try {
      const next = await findAlternative(result, input, { timeoutMs: 5000 });
      if (runEpoch.current !== epoch) return;
      if (next.steps.length === 0 && next.status !== "ok") {
        toast("No different chain found.");
      } else {
        setResult(next);
      }
    } finally {
      if (runEpoch.current === epoch) setRunning(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, color-mix(in oklch, var(--primary) 18%, transparent) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Egg className="size-3.5" /> {PALS.length} Pals · offline dataset
          </span>
          <h1 className="mt-4 text-4xl font-bold sm:text-5xl">Breeding Pathfinder</h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Tell it which Pals you own and which passives they carry, pick the species you're
            chasing, and it will work out how to get those traits onto it.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <CollectionPanel entries={entries} onChange={handleCollectionChange} />
          <TargetPanel
            target={target}
            onSelect={handleTargetSelect}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />

          {target && entries.length > 0 ? (
            <PassivesPanel entries={entries} selections={selections} onChange={setSelections} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-card/40 p-8 text-center text-sm text-muted-foreground">
              <PawPrint className="size-8 opacity-40" />
              {entries.length === 0
                ? "Add your first Pal to get started."
                : "Pick the Pal you want to breed, then tick the passives you want to carry over."}
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center gap-2">
          <Button
            size="lg"
            className="w-full sm:w-auto"
            disabled={!canCalculate || running}
            onClick={handleFindChain}
          >
            {running ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {running ? "Searching…" : "Find breeding chain"}
          </Button>
          {!canCalculate ? (
            <p className="text-xs text-muted-foreground">
              {target === null
                ? "Pick the Pal you want to breed."
                : "Tick the passives you want to carry over."}
            </p>
          ) : null}
        </div>

        {result && targetId !== null ? (
          <ResultsErrorBoundary onRetry={handleFindChain}>
            <ResultsPanel
              result={result}
              entries={entries}
              targetId={targetId}
              selectedPassives={selectedPassives}
              onAlternative={handleAlternative}
              alternativeLoading={running}
            />
            <div className="mt-6">
              <AlternativesPanel
                alternatives={alternatives}
                loading={altLoading}
                onUse={setResult}
              />
            </div>
          </ResultsErrorBoundary>
        ) : null}

        <BreedingPowerTool />
        <HowBreedingWorks />

        <footer className="mt-12 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
          <p>
            Data v{DATA_VERSION.dataVersion} · Game {DATA_VERSION.gameVersionTargeted} · Sourced{" "}
            {DATA_VERSION.sourcedAt}
          </p>
          <p className="mt-1">
            <A
              href="https://github.com/tylercamp/palcalc"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Data source
            </A>
          </p>
        </footer>
      </div>
    </div>
  );
}
