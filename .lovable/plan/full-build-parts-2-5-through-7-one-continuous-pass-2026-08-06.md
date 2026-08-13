# Full build — Parts 2.5 through 7, one continuous pass

Parts 1 and 2 stay untouched. `src/lib/tiers.ts`, `pal-picker.tsx`, `habitat-card.tsx`,  
`recents.ts`, `passive-categories.ts`, `acquisition.ts`, `modelGaps.ts` and the worker-side  
batch handler already exist from the previous pass and get extended, not rewritten.

## Part 2.5 — data corrections

**2.5a Astralym (300th Pal).** Append `WorldTreeDragon` / "Astralym" to `pals.ts` with  
`breedingEligible: false`, `eggSize` XL→"Huge", elements `[]`, plus its level-80 range and  
base stats into `stats.ts` with all twelve work levels `0` marked _verified-absent_ (not  
missing). Self-only unique combo added to `uniqueCombos.ts`. The generator scripts get the  
same override so a regeneration doesn't drop it. Any test asserting 299 becomes 300.

**2.5b Work cap 8.** `tiers.ts` normalises base work levels against 8, not 10; the on-page  
formula text is updated to say so.

**2.5c Drop OilExtraction.** Removed from `WORK_TYPES`, from work scoring, and from the  
picker's work chips. Twelve types remain.

**2.5d Ranch relabel.** Ranch data is relabelled "partner skill level 1–5 (condensation  
rank 0–4)". The verified condensation table (4/8/12/24 sacrifices, cumulative 48, +5/10/15/20%)  
is shown as reference text. Ranch scoring uses quantity ranges only; per-item drop-rate  
percentages are logged `not-found` and never invented.

**2.5e Acquisition channels replace "breed only".** `acquisition.ts` gains a channel union  
(`wild_spawn | field_alpha | dungeon | tower_boss | raid_altar | raid_egg | meteor_event | quest_summon | sealed_realm | faction_base | pal_cage | fishing | unknown`) backed by a new  
hand-maintained `src/data/palworld/acquisitionChannels.ts` holding the fifteen resolved  
entries with source tier, requirement text, coordinates and notes verbatim from the brief.  
Everything else falls back to `wild_spawn` when habitat points exist, otherwise `unknown`.  
The "Breed only" concept is deleted from the codebase. `IgnoreCombi` Pals stay  
`breedingEligible: false`.

**2.5f / 2.5g.** Lower-bound egg note is already on the summary card — verified and kept.  
The dungeon-table under-count caveat and the incomplete-union note are logged in  
`dataGaps.ts` / `modelGaps.ts`. Union math is not changed.

## Part 3 — `/tiers`

Route exists. Work to do: normalise against 8, drop OilExtraction, relabel ranch, add  
Astralym handling (zero work by design → scored, not "insufficient data"), and confirm the  
stat-basis line, per-row component breakdown, S–D bands with numeric score, and the pinned  
"Your Pals" panel with global rank numbers. Unit tests for the new scoring in  
`src/lib/__tests__/tiers.test.ts`.

## Part 4 — pickers

Pal picker exists (A–Z rail, element chips, favourites, recents, virtualised). Adds:  
twelve work chips, acquisition-channel filter chips replacing the catchable/breed-only set.  
Passive picker gains category chips, tier chips, "passives my Pals already have", and inline  
owner names per passive.

## Part 5 — recommended breeds

Worker-side batch handler already exists. Adds the client half in  
`src/lib/pathfinder/index.ts` (`runBatchPathfinder`, shared worker, one `requestId`, streamed  
progress, collection-hash cache) and a `RecommendedPanel` on the home route guarded by  
`runEpoch`. Target list excludes every `breedingEligible: false` Pal. Top 20 by expected eggs  
with chain length and owned Pals used; partial ranked results past ~10s.

## Part 6 — acquisition UI

`habitat-card.tsx` shows the channel plus its requirement line ("Raid altar — needs Hartalis  
Slab", "Quest — 4 Echobones → Echoing Flute", "Meteor event — Astral Mountains"), day/night  
counts, areas, coordinates and guaranteed-capture notes (Panthalus at 1 HP). Unknown reads  
"acquisition unknown", never "not obtainable". Chain results annotate every leaf Pal the user  
does not own with how to get it.

## Part 7 — community opinion

New `/opinions` route plus a tab group, fed by a hand-written  
`src/data/community/opinions.ts`. Research runs through guide sites direct, `r.jina.ai` for  
walled sites, Reddit `.json`, Steam guides and YouTube transcripts only. Challenge pages  
(`Just a moment...`, `challenges.cloudflare.com`, `cf_chl_opt`, <2 KB) are treated as blocks  
and never parsed. Each card: source name, URL, date, verbatim quote. Conflicts render side by  
side under "Sources disagree". Undated/pre-Feybreak sources get a "may be outdated" badge.  
Opinion never touches computed scores. A handful of well-cited cards, not padding.

## Verification

`npx vitest run` + `vite build` after each part, outputs pasted verbatim in the final report,  
along with the roster count, the four required confirmations, files grouped by part, and the  
FIX LOG.

## Risks

- Astralym enters an auto-generated file; the generator override is the guard against a  
  future regeneration silently dropping it.
- Part 7 yield depends on what the ladder actually returns; blocked sources get logged as  
  inaccessible rather than filled in.
- Approved — execute all parts in one continuous pass. Two corrections first:

1. eggSize derivation. You wrote "eggSize XL→Huge". That reasoning is wrong even

   though the answer is right. Size (EPalSizeType::XL) is body size and is a

   DIFFERENT field from egg size. Egg size derives from RARITY: Normal = rarity

   0-4, Large = 5-7, Huge = 8+. Astralym's Rarity is 10, therefore Huge. Use the

   rarity rule and cite it, so the provenance is honest and the same rule applies

   to any Pal added later.

&nbsp;

2. Astralym scoring must be per-tab, not global. Its zero work suitabilities are

   verified-absent, so it is legitimately SCORED (and ranks last) on the Base/Work

   tab. But there is no active skill learnset and no partner skill for it in the

   brief, so raid DPS is UNCOMPUTABLE — on the Raiding tab it must show "unranked -

   insufficient data (no learnset)", not a zero. Same for Ranch: farming 0 is

   verified-absent, so it scores. Distinguish "verified zero" from "cannot compute"

   per tab, not once for the whole Pal.

&nbsp;

Also note its elements are [] (ElementType1/2: None per datamine) - so element

coverage is genuinely 0, not missing. Record that distinction too.

&nbsp;

Otherwise proceed exactly as planned. Build mode. Do not stop between parts.
