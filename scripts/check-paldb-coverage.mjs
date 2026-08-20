/**
 * Deploy-safe PalDB coverage contract.
 *
 * `npm run build` and `npm run build:dev` execute this Node-only check because
 * Cloudflare Workers Builds receive tracked generated modules but neither the
 * untracked `scripts/.cache/paldb` corpus nor a Python runtime. Do not replace
 * this preflight with the source-section audit: run `npm run data:check` after
 * refreshing the local PalDB cache to validate the underlying HTML contracts.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

async function moduleText(name) {
  return readFile(resolve(ROOT, "src", "data", "palworld", name), "utf8");
}

function jsonLiteralAfterConst(source, constant) {
  const start = source.indexOf(`export const ${constant}`);
  if (start < 0) throw new Error(`Missing generated constant: ${constant}`);
  const equals = source.indexOf("=", start);
  const first = source.slice(equals + 1).search(/[\[{]/);
  if (first < 0) throw new Error(`No JSON payload for ${constant}`);

  const payloadStart = equals + 1 + first;
  const opener = source[payloadStart];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = payloadStart; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"') {
      quote = char;
      continue;
    }
    if (char === opener) depth += 1;
    if (char === closer) depth -= 1;
    if (depth === 0) {
      return JSON.parse(source.slice(payloadStart, index + 1).replace(/,\s*([}\]])/g, "$1"));
    }
  }
  throw new Error(`Unterminated generated payload: ${constant}`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function rows(record) {
  return Object.values(record).reduce((total, value) => total + value.length, 0);
}

const rosterSource = await moduleText("pals.ts");
const roster = new Set(
  [...rosterSource.matchAll(/internalName: "([^"]+)"/g)].map((match) => match[1]),
);
const [elements, stats, spawns, habitat, drops, skills] = await Promise.all([
  moduleText("elements.ts").then((source) => jsonLiteralAfterConst(source, "PAL_ELEMENTS")),
  moduleText("stats.ts").then((source) => jsonLiteralAfterConst(source, "PAL_STATS")),
  moduleText("spawns.ts").then((source) => jsonLiteralAfterConst(source, "PAL_SPAWNS")),
  moduleText("habitat.ts").then((source) => jsonLiteralAfterConst(source, "PAL_HABITAT")),
  moduleText("drops.ts").then((source) => jsonLiteralAfterConst(source, "PAL_DROPS")),
  moduleText("skills.ts").then((source) => jsonLiteralAfterConst(source, "PAL_SKILLS")),
]);

const records = { elements, stats, spawns, habitat, drops, skills };
const expectedMissingRosterKeys = { stats: new Set(["WorldTreeDragon"]) };
for (const [label, record] of Object.entries(records)) {
  const allowedMissing = expectedMissingRosterKeys[label] ?? new Set();
  assertEqual(
    Object.keys(record).length,
    roster.size - allowedMissing.size,
    `${label} record coverage`,
  );
  for (const internal of roster) {
    if (!(internal in record) && !allowedMissing.has(internal)) {
      throw new Error(`${label} missing roster key: ${internal}`);
    }
  }
  for (const internal of allowedMissing) {
    if (internal in record)
      throw new Error(`${label} unexpectedly gained excluded key: ${internal}`);
  }
}

const activeSkillRows = rows(
  Object.fromEntries(Object.entries(skills).map(([key, value]) => [key, value.activeSkills])),
);
const activeSkillRecords = Object.values(skills).filter(
  (value) => value.activeSkills.length > 0,
).length;
const partnerSkillRecords = Object.values(skills).filter(
  (value) => Boolean(value.partnerSkill) && value.partnerSkill !== "-",
).length;
const uniqueActiveSkillNames = new Set(
  Object.values(skills).flatMap((value) => value.activeSkills.map((skill) => skill.name)),
).size;

const expected = {
  elementRecords: 299,
  elementValues: 387,
  statsRecords: 299,
  spawnRecords: 232,
  spawnRows: 929,
  habitatRecords: 300,
  habitatRows: 1200,
  dropRecords: 300,
  dropRows: 1645,
  activeSkillRecords: 299,
  activeSkillRows: 2388,
  uniqueActiveSkillNames: 307,
  partnerSkillRecords: 299,
};

assertEqual(
  Object.values(elements).filter((value) => value.length > 0).length,
  expected.elementRecords,
  "non-empty element coverage",
);
assertEqual(rows(elements), expected.elementValues, "element values");
assertEqual(Object.keys(stats).length, expected.statsRecords, "stats source coverage");
assertEqual(
  Object.values(spawns).filter((value) => value.length > 0).length,
  expected.spawnRecords,
  "non-empty spawn coverage",
);
assertEqual(rows(spawns), expected.spawnRows, "spawn rows");
assertEqual(
  Object.values(habitat).filter((value) => value.length > 0).length,
  expected.habitatRecords,
  "non-empty habitat coverage",
);
assertEqual(rows(habitat), expected.habitatRows, "habitat rows");
assertEqual(
  Object.values(drops).filter((value) => value.length > 0).length,
  expected.dropRecords,
  "non-empty drop coverage",
);
assertEqual(rows(drops), expected.dropRows, "drop rows");
assertEqual(activeSkillRecords, expected.activeSkillRecords, "active-skill record coverage");
assertEqual(activeSkillRows, expected.activeSkillRows, "active-skill rows");
assertEqual(uniqueActiveSkillNames, expected.uniqueActiveSkillNames, "unique active-skill names");
assertEqual(partnerSkillRecords, expected.partnerSkillRecords, "partner-skill coverage");

console.log(
  `[check-paldb-coverage] verified ${roster.size} roster keys; ` +
    `${expected.dropRows} drops, ${expected.spawnRows} spawn rows, ${expected.habitatRows} habitat rows, and ${expected.activeSkillRows} active-skill rows`,
);
