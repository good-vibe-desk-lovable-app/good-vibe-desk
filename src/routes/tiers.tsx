import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Info, Trophy } from "lucide-react";

import {
  CONDENSE_TABLE,
  OVERALL_FORMULA,
  RAID_FORMULA,
  RANCH_FORMULA,
  RANCH_NOTE,
  STAT_BASIS,
  WORK_FORMULA,
  WORK_TYPES,
  bandForRank,
  overallTier,
  raidTier,
  ranchTier,
  workTier,
  type TierResult,
} from "@/lib/tiers";

import { loadCollection } from "@/lib/collection";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TITLE = "Palworld Tier Lists — Computed From Game Data";
const DESCRIPTION =
  "Raid, base work and ranch tier lists computed from Palworld's own stat and work-suitability data, with the formula and every weight shown on screen.";
const SITE = "https://good-vibe-desk.lovable.app/tiers";

export const Route = createFileRoute("/tiers")({
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
  component: TiersPage,
});

/** Debounced mirror of a value so slider drags don't re-rank 299 Pals per frame. */
function useDebounced<T>(value: T, ms = 150): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

const BAND_CLASS: Record<string, string> = {
  S: "bg-warning/20 text-warning border-warning/50",
  A: "bg-primary/20 text-primary border-primary/50",
  B: "bg-success/15 text-success border-success/40",
  C: "bg-muted text-muted-foreground border-border",
  D: "bg-background text-muted-foreground border-border",
};

function WeightSlider({
  label,
  value,
  onChange,
  max = 4,
  step = 0.1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
  step?: number;
}) {
  return (
    <label className="block space-y-1">
      <span className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums text-foreground">{value.toFixed(1)}</span>
      </span>
      <Slider
        value={[value]}
        min={0}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v ?? 0)}
        aria-label={label}
      />
    </label>
  );
}

