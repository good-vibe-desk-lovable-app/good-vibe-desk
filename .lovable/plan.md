## Goal

Land the finished Palworld data layer into this project, then build the main app screen where a player assembles their Pal collection, picks a target Pal, and ticks the passives they want carried over. The "Find breeding chain" button stays a deliberate stub this round — the actual search algorithm is the next chat.

## Step 1 — Install the data layer (Chat 1 output)

Copy the 10 files from the handoff archive into `src/data/palworld/`:
`types.ts`, `pals.ts`, `uniqueCombos.ts`, `sameSpeciesOnly.ts`, `breeding.ts`, `passives.ts`, `palPassives.ts`, `version.ts`, `index.ts`, plus `data-check.tsx` placed at `src/routes/data-check.tsx`.

These are verbatim — no edits to the data or the resolver.

Then verify at `/data-check`: the five formula spot-checks pass, Pal count is sane, and `pairToChild` is roughly n(n+1)/2.

Two things I noticed while reading the handoff that are worth flagging now, not later:
- `elements: []` on every Pal and `eggType: "Common"` on every Pal are documented gaps in `version.ts` — palcalc's db.json doesn't carry them. The Chat 2 spec asks for element chips and an egg-type display. I'll render those areas gracefully (omit empty element chips, show egg size which *is* real) rather than fabricate values, and note it in the handoff packet.
- The plan's prose says Anubis + Cattiva → Robinquill; the shipped data-check asserts Vanwyrm, because palcalc's real ranks differ from the illustrative numbers in the plan. The data wins — I'm not touching the check.

## Step 2 — Supporting UI pieces

Add the shadcn components the screen needs: `dialog`, `command`, `checkbox`, `radio-group`, `alert-dialog`, `sonner` (toast), `card`, `button`, `label`, `scroll-area` — alongside the `input`, `badge`, `table` the data-check page already wants.

## Step 3 — Replace `src/routes/index.tsx` with the app shell

Dark Palworld-flavored theme defined as semantic tokens in `src/styles.css` (deep navy surfaces, warm gold accent, chunky rounded cards) — no hardcoded color utilities in components. Three regions on desktop, stacked below `md`.

**Your Collection**
- Entries shaped `{ instanceId, palId, gender: "male"|"female"|"unknown", passiveIds: string[] }`.
- Persisted to `localStorage` under `pbp:collection:v1` as `{ version: 1, entries }`; hydrated on mount, saved on change.
- "Add Pal" opens a dialog: searchable Command list over `PALS`, gender radio (Male / Female / Not sure), then a passive checklist sourced from `PAL_PASSIVES[palId]` (falling back to all `PASSIVES` when `'any'`), capped at 4 slots with the remaining boxes disabled.
- Skewed gender ratios surface an inline note when `maleRatio` is set.
- Each row: name, gender icon, passive chips, Edit (reopens prefilled), Remove.
- Export downloads `pbp-collection-<isoDate>.json`; Import validates shape and replaces after an AlertDialog confirm, defaulting a missing gender to "unknown".

**Target Pal**
- Command palette over all Pals.
- Selected target card: name, egg size, combi rank, estimated hatch time from egg size (Normal 3-6h, Large 18-36h, Huge 36-72h).
- Amber callout when the target is in `SAME_SPECIES_ONLY`.
- Last target persisted at `pbp:lastTarget:v1`.

**Select Passives**
- Shown only when a target is picked and the collection isn't empty.
- Per-entry checkbox list, global and per-entry select/deselect all.
- Live counter "N passives from M Pals selected", with a soft note above 4.
- Held in React state keyed `${instanceId}:${passiveId}` — not persisted.

**Primary action + footer**
- "Find breeding chain", disabled until a target and at least one passive are chosen. On click it logs `{ target, selections }` and toasts "Algorithm coming next".
- Footer shows the data version line and a `_blank`/`noopener` link to the palcalc repo.

## Step 4 — SEO and verification

Unique `head()` on `/`: title "Palworld Breeding Pathfinder — Plan Passive Trait Chains", concrete description, og:title/og:description, og:type website, twitter:card. No og:image on `__root`.

Then I'll drive the running app in a headless browser to confirm: three Pals added with genders survive a refresh; export → clear → import restores them with genders; Jetragon as target raises the locked callout; Calculate emits the right payload.

## Out of scope this chat

No pathfinder algorithm, no results rendering, no merge tree, no extra routes beyond `/data-check`, and nothing inside `src/data/palworld` gets modified after the copy.

## Handoff

I'll close with a "HANDOFF PACKET FOR CHAT 3" fenced block: `CollectionEntry` and selection types, the exact localStorage keys and JSON shapes, the Calculate payload shape, the handler's function name, and the shadcn components added.
