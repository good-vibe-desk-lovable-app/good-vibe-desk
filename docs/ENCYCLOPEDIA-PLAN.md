# PALWORLD ENCYCLOPEDIA — BUILD PLAN

Two tools, two jobs. Jules collects the data. Lovable builds the site over it.
Neither can do the other's half.

---

# PART 0 — WHY IT'S SPLIT

|                              | Jules        | Lovable      |
| ---------------------------- | ------------ | ------------ |
| Linux VM with shell          | ✅           | ❌           |
| Internet access for scraping | ✅           | ❌           |
| Runs Python / Node scripts   | ✅           | ❌           |
| Writes to GitHub             | ✅           | ✅           |
| Builds React UI fast         | ~            | ✅           |
| Free tier                    | 15 tasks/day | credit-based |

**Jules does every collection pass.** Lovable never scrapes — it reads JSON
files Jules committed and renders them.

---

# PART 1 — THE SOURCE HIERARCHY

Tier 1 beats tier 2 beats tier 3. Never average across tiers.

| Tier                    | Source                                                                               | Use for                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| **1 — datamined**       | PalCalc `db.json` (`github.com/tylercamp/palcalc`, generated from game `.pak` files) | Anything it covers: stats, work suitability, breeding, gender, elements |
| **2 — structured wiki** | paldb.cc — bounded page sections only                                                | Items, technology, missions, encounters, drops, learnsets               |
| **3 — open wiki**       | palworld.wiki.gg, game8, fandom                                                      | Corroboration; never sole source for a number                           |
| **4 — community**       | Reddit, calculators, guides, spreadsheets                                            | Labelled opinion only. Never a fact                                     |

