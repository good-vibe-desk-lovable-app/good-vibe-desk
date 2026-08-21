/**
 * Shared evidence contract for the offline Palworld knowledge base.
 *
 * A record is only as trustworthy as the source attached to its individual
 * fields. Do not flatten a community observation and game-extracted value into
 * the same apparent certainty merely because they describe the same Pal.
 */
export const SOURCE_TIERS = ["datamined", "official", "wiki", "community"] as const;

export type SourceTier = (typeof SOURCE_TIERS)[number];

export const EVIDENCE_CONFIDENCE = ["confirmed", "corroborated", "reported", "unknown"] as const;

export type EvidenceConfidence = (typeof EVIDENCE_CONFIDENCE)[number];

export interface SourceCitation {
  /** Stable source identifier within the emitted dataset. */
  id: string;
  /** Direct, reviewable source URL. */
  url: string;
  tier: SourceTier;
  /** Page section, game asset, table row, or other precise locator when known. */
  locator?: string;
  /** ISO-8601 date when this source was fetched or observed. */
  observedAt: string;
  /** Displayed source/game version, if the source publishes one. */
  sourceVersion?: string;
}

export interface FieldProvenance {
  /** Dot path inside `data`, such as `partnerSkill.effect.levels.1`. */
  field: string;
  sourceIds: string[];
  confidence: EvidenceConfidence;
  note?: string;
}

export interface DatasetVersion {
  /** Palworld game version covered by this emitted record, or `UNKNOWN`. */
  gameVersion: string;
  /** ISO-8601 timestamp when the generator emitted the record. */
  emittedAt: string;
  /** Generator/source revision, such as PalCalc db revision, if applicable. */
  generatorVersion?: string;
}

export interface KnowledgeGap {
  field: string;
  reason: string;
  /** Concrete source, extraction, or controlled test that could resolve it. */
  resolution: string;
}

export interface EvidenceRecord<T> {
  id: string;
  data: T;
  version: DatasetVersion;
  sources: SourceCitation[];
  provenance: FieldProvenance[];
  gaps?: KnowledgeGap[];
}

/**
 * Machine-readable coverage sidecar produced beside each generated dataset.
 * `scripts/check-knowledge-coverage.mjs` compares it with the checked-in
 * baseline and rejects unexpected record loss.
 */
export interface DatasetCoverage {
  dataset: string;
  generatedAt: string;
  gameVersion: string;
  recordCount: number;
  /** Optional named sub-counts, such as records by encounter class. */
  counts?: Record<string, number>;
  sourceUrls: string[];
}
