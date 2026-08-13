import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  PALS,
  UNIQUE_COMBOS,
  PASSIVES,
  SAME_SPECIES_ONLY,
  DATA_VERSION,
  resolveChild,
  palById,
} from "../data/palworld";
// Heavy full-pair tables — only this diagnostics route pays their init cost.
import { pairToChild, childToParents } from "../data/palworld/pairMaps";
import type { Pal } from "../data/palworld";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

export const Route = createFileRoute("/data-check")({
  head: () => ({
    meta: [
      { title: "Palworld Data Check — Breeding Pathfinder" },
      {
        name: "description",
        content:
          "Sanity-check page for the offline Palworld breeding dataset: totals, spot-checks, and per-Pal breakdown.",
      },
      { property: "og:title", content: "Palworld Data Check" },
      {
        property: "og:description",
        content:
          "Verify the Palworld breeding data layer: version, spot-checks, and per-Pal stats.",
      },
    ],
  }),
  component: DataCheckPage,
});

function findByName(name: string): Pal | undefined {
  return PALS.find((p) => p.name === name);
}

type Check = { label: string; pass: boolean; detail: string };

function computeChecks(): Check[] {
  const checks: Check[] = [];
  const named = (n: string) => findByName(n);

  // 1. Anubis + Cattiva -> whatever palcalc says (Vanwyrm), via "formula"
  {
    const a = named("Anubis");
    const b = named("Cattiva");
    if (a && b) {
      const r = resolveChild(a.id, b.id);
      const child = r ? (palById.get(r.childId)?.name ?? "?") : "null";
      checks.push({
        label: "Anubis + Cattiva resolves via the rank formula (palcalc says Vanwyrm)",
        pass: !!r && r.via === "formula" && child === "Vanwyrm",
        detail: `got ${child} via ${r?.via ?? "null"}`,
      });
    } else {
      checks.push({ label: "Anubis + Cattiva", pass: false, detail: "parents missing" });
    }
  }

  // 2. Relaxaurus + Sparkit -> Relaxaurus Lux via "unique"
  {
    const a = named("Relaxaurus");
    const b = named("Sparkit");
    const target = named("Relaxaurus Lux");
    if (a && b && target) {
      const r = resolveChild(a.id, b.id);
      checks.push({
        label: 'Relaxaurus + Sparkit -> Relaxaurus Lux (via "unique")',
        pass: !!r && r.via === "unique" && r.childId === target.id,
        detail: `got ${r ? palById.get(r.childId)?.name : "null"} via ${r?.via ?? "null"}`,
      });
    } else {
      checks.push({ label: "Relaxaurus + Sparkit", pass: false, detail: "parents/child missing" });
    }
  }

  // 3. Jetragon + Jetragon -> Jetragon via "same-species"
  {
    const a = named("Jetragon");
    if (a) {
      const r = resolveChild(a.id, a.id);
      checks.push({
        label: 'Jetragon + Jetragon -> Jetragon (via "same-species")',
        pass: !!r && r.via === "same-species" && r.childId === a.id,
        detail: `got ${r ? palById.get(r.childId)?.name : "null"} via ${r?.via ?? "null"}`,
      });
    } else {
      checks.push({ label: "Jetragon self-pair", pass: false, detail: "Jetragon missing" });
    }
  }

  // 4. Jetragon + Cattiva does NOT resolve to Jetragon
  {
    const a = named("Jetragon");
    const b = named("Cattiva");
    if (a && b) {
      const r = resolveChild(a.id, b.id);
      checks.push({
        label: "Jetragon + Cattiva does NOT resolve to Jetragon",
        pass: !!r && r.childId !== a.id,
        detail: `got ${r ? palById.get(r.childId)?.name : "null"} via ${r?.via ?? "null"}`,
      });
    } else {
      checks.push({ label: "Jetragon + Cattiva", pass: false, detail: "parents missing" });
    }
  }

  // 5. every SAME_SPECIES_ONLY id has exactly one childToParents entry and it is (self,self)
  {
    let allOk = true;
    let firstFail = "";
    for (const id of SAME_SPECIES_ONLY) {
      const list = childToParents.get(id) ?? [];
      const ok = list.length === 1 && list[0][0] === id && list[0][1] === id;
      if (!ok) {
        allOk = false;
        firstFail = `id ${id} (${palById.get(id)?.name}) has ${list.length} pairs`;
        break;
      }
    }
    checks.push({
      label: "Every SAME_SPECIES_ONLY Pal has exactly one producing pair, and it is (self, self)",
      pass: allOk,
      detail: allOk ? `${SAME_SPECIES_ONLY.size} Pals verified` : firstFail,
    });
  }

  return checks;
}

