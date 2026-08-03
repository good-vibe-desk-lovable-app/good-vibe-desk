# Combined run — Phases 2, 3, 4

Executed strictly in order. After each phase: `npx vitest run` + `vite build`, both outputs pasted verbatim, one-line progress note. Any failure stops the run immediately with the FAILURE REPORT block; later phases are not started. Phase 5 (palcalc constants) is out of scope — the PROVISIONAL table and footnote stay exactly as written.

## Phase 2 — expected-eggs cost model

**New `src/lib/pathfinder/inheritance.ts`** — pure module with the verbatim PROVISIONAL header comment, `PASSIVE_INHERIT_TABLE` (base by desiredCount `{0:1.0, 1:0.45, 2:0.25, 3:0.12, 4:0.06}`), `stepSuccessProbability` (base × `0.9^max(0, parentPassiveCount − desiredCount)`, floored at 0.005; desiredCount 0 → 1) and `expectedAttempts` (`1/p`, capped at 200).

**Heap design (as requested):** a flat array-backed binary min-heap of states, ordered lexicographically by `(expectedEggs, depth)`. `push` appends and sifts up; `pop` swaps in the last element and sifts down. Because costs are floats, the old integer bucket array can no longer index by cost, so the heap replaces `buckets` entirely; the outer `for cost` loop becomes a `while (heap.size)` loop. Stale entries are handled the same way the bucket loop did — a popped state whose key no longer maps to itself in `best` is skipped, so no decrease-key operation is needed. The timeout check and the settled-partner/carrier bookkeeping move into that loop unchanged.

**`core.ts` changes:** each `State` gains `expectedEggs`, `depth`, `passiveCount` (leaves = entry `passiveIds.length`; bred children = popcount of their mask). Combine cost = `a.expectedEggs + b.expectedEggs + expectedAttempts({ parentPassiveCount: a.passiveCount + b.passiveCount, desiredCount: popcount(childMask) })`; `depth = max(a.depth, b.depth) + 1` and `maxDepth` still bounds depth. Preserved unchanged: dedup key semantics, same-species-only guard, instanceId self-breeding guard, gender logic/warnings, `forbidFinalPair`, partial tracking, timeout self-termination, `search(deps, ...)` signature, purity/DI.

**`types.ts`:** additive only — `Step.expectedAttempts: number`, `Result.totalExpectedEggs: number`. Reconstruction fills both.

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
