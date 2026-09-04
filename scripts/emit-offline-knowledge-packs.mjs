import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourceDirectory = resolve(root, "src", "data", "palworld");
const outputDirectory = resolve(root, ".output", "public", "knowledge-packs");
const optionalOutputDirectory = resolve(root, ".output", "public", "optional-knowledge-packs");

const packs = {
  eggs: "knowledgeEggs.ts",
  "field-alphas": "knowledgeFieldAlphas.ts",
  encounters: "knowledgeEncounters.ts",
  fishing: "knowledgeFishing.ts",
  food: "knowledgeFood.ts",
  missions: "knowledgeMissions.ts",
  skills: "knowledgeSkills.ts",
  structures: "knowledgeStructures.ts",
  systems: "knowledgeSystems.ts",
  technologies: "knowledgeTechnologies.ts",
  "work-suitability": "knowledgeWorkSuitability.ts",
};

const optionalPacks = {
  "items-recipes-v1": {
    filename: "knowledgeItems.ts",
    recordCount: 2455,
    description: "Palworld item catalogue cards, stats, and source-bounded production rows.",
  },
};

function extractPayload(sourceFile) {
  const source = readFileSync(sourceFile, "utf8");
  const declaration = source.indexOf("export const ");
  const assignment = source.indexOf(" = ", declaration);
  // Generated payloads are emitted before any optional follow-on exports (for
  // example ENCOUNTER_KNOWLEDGE_GAPS). The first line-ending semicolon after
  // the assignment is therefore the array terminator; using lastIndexOf would
  // incorrectly append those later TypeScript exports to the JSON payload.
  const finalSemicolon = source.indexOf(";\n", assignment);

  if (declaration < 0 || assignment < 0 || finalSemicolon <= assignment) {
    throw new Error(
      `${sourceFile}: expected one generated export assignment ending in a semicolon.`,
    );
  }

  const raw = source.slice(assignment + 3, finalSemicolon);
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = Function(`return ${raw}`)();
  }
  if (!Array.isArray(payload)) {
    return [payload];
  }
  return payload;
}

rmSync(outputDirectory, { recursive: true, force: true });
rmSync(optionalOutputDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });
mkdirSync(optionalOutputDirectory, { recursive: true });

const manifest = [];
for (const [name, filename] of Object.entries(packs)) {
  const payload = extractPayload(resolve(sourceDirectory, filename));
  const uncompressed = Buffer.from(JSON.stringify(payload));
  const compressed = gzipSync(uncompressed, { level: 9, mtime: 0 });
  const output = resolve(outputDirectory, `${name}.json.gz`);

  writeFileSync(output, compressed);
  manifest.push({
    name,
    file: `${name}.json.gz`,
    recordCount: payload.length,
    uncompressedBytes: uncompressed.length,
    compressedBytes: compressed.length,
  });
}

writeFileSync(
  resolve(outputDirectory, "manifest.json"),
  `${JSON.stringify({ packs: manifest }, null, 2)}\n`,
);

const optionalManifest = [];
for (const [name, definition] of Object.entries(optionalPacks)) {
  const payload = extractPayload(resolve(sourceDirectory, definition.filename));
  if (payload.length !== definition.recordCount) {
    throw new Error(
      `${definition.filename}: expected ${definition.recordCount} records, received ${payload.length}.`,
    );
  }
  const uncompressed = Buffer.from(JSON.stringify(payload));
  const compressed = gzipSync(uncompressed, { level: 9, mtime: 0 });
  const file = `${name}.json.gz`;
  const pack = {
    id: name,
    file,
    recordCount: payload.length,
    description: definition.description,
    compressedBytes: compressed.length,
    uncompressedBytes: uncompressed.length,
    storageBytes: compressed.length,
  };

  writeFileSync(resolve(optionalOutputDirectory, file), compressed);
  writeFileSync(
    resolve(optionalOutputDirectory, `${name}.manifest.json`),
    `${JSON.stringify(pack, null, 2)}\n`,
  );
  optionalManifest.push(pack);
}

console.log(
  `[knowledge-packs] emitted ${manifest.length} precached packs and ${optionalManifest.length} optional pack (${optionalManifest
    .map((pack) => `${pack.id}: ${pack.recordCount} records, ${pack.compressedBytes} bytes`)
    .join("; ")})`,
);