**The dump you were given is tier 4 and mostly pre-1.0.** It cites v0.1.5.0 and
v0.2.0.6, says work suitability caps at 5 (it caps at 8), and gives variants
their own Paldeck numbers (they share their base's). Treat it as a **checklist of
topics to investigate**, never as data to import.

---

# PART 2 — THE RULES

Carried from the existing app. Each exists because something broke.

1. **Never invent a value.** Unsourced → recorded as a gap with a reason.
2. **Join on `internalName`**, never Paldeck number. 85 of 300 Pals are variants
   sharing a number with their base form.
3. **Every value carries** `{ value, source, sourceUrl, tier, fetchedAt }`.
4. **Every gap carries** `{ field, subject, reason, note }` with reason one of:
   `no-source`, `community-estimate-only`, `not-in-export`, `id-mismatch`,
   `conflicting-sources`, `needs-game-files`.
5. **Hard section contracts.** Every parser fails loudly if its source section is
   missing or renamed. paldb renamed "Habitat" to "Map" once and silently emptied
   138 records while every check stayed green.
6. **Coverage diff on every emission.** A record-count drop fails the run.
7. **Conflicts are recorded, not resolved.** Both values, neither accepted.
8. **One PR per pass.** Never stacked. Always a new branch off `main`.

---

# PART 3 — WHAT'S ALREADY DONE

Do not re-collect these. They exist, verified, in
`good-vibe-desk-lovable-app/good-vibe-desk`:

| Data                                                                | Where                                 | Source          |
| ------------------------------------------------------------------- | ------------------------------------- | --------------- |
| 300 Pals: stats, elements, work suitability, partner skills, gender | `src/data/palworld/`                  | PalCalc db.json |
| 44,851 breeding pairs, unique combos, same-species rules            | `pairMaps.ts`, `uniqueCombos.ts`      | PalCalc         |
| 115 passives, 307 active skills                                     | `passives.ts`, `skills.ts`            | paldb           |
| 588 technology unlocks                                              | `knowledgeTechnologies.ts`            | paldb           |
| 117 missions, 207 encounters, 65 field Alphas                       | `knowledge*.ts`                       | paldb           |
| 2,455 items, 3,779 production rows                                  | `knowledgeItems.ts`                   | paldb           |
| Drops, habitat, spawns                                              | `drops.ts`, `habitat.ts`, `spawns.ts` | paldb           |

**Already closed as unobtainable** — do not reopen without new evidence:
element multipliers, level-scaling formula, boss stat profiles, move damage,
mutation species selection, egg size and hatch time. All need game-file
extraction, which needs a PC with Palworld installed.

---

# PART 4 — THE COLLECTION PASSES

Each is one Jules task, one branch, one PR. Ordered by value.

## Pass A — Verify and version-stamp what exists

Before adding anything, confirm the current data is current.

- Re-fetch PalCalc `db.json`; compare against the committed dataset field by
  field; report every difference.
- Record the paldb version stamp and the PalCalc commit SHA in
  `src/data/palworld/version.ts`.
- Report the current Palworld version and every patch since 1.0.0 (10 July 2026)
  that touched Pals, breeding, passives, skills, work suitability or items.

**Output:** a report plus a version stamp. No data changes unless something moved.

## Pass B — Eggs

Not collected. Wanted: every egg type and size, the Pal pool per type × size,
hatch mechanics, wild egg placement.

- paldb `/en/Eggs` is a **wild egg pool** table (754 location/Pal/weight rows,
  27 egg types) — it does not establish breeding egg size per species. Record
  what it does publish; gap what it doesn't.
- Ominous Eggs (World Tree, always World Tree passives) and Mutated Eggs
  (breeding only) — record as mechanics, not as tables, unless a source gives
  rates.

## Pass C — Fishing

Not collected. paldb `/en/Fishing` has 6 fishing partner skills, 115 spot
headings, per-zone loot lists.

- Preserve probabilities and ranges **as published** — never convert to expected
  values.
- Bait tiers, shadow types (normal / purple sparkle / green sparkle / purple
  beam) as mechanics.

## Pass D — Gear

Not collected. Weapons, tools, armour, accessories, spheres.

- Stats, recipes, tech tier, ammo type, durability, resistances.
- Spheres: capture rate contribution, recipe, tech level.

## Pass E — Food and recipes

Not collected. Ingredients, nutrition, SAN, HP, buffs, workstation, duration.

## Pass F — Structures

Partly covered by technology unlocks, but buildable-object detail is not.

- Materials, footprint, function, power draw, tech tier.

## Pass G — World and map

Not collected, and the hardest.

- Fast travel points, dungeon entrances, merchant locations, resource zones.
- **Known blocker:** paldb's map markers have no stable IDs and use transformed
  display coordinates. If identity can't be preserved, gap it — a map without
  stable identity poisons every join.
- Dungeon types, level ranges, boss pools per type are obtainable.

## Pass H — Raids and bosses

Partly covered (9 raid, 8 tower, 190 dungeon).

- Wave compositions, respawn timers, phase structure, guaranteed drops.
- Expect `no-source` on wave tables.

## Pass I — Status effects, weather, time

Not collected. Duration, tick damage, application, cures. Day/night length,
weather spawn modifiers.

## Pass J — Systems and formulas

**Expect this pass to mostly produce gaps.** Capture rate, XP, work speed, SAN,
condensation scaling, IVs.

- The capture formula and stat formulas circulate widely — find whether any has
  a datamined source or is community reverse-engineering. Label accordingly.
- Condensation: 4/8/12/24 = 48 total is confirmed post-1.0. The dump's
  4/16/32/64 = 116 is **pre-1.0 and wrong**.
- Work speed curves: the app has 8 levels with a known curve. The dump's 5
  levels are pre-1.0.

## Pass K — Meta

Achievements, patch history, version timeline.

## Pass L — Anything discovered

Expeditions, oil rig, Pal Arena, server config, guild systems. Gets its own pass
rather than being dropped.

---

# PART 5 — THE JULES TASK TEMPLATE

Every collection pass uses this shape. Start a **new Jules session per task** —
Jules reuses one branch per session, and once that session's first PR merges,
later work lands on a dead branch.

```
Read AGENTS.md and docs/OPERATIONS-GUIDE.md first.
Create a NEW branch off main. Do not reuse a branch from a previous session.

COLLECTION PASS: <name>

Source hierarchy, highest first:
  1. PalCalc db.json (github.com/tylercamp/palcalc) — datamined from game files
  2. paldb.cc — bounded page sections only
  3. palworld.wiki.gg, game8 — corroboration only
  4. community sources — labelled opinion, never a fact

Collect: <exact fields>

Write a fetch+parse script under scripts/ that:
  - caches fetched pages to disk so re-runs are cheap
  - fails loudly if a required source section is missing or renamed
  - emits src/data/palworld/knowledge<Name>.ts following the existing
    EvidenceRecord envelope
  - records every unobtainable field as a gap with a reason code
  - prints a coverage count: filled vs gapped, and fails on a drop

Rules:
  - Never invent a value. Unknown stays unknown with a reason.
  - Join on internalName, never Paldeck number.
  - Register the new generated file in .prettierignore and eslint.config.js
    (knowledge[A-Z]*.ts convention).
  - Do not import the new module into any route — data only.

Run npx tsc --noEmit, npx vitest run, npm run lint, npm run build.
Confirm the core bundle stays under 4,500,000 bytes.
Open exactly ONE pull request against main.

Report: what was collected, what was gapped and why, coverage counts,
and every source conflict with both values recorded.
```

---

# PART 6 — WHAT LOVABLE BUILDS

Only after Jules has committed data. Lovable reads JSON, renders pages, never
fetches.

**Point Lovable at a branch called `lovable/ui`, never `main`.** It auto-commits
continuously to whatever branch it syncs, and has no path scoping — it can edit
any file including generated data.

Pages:

- `/` — coverage dashboard, counts computed from the data, not asserted
- `/pals`, `/pals/$id` — every field with its source badge
- `/breeding`, `/eggs`, `/skills`, `/items`, `/gear`, `/food`, `/world`,
  `/systems`
- `/gaps` — every gap grouped by reason code. **This page is the point.** It is
  the honest inventory of what nobody has published
- `/export` — the whole thing as one markdown document

Rendering rules:

- Every value shows its source tier
- Unknowns render as "unknown — <reason>", never blank, never zero
- Community-tier values render visually distinct from datamined ones

Load the eight rules from Part 2 into Lovable's **Knowledge**, and merge to
`main` only through a PR that must pass CI.

---

# PART 7 — SEQUENCE

**Phase 1 — Jules, data only.** Pass A first, then B through L in order. One PR
each. No UI work yet.

**Phase 2 — Lovable, UI.** Once three or four passes have landed, build the
shell and the pages for what exists. Add pages as passes land.

**Phase 3 — Export.** The markdown generator last, when the data is stable.

At 15 Jules tasks a day, a pass will typically take one to three tasks. Expect
the whole collection phase to be a couple of weeks of light use, not a sprint.

---

# PART 8 — WHAT TO EXPECT

**Passes B–F will mostly succeed.** paldb publishes structured pages for eggs,
fishing, items, gear, food and structures.

**Pass G will partly fail.** Map marker identity is a known blocker.

**Pass J will mostly fail.** Formulas are community reverse-engineering. That is
not a failure of the project — a well-documented gap is the correct output, and
`/gaps` is where it belongs.

**Nothing predictive becomes possible.** Element multipliers, damage, level
scaling and boss stats need game files. No amount of scraping changes that.

The honest goal is **the most complete sourced Palworld reference that can be
built without a PC**, with every hole labelled and explained.
