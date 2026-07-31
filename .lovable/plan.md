## Goal

Phase 4 of the handoff plan: turn the working pathfinder into a polished tool — a visual merge tree, a summary card, alternative chains, a passive glossary, a breeding-power calculator, favorites, empty states, SEO, and an error boundary.

Untouched: `src/data/palworld/*`, the pathfinder public API, and the `pbp:collection:v1` storage schema.

## What gets built

**1. Merge-tree visualization** (replaces the numbered step list)
An SVG binary tree built from `Result.steps`. Leaves are the original collection Pals (green border, glowing passive chips), intermediates are blue, the target root is gold, larger, with a star. Straight lines connect each pair of parents to their child. Each edge is labelled with the step's `via`: "Unique", "Same species", or the computed breeding-power target for formula steps. Hovering a node opens a tooltip with name, combi rank, egg type/size and the source passives it carries. The tree lives in a bordered container that scrolls horizontally on small screens.

**2. Final summary card** (beside the tree)
Target name and image placeholder, green chips for every passive that reaches the target, and a stats line: "N steps · N eggs · ~Xh–Yh total incubation", summing each child's egg size (Normal 3–6h, Large 18–36h, Huge 36–72h). Plus a "Cakes you'll want" line covering Special Cake (inheritance), Vegetable Cake (two eggs) and Extravagant Vegetable Cake (stats/mutation).

**3. Alternative chains panel**
Calls the existing `findAlternative` up to three times, each forbidding the previously shown final pair. Sorted by fewest steps, then widest coverage. Each row reads "Alt N — X steps, Y passives covered" with a "Use this chain" button that swaps it into the tree.

**4. Passive glossary**
Every passive chip anywhere in the app becomes a button opening a dialog with the passive's name, tier badge, description, and the Pals from `PAL_PASSIVES` that guarantee it (with a note when it's unrestricted). A standing footer note explains inheritance in plain language and states that exact percentages aren't published.

**5. Breeding-power tool**
A collapsible "What do X + Y make?" card with two Pal pickers, always resolving through `resolveChild`. Formula results show the working: "rank 570 + 1460 → target 1015 → closest eligible: Robinquill (1010)".

**6. Egg info per step** — egg type, egg size and hatch-time range beside each step's child.

**7. Favorites** — star toggle in the target picker, persisted to `pbp:favorites:v1` as `{ version: 1, ids: number[] }`, favorites sorted to the top.

**8. Empty and error states** — no collection, no target, no passives selected, plus a red "impossible" state with two concrete suggestions and an amber "partial" banner naming which source Pals didn't make it.

**9. "How breeding works"** — a collapsible near the footer explaining the farm, cake, averaged breeding power, special override pairs, and the eleven self-only Pals.

**10. SEO + resilience** — unique title/description/og/twitter tags in the `/` route `head()` (no og:image on `__root`), and an error boundary around the results section with a Retry button.

**11. Responsive** — panels stack below md; verified end-to-end at 390px.

## Technical notes

- New components under `src/components/pbp/`: `merge-tree.tsx` (layout maths + SVG), `summary-card.tsx`, `alternatives-panel.tsx`, `passive-chip.tsx` + `passive-glossary-dialog.tsx`, `breeding-power-tool.tsx`, `how-breeding-works.tsx`, `results-error-boundary.tsx`.
- Tree layout: a pure `layoutTree(steps)` helper computing node depths and x-positions from the step list, unit-testable without the DOM; kept separate from the SVG renderer.
- Favorites persistence added to `src/lib/collection.ts` alongside the existing helpers (new key, existing schemas unchanged).
- Hatch-time totals reuse the existing `HATCH_TIME` map, extended with numeric ranges for summing.
- New shadcn components installed as needed: tooltip, collapsible, dialog (if absent).
- Verification: `vitest` for the layout helper, then Playwright at 1280px and 390px checking tree colouring, edge labels, the Anubis + Cattiva → Robinquill working, glossary open, favorites surviving refresh, and the `<head>` tags on `/`.
