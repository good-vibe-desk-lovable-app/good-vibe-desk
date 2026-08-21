# Palworld Knowledge-Base Contract

**Status:** Foundation policy for all offline Palworld data acquired after 21 August 2026.
**Scope:** This contract governs source-backed records, emitted generated data, coverage checks, and offline-size limits. It does not itself claim new Palworld game facts.

## Non-negotiable record shape

Every new factual dataset must emit records using `EvidenceRecord<T>` from `src/data/palworld/knowledge.ts`. A record must retain a game version, source citations, field-level provenance, confidence, and any unresolved gaps. It is not acceptable to assign one source tier to an entire complex record when individual fields came from different evidence.

| Requirement | Rule |
|---|---|
| Source URL | Every emitted factual field must resolve to a retained direct source URL. |
| Source tier | Use only `datamined`, `official`, `wiki`, or `community`; never invent a fifth “probably correct” tier. |
| Confidence | Use `confirmed`, `corroborated`, `reported`, or `unknown`. |
| Version | Record the observed source/game version where published; otherwise write `UNKNOWN`. |
| Gaps | Missing mechanics are explicit `gaps`, not zeroes, false booleans, or unlabelled omissions. |
| Recommendations | A strategy, build, or team card is not a game fact. It must declare its version, assumptions, source tier, and uncertainty. |

## Source parser contract

Every HTML parser must call `scripts/palworld_source_contracts.py` and define the exact heading/card structure it expects. A required section that is renamed, missing, duplicated, or empty is a **hard failure**.

> The 2026 Habitat → Map rename silently produced 138 unresolved acquisition records when a parser accepted empty output. This failure mode is prohibited for every future domain.

No parser may use loose document-wide matching, handwritten alias maps, or a fallback that turns a failed contract into an empty “known gap.” A bounded source section must be selected exactly, parsed only inside its heading boundary, and produce required values where the domain promises them.

## Generated-data registration

For every new machine-emitted module:

1. Add the file to `.prettierignore`.
2. Add the same file to `GENERATED_DATA` in `eslint.config.js`.
3. Add a generated-file header containing source, observed version, fetched date, and emitter date.
4. Emit a coverage sidecar conforming to `DatasetCoverage`.
5. Check the coverage sidecar against the committed baseline using `scripts/check-knowledge-coverage.mjs`.

The formatting registration is mandatory. Existing long-line generated data cannot be safely reformatted by Prettier because regeneration immediately reverts it, creating a permanent unfixable lint drift.

## Coverage policy

A coverage sidecar reports a dataset’s total record count, optional category counts, source URLs, game version, and emission time. Each regeneration must report before/after counts in its PR description, including zero deltas. A record-count or named-category decrease fails by default.

`KNOWLEDGE_COVERAGE_ALLOW_DECREASE=1` exists only for a reviewed, intentional removal with a written PR explanation. It must never be used to hide a parser regression.

## Offline core budget

The default PWA public output was **3,335,334 bytes** when this contract was created. The core offline budget is **4,500,000 bytes**, enforced by `scripts/check-offline-budget.mjs` as the final `npm run build` step.

New reference data must be route-level lazy chunks or explicit opt-in packs once it would threaten this limit. High-resolution art, map tiles, video, and external-source media are never part of the default offline cache unless a separate PR defines licensing, storage cost, download behavior, and an updated acceptance test.

## Required verification for acquisition PRs

| Check | Why it is required |
|---|---|
| Parser unit/negative tests | Proves renamed, duplicate, or empty source sections fail instead of silently emitting incomplete records. |
| Coverage diff | Detects unexpected source or join-key loss before the data reaches users. |
| TypeScript, lint, unit tests, and build | Protects existing breeding behavior and the client bundle. |
| PWA service-worker and output-budget checks | Protects cold offline navigation and finite Android storage. |
| Count report | Lets review compare record and category coverage even if no value changed. |
| Scope review | One domain per PR; no UI, recommendation, or unrelated schema change in a pure acquisition PR. |

## Import discipline

Normal application routes must not import heavy combinatorial tables or every domain eagerly. Keep indices small, lazy-load detailed domain packs, and reserve diagnostic-only structures for diagnostic routes, tests, or worker-only execution. Test files may use otherwise diagnostic-only data because they do not enter the browser bundle.
