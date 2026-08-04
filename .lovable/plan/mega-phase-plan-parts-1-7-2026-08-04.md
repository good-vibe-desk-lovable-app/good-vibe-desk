# Mega-phase plan — Parts 1–7

Verified before planning:
- `palcalc db.json` fetches fine (299 Pals) and carries base Hp/Attack/Defense, walk/run/ride/transport speeds, stamina, food, rarity, size, `Nocturnal`, `MinWildLevel`/`MaxWildLevel`, and `WorkSuitability` on a 0–8 scale, plus top-level `Elements` (9), `ActiveSkills` (320) and `PassiveSkills` (1905) tables. It does **not** carry per-Pal elements, drop tables, spawn regions, learnsets or ranch drops.
- `paldb.cc/en/<InternalName>` returns real HTML (~88 KB, no challenge page) — e.g. `Anubis`, `Jormuntide_Ignis`. It is the source for the fields palcalc lacks.
- Current `src/data/palworld/pals.ts` has `elements: []` on every Pal, so elements are genuinely missing today.
- `src/data/palworld/index.ts` is cheap; `pairMaps.ts` is only imported by `/data-check`.

Ground rule for every part: no value is written unless it came from a fetch that actually succeeded. Anything not found is stored as `null`/absent, rendered as "unknown" in the UI, and listed in a data-gap log — never guessed.

## Part 1 — Missing data into the dataset

Fetch pipeline (dev-time scripts under `scripts/`, not shipped in the client bundle):
1. Download `db.json` + `breeding.json` once; cache raw under `scripts/.cache/`.
2. Fetch all 299 `paldb.cc/en/<internalName>` pages, throttled and resumable, saving raw HTML to `scripts/.cache/paldb/` so a parser bug never costs a re-fetch.
3. Parse into typed modules; join strictly on `internalName` → existing numeric `id`. Never on `palDexNo`.

New modules under `src/data/palworld/` (each a plain exported const array/record, no init-time computation):
- `elements.ts` — canonical nine + the effectiveness matrix (2.0/1.0/0.5) + per-Pal element list.
- `stats.ts` — base Hp/Attack/Defense, speeds, stamina, food, rarity, size, nocturnal, wild level range (from palcalc).
- `spawns.ts` — habitat regions, day/night, level range, alpha/boss flag, dungeon-only, and a `catchable` flag (Part 6).
- `drops.ts` — per-Pal drop tables and ranch drops by condense rank.
- `skills.ts` — active skill catalogue (element, power, cooldown) + per-Pal learnsets.
- `consumables.ts` if paldb yields it cleanly; otherwise skipped and logged.
- `dataGaps.ts` — machine-readable list of every field we could not source, surfaced on `/data-check`.

Level-80 stats: computed from base stats via the game's stat formula only if I can source the formula from palcalc/GameConstants. If not sourced, level-80 values are absent and Part 3 scores use base stats with that stated on screen.

Tests: 299 entries; every id resolves in `palById`; work levels integers 0–8; elements only the canonical nine; `Umihebi` vs `Umihebi_Fire` differ in elements (variant-merge guard).

## Part 2 — Real inheritance maths

- Rewrite `inheritance.ts` with the Appendix B constants: inherited-count weights {1:4,2:3,3:2,4:1}, random-add weights {0:4,1:3,2:2,3:1}, drawn from the **union** of parents' distinct passives, convolved, capped at 4. Probability of the desired subset landing is computed hypergeometrically, not curve-fitted. Header comment becomes a source citation.
- Fix the double-count bug in `core.ts`: `parentPassiveCount` becomes `popcount(a.mask | b.mask)`. This is the only behavioural change to `core.ts`; `search()` stays pure and dependency-injected.
- Remove the "provisional odds" footnote from `summary-card.tsx`.
- Existing property/regression tests stay untouched; new unit tests cover the distribution (weights sum to 1, monotonicity, cap at 4).

## Part 3 — `/tiers` computed tier lists

New route with four tabs (Overall · Base/Work · Raiding · Ranch). Scoring lives in a pure `src/lib/tiers/` module (testable, no React):
- Raid = normalised DPS (attack × best skill power/cooldown) + survivability (HP/defense) + element coverage from the matrix.
- Base = work-suitability spread and peak scaled by work speed.
- Ranch = farming level + drop value.
Sliders over preset weightings with live re-ranking; the formula and current weights are displayed; rows expand to show each component's raw and normalised value. S/A/B/C/D bands by percentile with the numeric score next to the band. All 299 listed, owned Pals marked, and a pinned "Your Pals" panel showing each owned Pal's global rank.

## Part 4 — Fast picker

Shared `PalPicker` / `PassivePicker` components replacing the current scroll lists:
A–Z jump rail, element chips, work-type chips, favourites and recently-used rows, virtualised list so 299 rows stay smooth, one-handed narrow-phone layout, text search present but optional. Passive picker adds category chips, a "passives my Pals already have" filter, tier filter, and shows which owned Pals carry each passive.

## Part 5 — Recommended breeds

New batch message type on the **existing shared worker** (one request, one `requestId`, streamed progress — no new workers, no 299 round trips). Runs the existing `search` against every breedable target with the user's collection, ranks by expected eggs, shows top 20 with chain length and which owned Pals are used. Cached by a hash of the collection; partial results returned if it runs long; the UI call sites follow the `runEpoch` guard pattern.

## Part 6 — Habitat / where to catch

Surfaces Part 1 spawn data: regions, day/night, level range, alpha variants. Prominent **"Breed only"** badge for uncatchable Pals; catchable / breed-only / dungeon filters wired into the Part 4 picker; in a chain result, any leaf Pal the user does not own is annotated with where to catch it or "must be bred".

## Part 7 — Community opinion tabs

Separate tab group, never blended with computed scores. Each card stores source name, URL, date, and a verbatim quote, in `src/data/community/opinions.ts` with a `sources.ts` registry. Sources gathered per Appendix A (guide sites direct, walled sites via the r.jina.ai ladder, Reddit `.json`, Steam guides, YouTube transcripts only — never inferred from titles). Challenge-page detection treats blocks as failures and escalates. Disagreements shown side by side; undated or pre-Feybreak entries badged "may be outdated".

## Constraint compliance

- `pairMaps.ts` keeps its single static import in `/data-check`; the reverse lookup keeps its dynamic `import()`.
- No new heavy module-init work in `index.ts` or anything the worker imports — new tables are static literals, and tier scoring is computed lazily on the `/tiers` route only.
- Shared worker + `requestId` correlation preserved; `runEpoch` guard on every new async state write.
- No network calls at runtime — all fetching happens in dev-time generation scripts; the app stays fully offline.

## Execution

Parts run in order. After each: `npx vitest run` + `vite build`, commit if green, one-line progress note. Part 1 gates the rest. Errors get up to 3 diagnostic attempts, then UNRESOLVED and continue. Final report: verbatim test + build output, the three confirmations, files grouped by part, and a fix log.

## Risks worth naming up front

- 299 paldb.cc fetches are the long pole and the most likely place for partial data; anything unparsed is logged as a gap rather than filled in.
- Level-80 stats depend on sourcing the stat formula; if unsourced, Part 3 says so on screen instead of inventing numbers.
- Part 7 is bounded by what is actually quotable — expect a handful of well-cited cards, not exhaustive coverage.
