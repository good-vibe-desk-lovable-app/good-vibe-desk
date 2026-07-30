import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Egg, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { DATA_VERSION, PALS } from "@/data/palworld";
import type { Pal } from "@/data/palworld";
import {
  loadCollection,
  loadLastTarget,
  saveCollection,
  saveLastTarget,
  type CollectionEntry,
} from "@/lib/collection";
import { findAlternative, runPathfinder, type PathfinderInput, type Result } from "@/lib/pathfinder";
import { Button } from "@/components/ui/button";
import { CollectionPanel } from "@/components/pbp/collection-panel";
import { PassivesPanel } from "@/components/pbp/passives-panel";
import { ResultsPanel } from "@/components/pbp/results-panel";
import { TargetPanel } from "@/components/pbp/target-panel";


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
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [entries, setEntries] = useState<CollectionEntry[]>([]);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [selections, setSelections] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);


  // localStorage is browser-only; hydrate after mount so SSR markup matches.
  useEffect(() => {
    setEntries(loadCollection());
    setTargetId(loadLastTarget());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveCollection(entries);
  }, [entries, hydrated]);

  useEffect(() => {
    if (hydrated) saveLastTarget(targetId);
  }, [targetId, hydrated]);

  const target: Pal | null = useMemo(
    () => (targetId === null ? null : (PALS.find((p) => p.id === targetId) ?? null)),
    [targetId],
  );

  // Drop selections whose Pal or passive no longer exists in the collection.
  function handleCollectionChange(next: CollectionEntry[]) {
    const valid = new Set(
      next.flatMap((e) => e.passiveIds.map((p) => `${e.instanceId}:${p}`)),
    );
    setSelections((prev) => new Set(Array.from(prev).filter((key) => valid.has(key))));
    setEntries(next);
    setResult(null);
  }

  const canCalculate = target !== null && selections.size > 0;

  const desiredSources = useMemo(
    () =>
      Array.from(
        new Set(Array.from(selections).map((key) => key.slice(0, key.lastIndexOf(":")))),
      ),
    [selections],
  );

  function buildInput(): PathfinderInput | null {
    if (targetId === null) return null;
    return { targetId, collection: entries, desiredSources, options: { timeoutMs: 5000 } };
  }

  async function handleFindChain() {
    const input = buildInput();
    if (!input) return;
    setRunning(true);
    try {
      setResult(await runPathfinder(input, { timeoutMs: 5000 }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The search failed.");
    } finally {
      setRunning(false);
    }
  }

  async function handleAlternative() {
    const input = buildInput();
    if (!input || !result) return;
    setRunning(true);
    try {
      const next = await findAlternative(result, input, { timeoutMs: 5000 });
      if (next.steps.length === 0 && next.status !== "ok") {
        toast("No different chain found.");
      } else {
        setResult(next);
      }
    } finally {
      setRunning(false);
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
          <TargetPanel target={target} onSelect={setTargetId} />

          {target && entries.length > 0 ? (
            <PassivesPanel
              entries={entries}
              selections={selections}
              onChange={setSelections}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 bg-card/40 p-8 text-center text-sm text-muted-foreground">
              {entries.length === 0
                ? "Add your first Pal to get started."
                : "Pick a target Pal to choose which passives to carry over."}
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
            {running ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {running ? "Searching…" : "Find breeding chain"}
          </Button>
          {!canCalculate ? (
            <p className="text-xs text-muted-foreground">
              Pick a target and tick at least one passive to run the search.
            </p>
          ) : null}
        </div>

        {result && targetId !== null ? (
          <ResultsPanel
            result={result}
            entries={entries}
            targetId={targetId}
            onAlternative={handleAlternative}
            alternativeLoading={running}
          />
        ) : null}


        <footer className="mt-12 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
          <p>
            Data v{DATA_VERSION.dataVersion} · Game {DATA_VERSION.gameVersionTargeted} · Sourced{" "}
            {DATA_VERSION.sourcedAt}
          </p>
          <p className="mt-1">
            <a
              href="https://github.com/tylercamp/palcalc"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Data source
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
