import type { EvidenceRecord } from "@/data/palworld/knowledge";

const cache = new Map<string, Promise<readonly EvidenceRecord<unknown>[]>>();

/**
 * Loads a compressed knowledge pack that is emitted into `.output/public` during
 * the production build and precached by the service worker. The raw generated
 * TypeScript module is deliberately not imported by compendium routes, keeping
 * its uncompressed source out of route chunks and the core offline budget.
 */
export function loadOfflineKnowledgePack<T>(name: string): Promise<readonly EvidenceRecord<T>[]> {
  const existing = cache.get(name);
  if (existing) return existing as Promise<readonly EvidenceRecord<T>[]>;

  const pending = fetch(`/knowledge-packs/${name}.json.gz`)
    .then(async (response) => {
      if (!response.ok)
        throw new Error(`Knowledge pack ${name} could not be loaded (${response.status}).`);
      if (typeof DecompressionStream === "undefined") {
        throw new Error("This browser cannot decompress offline knowledge packs.");
      }

      const decompressed = response.body?.pipeThrough(new DecompressionStream("gzip"));
      if (!decompressed) throw new Error(`Knowledge pack ${name} returned no readable body.`);

      const text = await new Response(decompressed).text();
      const payload: unknown = JSON.parse(text);
      if (!Array.isArray(payload))
        throw new Error(`Knowledge pack ${name} did not contain a record array.`);
      return payload as readonly EvidenceRecord<unknown>[];
    })
    .catch((error: unknown) => {
      cache.delete(name);
      throw error;
    });

  cache.set(name, pending);
  return pending as Promise<readonly EvidenceRecord<T>[]>;
}
