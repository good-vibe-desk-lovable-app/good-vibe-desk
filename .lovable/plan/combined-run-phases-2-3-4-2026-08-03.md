# Combined run — Phases 2, 3, 4

Executed strictly in order. After each phase: `npx vitest run` + `vite build`, both outputs pasted verbatim, one-line progress note. Any failure stops the run immediately with the FAILURE REPORT block; later phases are not started. Phase 5 (palcalc constants) is out of scope — the PROVISIONAL table and footnote stay exactly as written.

## Phase 2 — expected-eggs cost model

**New** `src/lib/pathfinder/inheritance.ts` — pure module with the verbatim PROVISIONAL header comment, `PASSIVE_INHERIT_TABLE` (base by desiredCount `{0:1.0, 1:0.45, 2:0.25, 3:0.12, 4:0.06}`), `stepSuccessProbability` (base × `0.9^max(0, parentPassiveCount − desiredCount)`, floored at 0.005; desiredCount 0 → 1) and `expectedAttempts` (`1/p`, capped at 200).

**Heap design (as requested):** a flat array-backed binary min-heap of states, ordered lexicographically by `(expectedEggs, depth)`. `push` appends and sifts up; `pop` swaps in the last element and sifts down. Because costs are floats, the old integer bucket array can no longer index by cost, so the heap replaces `buckets` entirely; the outer `for cost` loop becomes a `while (heap.size)` loop. Stale entries are handled the same way the bucket loop did — a popped state whose key no longer maps to itself in `best` is skipped, so no decrease-key operation is needed. The timeout check and the settled-partner/carrier bookkeeping move into that loop unchanged.

`core.ts` **changes:** each `State` gains `expectedEggs`, `depth`, `passiveCount` (leaves = entry `passiveIds.length`; bred children = popcount of their mask). Combine cost = `a.expectedEggs + b.expectedEggs + expectedAttempts({ parentPassiveCount: a.passiveCount + b.passiveCount, desiredCount: popcount(childMask) })`; `depth = max(a.depth, b.depth) + 1` and `maxDepth` still bounds depth. Preserved unchanged: dedup key semantics, same-species-only guard, instanceId self-breeding guard, gender logic/warnings, `forbidFinalPair`, partial tracking, timeout self-termination, `search(deps, ...)` signature, purity/DI.

`types.ts`**:** additive only — `Step.expectedAttempts: number`, `Result.totalExpectedEggs: number`. Reconstruction fills both.

**Display (Part C only):** summary card shows `~N total eggs expected`; each step row shows `~k tries`; one muted line "Egg estimates use provisional inheritance odds."

**Tests:** new inheritance unit tests (monotonic in both args, bounds, `expectedAttempts(0) === 1`). Phase-1 suites untouched.

Files: `src/lib/pathfinder/inheritance.ts` (new), `core.ts`, `types.ts`, `__tests__/inheritance.test.ts` (new), `summary-card.tsx`, `results-panel.tsx`.

## Phase 3 — hatch-time totals + PWA

**Part A:** in `summary-card.tsx`, sum `HATCH_HOURS[eggSize]` per step child species, multiplied by that step's `expectedAttempts` (Phase 2 field), rendered as `Total hatch time: ~X–Yh` with a days figure when the upper bound ≥ 48h, labelled "incubation across expected retries". Display only.

**Part B (PWA, per the PWA skill):** add `vite-plugin-pwa` with `registerType: "autoUpdate"`, `injectRegister: null`, `devOptions: { enabled: false }`, `/sw.js` filename, manifest (name "Palworld Breeding Pathfinder", short_name "PalBreed", standalone, dark theme/background from existing tokens), generated maskable 192/512 egg-glyph icons in `public/`, precache of the built app shell and assets, `NetworkFirst` navigations with fallback to `/`, no custom fetch handlers around worker/module requests. Registration lives in one guarded client-only wrapper module imported from the root route: it refuses to register in dev, in an iframe, on Lovable preview hosts, or with `?sw=off`, and unregisters stale `/sw.js` in those cases. The plugin is passed through `defineConfig({ vite: { plugins: [...] } })` in `vite.config.ts`.

Risk noted: the Lovable config wrapper owns the plugin list. If the plugin cannot be added cleanly there, that is a build failure and the run stops with a report rather than being worked around.

Files: `vite.config.ts`, `package.json`, `public/` icons, `src/routes/__root.tsx` (head tags + registration import), new `src/lib/pwa.ts`, `summary-card.tsx`. No changes under `src/lib/pathfinder/` or `src/data/palworld/`.

