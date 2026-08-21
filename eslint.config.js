import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

/**
 * Generated dataset modules.
 *
 * These are machine output: scripts/emit-paldb.py and the palcalc import emit
 * ONE record per line, with lines running to ~2,200 characters. Prettier would
 * reflow roughly 43,000 object properties onto their own lines — about 4,900
 * lines of data becoming ~50,000 — and the next regeneration would revert all
 * of it. That is a lint failure `npm run format` can never fix, which is
 * precisely why the Lint step had to be continue-on-error.
 *
 * They are also listed in .prettierignore. This block is the second belt:
 * whether eslint-plugin-prettier honours .prettierignore is version-dependent
 * and not verifiable without a local ESLint run, and this repo has no local
 * dev environment. Only the formatting rule is disabled here — every real
 * TypeScript rule still applies to these files.
 */
const GENERATED_DATA = [
  "src/data/palworld/drops.ts",
  "src/data/palworld/elements.ts",
  "src/data/palworld/habitat.ts",
  "src/data/palworld/palIcons.ts",
  "src/data/palworld/palPassives.ts",
  "src/data/palworld/pals.ts",
  "src/data/palworld/passives.ts",
  "src/data/palworld/sameSpeciesOnly.ts",
  "src/data/palworld/skills.ts",
  "src/data/palworld/spawns.ts",
  "src/data/palworld/stats.ts",
  "src/data/palworld/uniqueCombos.ts",
  "src/data/palworld/dataGaps.ts",
  "src/data/palworld/knowledgeSkills.ts",
  "src/data/palworld/knowledgeEncounters.ts",
];

export default tseslint.config(
  // routeTree.gen.ts is emitted by @tanstack/router-plugin on every build and
  // is already in .prettierignore; linting a regenerated file can only ever
  // produce noise nobody is allowed to fix.
  { ignores: ["dist", ".output", ".vinxi", "src/routeTree.gen.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  eslintPluginPrettier,
  {
    files: GENERATED_DATA,
    rules: { "prettier/prettier": "off" },
  },
);