function DataCheckPage() {
  const [query, setQuery] = useState("");

  const checks = useMemo(computeChecks, []);
  const totals = useMemo(() => {
    const asParentCounts = new Map<number, number>();
    for (const key of pairToChild.keys()) {
      const sep = key.includes("->") ? "->" : ":";
      const [a, b] = key.split(sep).map(Number);
      asParentCounts.set(a, (asParentCounts.get(a) ?? 0) + 1);
      if (a !== b) asParentCounts.set(b, (asParentCounts.get(b) ?? 0) + 1);
    }
    return {
      pals: PALS.length,
      uniqueCombos: UNIQUE_COMBOS.length,
      pairs: pairToChild.size,
      passives: PASSIVES.length,
      asParentCounts,
    };
  }, []);

  const spotRows = ["Anubis", "Jetragon", "Frostallion"]
    .map((n) => PALS.find((p) => p.name === n))
    .filter((p): p is Pal => !!p);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PALS.slice(0, 200);
    return PALS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.internalName.toLowerCase().includes(q) ||
        String(p.id).includes(q) ||
        String(p.palDexNo).includes(q),
    ).slice(0, 400);
  }, [query]);

  const renderRow = (p: Pal) => {
    const asChild = (childToParents.get(p.id) ?? []).length;
    const asParent = totals.asParentCounts.get(p.id) ?? 0;
    return (
      <TableRow key={p.id}>
        <TableCell className="font-mono">{p.id}</TableCell>
        <TableCell>
          <div className="font-medium">{p.name}</div>
          <div className="text-xs text-muted-foreground">
            #{p.palDexNo} {p.isVariant ? "· variant" : ""}
          </div>
        </TableCell>
        <TableCell>
          {p.elements.length ? (
            p.elements.map((e) => (
              <Badge key={e} variant="secondary" className="mr-1">
                {e}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell>
          <Badge variant="outline">{p.eggType}</Badge>
        </TableCell>
        <TableCell>
          <Badge variant="outline">{p.eggSize}</Badge>
        </TableCell>
        <TableCell className="font-mono">{p.combiRank}</TableCell>
        <TableCell>
          {p.breedingEligible ? <Badge>eligible</Badge> : <Badge variant="destructive">no</Badge>}
        </TableCell>
        <TableCell className="font-mono">{asChild}</TableCell>
        <TableCell className="font-mono">{asParent}</TableCell>
      </TableRow>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Palworld Breeding — Data Check</h1>
          <p className="text-sm text-muted-foreground">
            Offline dataset sanity page. No app UI is wired to this yet.
          </p>
        </header>

        <section className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Dataset version</h2>
          <dl className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Data version</dt>
              <dd>{DATA_VERSION.dataVersion}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Game version targeted</dt>
              <dd>{DATA_VERSION.gameVersionTargeted}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Sourced at</dt>
              <dd>{DATA_VERSION.sourcedAt}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Upstream dataset</dt>
              <dd>{DATA_VERSION.upstreamDatasetVersion}</dd>
            </div>
          </dl>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {DATA_VERSION.gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </section>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Total Pals", value: totals.pals },
            { label: "Unique combos", value: totals.uniqueCombos },
            { label: "Generated pairs", value: totals.pairs },
            { label: "Passives", value: totals.passives },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border p-4">
              <div className="text-xs uppercase text-muted-foreground">{s.label}</div>
              <div className="mt-1 text-2xl font-semibold">{s.value.toLocaleString()}</div>
            </div>
          ))}
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Formula spot-checks</h2>
          <ul className="mt-3 space-y-2">
            {checks.map((c, i) => (
              <li key={i} className="flex items-start justify-between gap-4 rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">
                    {i + 1}. {c.label}
                  </div>
                  <div className="text-xs text-muted-foreground">{c.detail}</div>
                </div>
                <Badge variant={c.pass ? "default" : "destructive"}>
                  {c.pass ? "pass" : "fail"}
                </Badge>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Fixed spot-check rows</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>id</TableHead>
                <TableHead>name</TableHead>
                <TableHead>elements</TableHead>
                <TableHead>eggType</TableHead>
                <TableHead>eggSize</TableHead>
                <TableHead>combiRank</TableHead>
                <TableHead>breedingEligible</TableHead>
                <TableHead># as child</TableHead>
                <TableHead># as parent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{spotRows.map(renderRow)}</TableBody>
          </Table>
        </section>

        <section className="rounded-lg border p-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Pal table</h2>
            <Input
              placeholder="Search by name, id, or internal name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Showing {filtered.length} of {PALS.length}.
          </p>
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>id</TableHead>
                  <TableHead>name</TableHead>
                  <TableHead>elements</TableHead>
                  <TableHead>eggType</TableHead>
                  <TableHead>eggSize</TableHead>
                  <TableHead>combiRank</TableHead>
                  <TableHead>eligible</TableHead>
                  <TableHead># as child</TableHead>
                  <TableHead># as parent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{filtered.map(renderRow)}</TableBody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  );
}
