// HAND-MAINTAINED source-status markers for data that the generated modules cannot
// encode by shape alone. These are deliberately not values or generated records.

/**
 * An empty work list is normally an unavailable source field. KingWhale is the
 * exception: PalCalc's full twelve-type game-data row is all zero, so it is
 * known to rank last rather than be marked uncomputable.
 */
export const WORK_VERIFIED_ABSENT: ReadonlySet<string> = new Set(["KingWhale"]);

/**
 * Astralym (WorldTreeDragon) is absent from PalCalc's 299-Pal export and has no
 * active-skill learnset in the PalDB page data. It intentionally has no
 * PAL_STATS block, which keeps combat and work tiers visibly uncomputable.
 */
export const LEARNSET_NOT_FOUND: ReadonlySet<string> = new Set(["WorldTreeDragon"]);

/**
 * No Pal currently needs a manual "verified no element" exception. An empty
 * generated element list remains unknown unless a future source proves zero.
 */
export const ELEMENTS_VERIFIED_NONE: ReadonlySet<string> = new Set();
