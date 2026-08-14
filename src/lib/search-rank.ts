// Shared, pure search ranking for the Pal and passive pickers.
//
// This logic previously existed as four byte-identical private copies
// (pal-picker, add-pal-dialog, bulk-add-dialog, passives-panel). Four copies
// means four places to drift and zero places to unit-test, so it lives here
// instead: no React, no DOM, no dataset import, dependency-injected via plain
// structural types. Tests import this module directly.
//
// Ranking contract (LOWER sorts first, RANK_NO_MATCH means "drop the row"):
//
//   0  exact name match
//   1  name starts with the query      <- what the user almost always meant
//   2  name contains the query
//   3  dex number starts with the query (pals) / description contains it (passives)
//   4  internal name contains the query (pals only)
//  -1  no match
//
// Band 1 exists because a plain .includes() with an alphabetical sort buried
// Vanwyrm under every unrelated name containing "va" (Cattiva, Lovander,
// Xenovader, Silvance). Callers tiebreak WITHIN a band — alphabetically for
// pals, by original list position for passives — so the order stays stable as
// the user types.

/** The only fields ranking reads off a Pal. Keeps this module dataset-free. */
export interface RankablePal {
  name: string;
  palDexNo: number;
  internalName: string;
}

/** The only fields ranking reads off a passive. */
export interface RankablePassive {
  name: string;
  description: string;
}

/** Sentinel for "this row does not match at all" — callers filter it out. */
export const RANK_NO_MATCH = -1;

/** Highest (worst) rank a matching pal row can receive. */
export const MAX_PAL_RANK = 4;

/** Highest (worst) rank a matching passive row can receive. */
export const MAX_PASSIVE_RANK = 3;

/**
 * Normalises a raw input box value into the form every rank function expects.
 * Ranking compares lowercase against lowercase; passing a non-normalised query
 * silently downgrades every match to RANK_NO_MATCH, so callers must funnel
 * through here rather than hand-rolling `.trim().toLowerCase()`.
 */
export function normaliseQuery(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * @param pal       row to score
 * @param q         query, already through normaliseQuery()
 * @param lowerName pre-lowercased display name. The picker lowercases all ~300
 *                  names once at module init rather than on every keystroke,
 *                  and passes the cached value in; everyone else omits it.
 */
export function rankPal(pal: RankablePal, q: string, lowerName?: string): number {
  if (!q) return 0;
  const name = lowerName ?? pal.name.toLowerCase();
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  if (name.includes(q)) return 2;
  if (String(pal.palDexNo).startsWith(q)) return 3;
  if (pal.internalName.toLowerCase().includes(q)) return 4;
  return RANK_NO_MATCH;
}

/**
 * Undefined is accepted and scores RANK_NO_MATCH, because passive panels rank
 * by id and a stale id can resolve to nothing. Note the empty-query early
 * return happens BEFORE that check: with no query every row is visible,
 * including ids the dataset no longer knows, which is the pre-existing
 * behaviour and is what keeps an unrecognised id visible rather than silently
 * vanishing from the collection.
 */
export function rankPassive(passive: RankablePassive | undefined | null, q: string): number {
  if (!q) return 0;
  if (!passive) return RANK_NO_MATCH;
  const name = passive.name.toLowerCase();
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  if (name.includes(q)) return 2;
  if (passive.description.toLowerCase().includes(q)) return 3;
  return RANK_NO_MATCH;
}

export interface SearchPalsOptions<T> {
  /** Cap on returned rows. Also caps the unfiltered (empty-query) list. */
  limit?: number;
  /** Supplies a cached lowercased name for a row. */
  lowerName?: (pal: T) => string;
}

/**
 * Rank + filter + sort in one pass, for the two dialogs that search the whole
 * roster with no chip filters.
 *
 * With an empty query this returns the head of the list in DATASET order, not
 * alphabetical order — that is deliberate and matches what the dialogs did
 * before. PalPicker does NOT use this helper: it applies element/work/
 * acquisition chips first and sorts alphabetically even when the query is
 * empty, so it calls rankPal() directly inside its own loop.
 */
export function searchPals<T extends RankablePal>(
  pals: readonly T[],
  q: string,
  options: SearchPalsOptions<T> = {},
): T[] {
  const { limit, lowerName } = options;
  if (!q) return limit === undefined ? pals.slice() : pals.slice(0, limit);

  const scored: Array<{ pal: T; rank: number }> = [];
  for (const pal of pals) {
    const rank = rankPal(pal, q, lowerName?.(pal));
    if (rank === RANK_NO_MATCH) continue;
    scored.push({ pal, rank });
  }
  scored.sort((a, b) => a.rank - b.rank || a.pal.name.localeCompare(b.pal.name));
  const ordered = scored.map((s) => s.pal);
  return limit === undefined ? ordered : ordered.slice(0, limit);
}