function TierTable({
  result,
  owned,
  formula,
  weights,
}: {
  result: TierResult;
  owned: Set<number>;
  formula: string;
  weights: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const total = result.ranked.length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/70 bg-background/40 p-3 text-xs text-muted-foreground">
        <p className="flex gap-2">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>
            <strong className="text-foreground">Formula:</strong> <code>{formula}</code>
            <br />
            <strong className="text-foreground">Current weights:</strong> {weights}
            <br />
            {STAT_BASIS}
          </span>
        </p>
      </div>

      <YourPals result={result} owned={owned} />

      <ul className="divide-y divide-border/60 rounded-xl border border-border/70">
        {result.ranked.map((row) => {
          const band = bandForRank(row.rank, total);
          const isOpen = open === row.pal.id;
          return (
            <li key={row.pal.id}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : row.pal.id)}
                aria-expanded={isOpen}
                className="hover:bg-accent/40 flex w-full items-center gap-3 px-3 py-2 text-left text-sm"
              >
                <span className="w-10 shrink-0 tabular-nums text-xs text-muted-foreground">
                  #{row.rank}
                </span>
                <span
                  className={cn(
                    "w-6 shrink-0 rounded border text-center text-xs font-bold",
                    BAND_CLASS[band],
                  )}
                >
                  {band}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{row.pal.name}</span>
                {owned.has(row.pal.id) ? (
                  <Badge variant="secondary" className="text-[10px]">
                    owned
                  </Badge>
                ) : null}
                <span className="w-14 shrink-0 text-right tabular-nums text-xs">
                  {row.score.toFixed(1)}
                </span>
                <ChevronDown
                  className={cn("size-4 shrink-0 transition-transform", isOpen && "rotate-180")}
                />
              </button>
              {isOpen ? (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border/60 bg-background/40 px-3 py-2 text-xs sm:grid-cols-4">
                  {Object.entries(row.detail).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="tabular-nums">{v.toFixed(1)}</dd>
                    </div>
                  ))}
                  <div>
                    <dt className="text-muted-foreground">Normalised score</dt>
                    <dd className="tabular-nums">{row.score.toFixed(2)} / 100</dd>
                  </div>
                </dl>
              ) : null}
            </li>
          );
        })}
      </ul>

      {result.unranked.length > 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 p-3 text-xs">
          <p className="mb-2 font-medium">
            Unranked — insufficient data ({result.unranked.length})
          </p>
          <ul className="flex flex-wrap gap-1">
            {result.unranked.map((u) => (
              <li key={u.pal.id}>
                <Badge
                  variant="outline"
                  className="text-[10px]"
                  title={`Missing: ${u.missing.join(", ")}`}
                >
                  {u.pal.name} — missing {u.missing.join(", ")}
                </Badge>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-muted-foreground">
            These are not scored zero. The data for a field the formula needs is absent, so no
            honest score exists.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function YourPals({ result, owned }: { result: TierResult; owned: Set<number> }) {
  const total = result.ranked.length;
  const mine = result.ranked.filter((r) => owned.has(r.pal.id));
  const mineUnranked = result.unranked.filter((u) => owned.has(u.pal.id));
  if (owned.size === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
        Add Pals on the{" "}
        <Link to="/" className="underline underline-offset-4">
          pathfinder page
        </Link>{" "}
        and they'll show up here with their global rank.
      </p>
    );
  }
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-3">
      <p className="mb-2 text-xs font-semibold">Your Pals in this ranking</p>
      <ul className="flex flex-wrap gap-2 text-xs">
        {mine.map((r) => (
          <li
            key={r.pal.id}
            className="rounded-lg border border-border/70 bg-background/60 px-2 py-1 tabular-nums"
          >
            <strong>#{r.rank}</strong> {r.pal.name}{" "}
            <span className="text-muted-foreground">
              {r.score.toFixed(1)} · {bandForRank(r.rank, total)}
            </span>
          </li>
        ))}
        {mineUnranked.map((u) => (
          <li
            key={u.pal.id}
            className="rounded-lg border border-dashed border-border/70 px-2 py-1"
            title={`Missing: ${u.missing.join(", ")}`}
          >
            {u.pal.name} <span className="text-muted-foreground">— insufficient data</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TiersPage() {
  const [owned, setOwned] = useState<Set<number>>(new Set());
  useEffect(() => {
    setOwned(new Set(loadCollection().map((e) => e.palId)));
  }, []);

  const [raidW, setRaidW] = useState({ attack: 1, health: 1, defense: 0.5, skill: 1 });
  const [speedW, setSpeedW] = useState(0.5);
  const [works, setWorks] = useState<string[]>([]);
  const [overallW, setOverallW] = useState({ combat: 1, work: 1 });

  const dRaid = useDebounced(raidW);
  const dSpeed = useDebounced(speedW);
  const dWorks = useDebounced(works);
  const dOverall = useDebounced(overallW);

  const raid = useMemo(() => raidTier(dRaid), [dRaid]);
  const work = useMemo(() => workTier(dWorks, dSpeed), [dWorks, dSpeed]);
  const ranch = useMemo(() => ranchTier(), []);
  const overall = useMemo(() => overallTier(dOverall, raid, work), [dOverall, raid, work]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <Link to="/" className="text-xs text-muted-foreground underline underline-offset-4">
          ← Breeding pathfinder
        </Link>
        <h1 className="mt-3 flex items-center gap-2 text-3xl font-bold">
          <Trophy className="size-6 text-warning" /> Computed tier lists
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nothing here is hand-placed. Every position comes from the game's own stat and work
          suitability data through the formula shown on each tab — move the sliders and the ranking
          moves with them.
        </p>
      </header>

      <Tabs defaultValue="overall">
        <TabsList className="w-full">
          <TabsTrigger value="overall">Overall</TabsTrigger>
          <TabsTrigger value="work">Base/Work</TabsTrigger>
          <TabsTrigger value="raid">Raiding</TabsTrigger>
          <TabsTrigger value="ranch">Ranch</TabsTrigger>
        </TabsList>

        <TabsContent value="overall" className="space-y-4 pt-4">
          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base">Weights</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <WeightSlider
                label="Combat"
                value={overallW.combat}
                onChange={(v) => setOverallW((w) => ({ ...w, combat: v }))}
                max={2}
              />
              <WeightSlider
                label="Base work"
                value={overallW.work}
                onChange={(v) => setOverallW((w) => ({ ...w, work: v }))}
                max={2}
              />
            </CardContent>
          </Card>
          <TierTable
            result={overall}
            owned={owned}
            formula={OVERALL_FORMULA}
            weights={`Wc=${dOverall.combat.toFixed(1)}, Wb=${dOverall.work.toFixed(1)}`}
          />
        </TabsContent>

        <TabsContent value="work" className="space-y-4 pt-4">
          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base">Jobs and weights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1">
                {WORK_TYPES.map((w) => {
                  const on = works.includes(w);
                  return (
                    <Button
                      key={w}
                      size="sm"
                      variant={on ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() =>
                        setWorks((prev) => (on ? prev.filter((x) => x !== w) : [...prev, w]))
                      }
                    >
                      {w}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {works.length === 0 ? "No job selected — scoring across all twelve." : null}
              </p>
              <WeightSlider label="Work speed weight" value={speedW} onChange={setSpeedW} max={2} />
            </CardContent>
          </Card>
          <TierTable
            result={work}
            owned={owned}
            formula={WORK_FORMULA}
            weights={`jobs=${dWorks.length ? dWorks.join(", ") : "all"}, Ws=${dSpeed.toFixed(1)}`}
          />
        </TabsContent>

        <TabsContent value="raid" className="space-y-4 pt-4">
          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base">Weights</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <WeightSlider
                label="Attack"
                value={raidW.attack}
                onChange={(v) => setRaidW((w) => ({ ...w, attack: v }))}
              />
              <WeightSlider
                label="Health"
                value={raidW.health}
                onChange={(v) => setRaidW((w) => ({ ...w, health: v }))}
              />
              <WeightSlider
                label="Defense"
                value={raidW.defense}
                onChange={(v) => setRaidW((w) => ({ ...w, defense: v }))}
              />
              <WeightSlider
                label="Best skill power"
                value={raidW.skill}
                onChange={(v) => setRaidW((w) => ({ ...w, skill: v }))}
              />
            </CardContent>
          </Card>
          <TierTable
            result={raid}
            owned={owned}
            formula={RAID_FORMULA}
            weights={`Wa=${dRaid.attack.toFixed(1)}, Wh=${dRaid.health.toFixed(1)}, Wd=${dRaid.defense.toFixed(1)}, Ws=${dRaid.skill.toFixed(1)}`}
          />
        </TabsContent>

        <TabsContent value="ranch" className="space-y-4 pt-4">
          <div className="rounded-xl border border-border/70 bg-background/40 p-3 text-xs text-muted-foreground">
            <p className="flex gap-2">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {RANCH_NOTE}
                <br />
                Condensation: rank 0–4 (4 stars), {CONDENSE_TABLE[4].cumulative} sacrifices total at
                rank 4 — {CONDENSE_TABLE[4].bonus}, {CONDENSE_TABLE[4].suitability}.
              </span>
            </p>
          </div>
          <TierTable
            result={ranch}
            owned={owned}
            formula={RANCH_FORMULA}
            weights="fixed — Farming suitability dominates, work speed breaks ties"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
