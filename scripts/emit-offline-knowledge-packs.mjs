import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourceDirectory = resolve(root, "src", "data", "palworld");
const outputDirectory = resolve(root, ".output", "public", "knowledge-packs");

const packs = {
  "field-alphas": "knowledgeFieldAlphas.ts",
  encounters: "knowledgeEncounters.ts",
  missions: "knowledgeMissions.ts",
  technologies: "knowledgeTechnologies.ts",
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

  const payload = JSON.parse(source.slice(assignment + 3, finalSemicolon));
  if (!Array.isArray(payload)) {
    throw new Error(`${sourceFile}: generated payload must be an array.`);
  }
  return payload;
}

rmSync(outputDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });

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
console.log(
  `[knowledge-packs] emitted ${manifest.length} compressed packs (${manifest
    .map((pack) => `${pack.name}: ${pack.recordCount} records, ${pack.compressedBytes} bytes`)
    .join("; ")})`,
);
