// Shareable chain links.
//
// The whole planner state (collection + target + which passives to carry) is
// compressed into the URL hash so a link works with no backend and no account.
// Everything that comes back out of a link is untrusted input, so it is
// re-validated through parseCollectionFileDetailed — the single hardened entry
// point for collection data (unique instanceIds, entry cap, id length cap,
// palId/passiveId checked against the dataset).
// lz-string is CommonJS; named ESM imports fail under SSR. Use the default export.
import lzString from "lz-string";

const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } = lzString;

import { parseCollectionFileDetailed, type CollectionEntry } from "@/lib/collection";
import { PALS } from "@/data/palworld";

export const SHARE_HASH_PREFIX = "#s=";

/** Guard against a pathological hash blowing up decompression on mobile. */
const MAX_PAYLOAD_CHARS = 40_000;

export interface ShareState {
  targetId: number | null;
  collection: CollectionEntry[];
  /** "${instanceId}:${passiveId}" keys the user ticked. */
  selection: string[];
}

export interface DecodedShare extends ShareState {
  notes: string[];
}

/** Compact wire shape — short keys keep the URL well under browser limits. */
interface Wire {
  v: 1;
  t: number | null;
  e: Array<[string, number, "m" | "f" | "u", string[]]>;
  s: string[];
}

const genderOut = { male: "m", female: "f", unknown: "u" } as const;
const genderIn = { m: "male", f: "female", u: "unknown" } as const;

const palIds = new Set(PALS.map((p) => p.id));

export function encodeShareState(state: ShareState): string {
  const wire: Wire = {
    v: 1,
    t: state.targetId,
    e: state.collection.map((entry) => [
      entry.instanceId,
      entry.palId,
      genderOut[entry.gender],
      entry.passiveIds,
    ]),
    s: state.selection,
  };
  return compressToEncodedURIComponent(JSON.stringify(wire));
}

/** Returns null for anything that is not a well-formed, dataset-valid payload. */
export function decodeShareState(payload: string): DecodedShare | null {
  if (!payload || payload.length > MAX_PAYLOAD_CHARS) return null;

  let wire: unknown;
  try {
    const json = decompressFromEncodedURIComponent(payload);
    if (!json) return null;
    wire = JSON.parse(json);
  } catch {
    return null;
  }

  if (typeof wire !== "object" || wire === null) return null;
  const w = wire as Partial<Wire>;
  if (w.v !== 1 || !Array.isArray(w.e)) return null;

  const rawEntries = w.e.map((row) => {
    const [instanceId, palId, gender, passiveIds] = Array.isArray(row) ? row : [];
    return {
      instanceId,
      palId,
      gender: genderIn[gender as keyof typeof genderIn] ?? "unknown",
      passiveIds: Array.isArray(passiveIds) ? passiveIds : [],
    };
  });

  // Re-validate through the hardened parser rather than trusting the link.
  const parsed = parseCollectionFileDetailed({ version: 1, entries: rawEntries });
  if (!parsed) return null;

  // Selections reference instanceIds; the parser may have regenerated some, so
  // keep only the keys that still point at a Pal that survived validation.
  const live = new Set(parsed.entries.map((e) => e.instanceId));
  const selection = Array.isArray(w.s)
    ? w.s.filter((key) => typeof key === "string" && live.has(key.split(":")[0]))
    : [];

  const targetId = typeof w.t === "number" && palIds.has(w.t) ? w.t : null;

  return { targetId, collection: parsed.entries, selection, notes: parsed.notes };
}

/** Absolute URL for the current origin carrying the given state. */
export function buildShareUrl(state: ShareState): string {
  const base =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}${window.location.pathname}`;
  return `${base}${SHARE_HASH_PREFIX}${encodeShareState(state)}`;
}

/** Reads a share payload out of a location hash, if present. */
export function readShareHash(hash: string): string | null {
  if (!hash.startsWith(SHARE_HASH_PREFIX)) return null;
  return hash.slice(SHARE_HASH_PREFIX.length) || null;
}
