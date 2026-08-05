# Continuation — Parts 2.5 through 7

Parts 1 and 2 stay untouched. Everything below runs in one pass, verifying with  
`npx vitest run` + `vite build` after each part.

## Part 2.5 — Carried-over fixes

- **2.5a** Add one muted line beside the egg estimate in the results summary:  
the figure is a lower bound and long chains cost more in practice.
- **2.5b** Add a modelling-limitation entry to `dataGaps.ts`: the parent-pool  
union uses `mask` (desired passives only) against `passiveCount` (all  
passives), so parents sharing a non-desired passive are double-counted.  
Documented, not fixed.
- **2.5c** Classify the 67 Pals with no field spawner from the cached paldb  
pages plus `SAME_SPECIES_ONLY`: breed-only / dungeon-only / boss-or-raid /  
unknown. Only positive evidence earns `isBreedOnly`; anything else becomes  
"acquisition unknown" and is logged. Counts reported in the summary.

## Part 3 — `/tiers` route

New route with tabs Overall / Base-Work / Raiding / Ranch, built on  
`src/lib/tiers.ts` (extended, kept pure and unit-tested).

- Preset weights plus sliders, debounced and memoised re-ranking.
- Formula and current weights shown on screen; each row expands to raw and  
normalised component values.
- S/A/B/C/D bands by percentile with the numeric score alongside.
- All 299 listed, owned Pals marked, plus a pinned "Your Pals" panel showing  
each owned Pal's global rank number.
- Pals missing a stat the score depends on render as **unranked — insufficient**  
**data** with a tooltip naming the missing field; never scored as zero.
- A note stating which stat basis the page uses (base vs level-80).

## Part 4 — Fast pickers

- **Pal picker** (`src/components/pbp/pal-picker.tsx`), replacing the list in  
`target-panel.tsx`: A–Z jump rail, nine element chips, work-type chips,  
favourites row, recently-used row (last 10, localStorage), acquisition  
filters from Part 6 data, virtualised rows, one-handed narrow-phone layout,  
optional text search.
- **Passive picker**: category chips (Combat / Work / Movement / Other, derived  
from existing descriptions; uncertain goes to Other), "passives my Pals  
already have" filter, tier chips, and inline display of which owned Pals  
carry each passive.

## Part 5 — Recommended breeds

Batch search over every breedable target ranked by expected eggs, top 20 with  
target, expected eggs, chain length and owned Pals used.

- New batch message type on the **existing shared worker**, one `requestId`,  
streamed progress. No new workers.
- Results cached by a hash of the collection; invalidated through the existing  
`runEpoch` guard pattern.
- Progress UI; partial ranked results returned past ~10s.

## Part 6 — Habitat / where to catch

- Pal detail view surfaces regions, day/night windows, level range, alphas.
- "Breed only" badge only where 2.5c confirmed it; otherwise "acquisition  
unknown".
- Acquisition filters wired into the Part 4 picker.
- Chain results annotate every leaf Pal the user does not own with where to  
catch it, or "must be bred".

## Part 7 — Community opinion tabs

Researched cards in their own tab group, never blended into computed scores.  
Direct fetch for open guide sites, `r.jina.ai` for walled ones, `.json` /  
old.reddit for Reddit, Steam guides, YouTube transcripts only. Challenge pages  
(`Just a moment...`, `cf_chl_opt`, `challenges.cloudflare.com`, sub-2 KB  
boilerplate) are treated as blocks and escalated, never parsed. Each card  
carries source name, URL, date and a verbatim quote; conflicting sources appear  
side by side under "Sources disagree"; undated or pre-Feybreak sources get a  
"may be outdated" badge. Expect a handful of well-cited cards.

## Technical notes

- `pairMaps.ts` stays dynamically imported; no new static import.
- Shared worker and `runEpoch` guards preserved; batch search extends the  
existing protocol rather than adding a worker.
- No invented game values: unsourced fields render "unknown" and land in  
`dataGaps.ts`.
- New pure logic (tier scoring, passive categorisation, acquisition  
classification, batch ranking) gets vitest coverage alongside the existing  
regression and property suites.

## Reporting at the end

Verbatim `vitest` and `vite build` output, the 2.5c breakdown, files grouped by  
part, a fix log with root cause and classification per error, and the four  
explicit confirmations requested.

Approved. Switching to build mode. Execute Parts 2.5 through 7 in one

continuous pass — do not stop between parts. Then paste both verification

outputs verbatim with the full report.