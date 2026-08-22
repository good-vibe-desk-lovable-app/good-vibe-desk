import type { EvidenceRecord } from "@/data/palworld/knowledge";
import type { ItemKnowledge } from "@/data/palworld/knowledgeItems";

export interface OptionalItemPackManifest {
  id: "items-recipes-v1";
  file: string;
  recordCount: number;
  description: string;
  compressedBytes: number;
  uncompressedBytes: number;
  storageBytes: number;
}

export const OPTIONAL_ITEM_PACK_MANIFEST_URL =
  "/optional-knowledge-packs/items-recipes-v1.manifest.json";
const OPTIONAL_ITEM_PACK_URL = "/optional-knowledge-packs/items-recipes-v1.json.gz";
const OPTIONAL_ITEM_PACK_CACHE = "palworld-optional-items-recipes-v1";

export async function fetchOptionalItemPackManifest({
  allowInstalledCache = false,
}: { allowInstalledCache?: boolean } = {}): Promise<OptionalItemPackManifest> {
  const cached = allowInstalledCache
    ? await (await optionalCache()).match(OPTIONAL_ITEM_PACK_MANIFEST_URL)
    : undefined;
  const response = cached ?? (await fetch(OPTIONAL_ITEM_PACK_MANIFEST_URL, { cache: "no-store" }));
  if (!response.ok) throw new Error(`Item pack details could not be loaded (${response.status}).`);
  const manifest: unknown = await response.json();
  if (!isOptionalItemPackManifest(manifest)) throw new Error("Item pack details were invalid.");
  return manifest;
}

export async function hasOptionalItemPack() {
  const cache = await optionalCache();
  return Boolean(await cache.match(OPTIONAL_ITEM_PACK_URL));
}

export async function downloadOptionalItemPack(): Promise<
  readonly EvidenceRecord<ItemKnowledge>[]
> {
  const [archiveResponse, manifestResponse] = await Promise.all([
    fetch(OPTIONAL_ITEM_PACK_URL, { cache: "no-store" }),
    fetch(OPTIONAL_ITEM_PACK_MANIFEST_URL, { cache: "no-store" }),
  ]);
  if (!archiveResponse.ok)
    throw new Error(`Item pack download failed (${archiveResponse.status}).`);
  if (!manifestResponse.ok) {
    throw new Error(`Item pack details could not be saved (${manifestResponse.status}).`);
  }

  // Validate the archive before claiming that it has been installed, then cache
  // the untouched compressed response. Cache Storage therefore pays only the
  // manifest's disclosed gzip size; the decoded array lives in memory only while
  // the catalogue page is open.
  const records = await decodeItemPack(archiveResponse.clone());
  const cache = await optionalCache();
  await Promise.all([
    cache.put(OPTIONAL_ITEM_PACK_URL, archiveResponse),
    cache.put(OPTIONAL_ITEM_PACK_MANIFEST_URL, manifestResponse),
  ]);
  return records;
}

export async function loadDownloadedOptionalItemPack(): Promise<
  readonly EvidenceRecord<ItemKnowledge>[]
> {
  const cache = await optionalCache();
  const response = await cache.match(OPTIONAL_ITEM_PACK_URL);
  if (!response) throw new Error("The optional items pack has not been downloaded on this device.");
  return decodeItemPack(response);
}

export async function removeOptionalItemPack() {
  return caches.delete(OPTIONAL_ITEM_PACK_CACHE);
}

async function optionalCache() {
  if (typeof caches === "undefined") {
    throw new Error("This browser does not support removable offline item storage.");
  }
  return caches.open(OPTIONAL_ITEM_PACK_CACHE);
}

async function decodeItemPack(
  response: Response,
): Promise<readonly EvidenceRecord<ItemKnowledge>[]> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot decompress the optional offline item pack.");
  }

  const decompressed = response.body?.pipeThrough(new DecompressionStream("gzip"));
  if (!decompressed) throw new Error("The item pack returned no readable body.");

  const payload: unknown = JSON.parse(await new Response(decompressed).text());
  if (!Array.isArray(payload) || payload.length !== 2455) {
    throw new Error("The item pack did not contain the expected 2,455 catalogue records.");
  }
  return payload as readonly EvidenceRecord<ItemKnowledge>[];
}

function isOptionalItemPackManifest(value: unknown): value is OptionalItemPackManifest {
  if (!value || typeof value !== "object") return false;
  const manifest = value as Record<string, unknown>;
  return (
    manifest.id === "items-recipes-v1" &&
    typeof manifest.file === "string" &&
    typeof manifest.recordCount === "number" &&
    typeof manifest.description === "string" &&
    typeof manifest.compressedBytes === "number" &&
    typeof manifest.uncompressedBytes === "number" &&
    typeof manifest.storageBytes === "number"
  );
}