## Phase 4 — share links + reverse lookup

**Part A:** add `lz-string`. New `src/lib/share.ts` with `encodeShareState` / `decodeShareState` over `compressToEncodedURIComponent`, `ShareState = { v: 1; targetId; entries; selections }` carrying only entries referenced by selections. Share button on the results panel builds `${location.origin}/#s=<encoded>` and copies via `navigator.clipboard.writeText` in try/catch with a fallback message plus toast. On hydration, a `#s=` hash is decoded and the entries are re-validated through `parseCollectionFileDetailed({ version: 1, entries })` exactly like a file import (share links are untrusted); a confirm dialog gates applying it, applying bumps `runEpoch`, then the hash is cleared. Decode/parse failure is a silent no-op plus one muted toast.

**Part B:** second mode in the breeding-power tool — pick a child species, list producing parent pairs from `childToParents`, loaded by DYNAMIC `import("@/data/palworld/pairMaps")` on first activation with an inline loading state and the module cached in a ref. No static import is added anywhere (Knowledge constraint 1). Pairs grouped unique → same-species → formula, capped at 60 rows with a "show all" expander.

**Tests:** share round-trip encode→decode equals input; decode of garbage returns null.

Files: `package.json`, `src/lib/share.ts` (new), `src/routes/index.tsx`, `results-panel.tsx`, `breeding-power-tool.tsx`, `__tests__/share.test.ts` (new).

## Final report

Both command outputs verbatim, files listed per phase, and explicit confirmation of the two required statements about pairMaps and the PROVISIONAL comment/footnote.

Additionally: Proceed with that plan. Execute the phases in order with the checkpoint after each one.

&nbsp;

## AMENDMENT — autonomous error recovery (replaces the stop-on-failure rule)

&nbsp;

When a test fails, the build fails, or the preview errors: diagnose it, fix it, re-run `npx vitest run` and `vite build` to verify, and CONTINUE to the next phase. Do not stop to ask me. Keep going until all three phases are complete.

&nbsp;

### Retry limits

- Max 3 fix attempts per distinct error. If attempt 3 fails, revert your changes for that specific item, mark it UNRESOLVED in the log, and continue with the rest of the phase.

- If a whole phase cannot be completed, mark it INCOMPLETE, leave the previous phase's committed work intact, and move to the next phase only if it does not depend on the incomplete work. Phase 3's hatch-time part and Phase 4 both depend on Phase 2's `expectedAttempts` field — if Phase 2 is INCOMPLETE, stop entirely.

&nbsp;

### FORBIDDEN fixes — never do these to make something pass

1. Do not delete, skip, comment out, or `.only`/`.skip` any test.

2. Do not weaken a property-test invariant, reduce `numRuns`, or narrow a generator's range to dodge a counterexample.

3. Do not loosen an assertion (e.g. changing `toBe` to `toBeGreaterThan`, widening a timeout bound) unless the assertion is provably wrong about intended behaviour — and if you do, log it as a BEHAVIOUR DECISION with your reasoning.

4. Do not change behaviour in `core.ts`, `collection.ts`, or `pathfinder/index.ts` purely to satisfy a test. If a test and the implementation disagree, decide which is authoritative by what the code is FOR (e.g. step indices are 1-based because they render to users as "Step 1"), fix the wrong side, and log it as a BEHAVIOUR DECISION.

5. Do not violate any of the ten Knowledge constraints. If a fix seems to require it, that fix is wrong — find another or mark UNRESOLVED.

6. Do not add, remove, or substitute dependencies beyond those named in the plan.

7. Do not modify the PROVISIONAL inheritance values, its header comment, or the user-facing footnote.

&nbsp;

### Required output at the end

After all phases, paste verbatim: final `npx vitest run` output, final `vite build` output. Then a FIX LOG with one entry per error encountered:

&nbsp;

```

FIX #n

Phase: <2 | 3 | 4>

Error (verbatim, first 5 lines): <...>

Root cause: <one or two sentences>

Which side was wrong: <test | implementation | config | dependency>

Fix applied: <file + what changed, with the before/after lines>

Attempts used: <1-3>

Verified by: <which test/command now passes>

Classification: <MECHANICAL | BEHAVIOUR DECISION | UNRESOLVED>

```

&nbsp;

Then a summary table: total errors, resolved, unresolved, behaviour decisions. List every file changed grouped by phase. Confirm explicitly, in these words: "pairMaps is imported dynamically; no new static import was added" and "the PROVISIONAL inheritance comment and footnote are still present." Finally, list anything you were unsure about or that a reviewer should double-check.
