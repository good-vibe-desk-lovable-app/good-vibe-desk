# Phase 1 — Test safety net + worker pre-warm

Step 0 baseline: `npx vitest run` — 2 files, 11 tests, all green (output pasted in chat).

## What changes

### 1. package.json

- Add `"test": "vitest run"` to scripts.
- Add `fast-check` as a devDependency.

### 2. `src/lib/pathfinder/__tests__/audit-regressions.test.ts` (new)

Regression coverage for the collection-import hardening guarantees:

- Duplicate `instanceId` repair: two entries sharing `"DUP"` → 2 entries, unique ids, exactly one repair note; then `search(deps, 37, repaired, bothIds, { timeoutMs: 5000 })` returns `ok` with 2 covered sources (no step-count assertion).
- Entry cap: 700 valid entries → 500 out plus a note.
- Id length cap: 500-char id → regenerated id ≤ 64 chars plus a note.
- Unknown `palId` (999999) → parse returns `null`.
- Unknown passive dropped, entry survives with only the valid one.

The duplicate-repair case needs the real dataset-bound deps (real `resolveChild`, `SAME_SPECIES_ONLY`, name lookup), built inside the test from `@/data/palworld` so `search` stays dependency-injected.

### 3. `src/lib/pathfinder/__tests__/audit-properties.test.ts` (new, fast-check)

Randomised collections (2–6 entries, real pal ids, 0–4 real passive ids, unique instance ids), random target from `PALS`, random desiredSources subset, `timeoutMs: 2000`, ≥ 50 runs. Invariants: never throws; step indices sequential from 0; all parent/child ids exist in the dataset; no step breeds a leaf with itself (differing instanceIds); when `status === "ok"`, `coveredSources ⊆ desiredSources` and `missingSources` is empty; `elapsedMs <= 2600`.

### 4. `src/lib/pathfinder/index.ts`

Export `warmPathfinder(): void` — calls the existing `getWorker()` when `Worker` is defined, posts nothing. Shared-worker + requestId design untouched.

### 5. `src/routes/index.tsx`

Inside the existing hydration `useEffect`, after current work: guard on `typeof window !== "undefined"`, schedule `warmPathfinder()` via `requestIdleCallback` when available else `setTimeout(..., 0)`, and clear the handle on unmount. No state writes, so the runEpoch pattern is satisfied trivially.

## Risks

- Property tests over the real dataset can be slow; runs capped at 50 with small collections and a 2s search timeout. If wall-clock is excessive I will report rather than loosen invariants.
- Random targets may often be `impossible`/`partial` — invariants are written to hold for all statuses, not just `ok`.

## Verification

`npx vitest run` and `vite build`, both pasted verbatim. Any failure → FAILURE REPORT, no auto-fix.
