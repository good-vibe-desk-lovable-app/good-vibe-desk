# Design Proposal: Client-Side Palworld `.sav` Importer (Revised)

**Author:** Jules  
**Date:** August 2026  
**Status:** Design Proposal (Unimplemented)  
**Target Reference:** `docs/PALWORLD-1.0-REFERENCE.md`, `docs/OPERATIONS-GUIDE.md`, `AGENTS.md`, and `src/lib/collection.ts`.

---

## 1. Executive Summary

This proposal outlines the architectural design for a 100% client-side Palworld save file (`.sav`) importer module. By parsing standard Unreal Engine GVAS binary structures and zlib/flate compressed save chunks directly in the browser, users can instantly import their captured Pals—including level, passives, gender, and stat IVs—directly into the application from their local `Level.sav` file.

---

## 2. Scope & Target Mapping

### 2.1 Extension to `CollectionEntry` (`src/lib/collection.ts`)

To retain high-value stat and quality data rather than discarding extracted IVs and levels, `CollectionEntry` in `src/lib/collection.ts` will be extended with optional, backward-compatible fields:

```ts
export type Gender = "male" | "female" | "unknown";

export interface PalIVs {
  hp: number; // Integer 0 to 100
  melee: number; // Integer 0 to 100
  shot: number; // Integer 0 to 100
  defense: number; // Integer 0 to 100
}

export interface CollectionEntry {
  instanceId: string;
  palId: number;
  gender: Gender;
  passiveIds: string[];
  level?: number; // Integer 1 to 60 (or max level)
  ivs?: PalIVs;
}
```

### 2.2 Validation Guarantees in `parseCollectionFileDetailed`

To ensure robust import hardening without clamping or silent data corruption:

1. **Backward Compatibility:** Existing saved collections without `level` or `ivs` load seamlessly (`level` and `ivs` remain `undefined`).
2. **Strict Range Validation (Reject Over Clamp):**
   - `level`: Must be a finite integer between `1` and `60`. If out of bounds or non-numeric, `level` is set to `undefined` (or the entry is rejected if strictly malformed) and a note is appended to `ParseCollectionResult.notes`.
   - `ivs`: Each component (`hp`, `melee`, `shot`, `defense`) must be an integer between `0` and `100`. If any IV component is out of range (e.g., `-1` or `101`), `ivs` as a whole is set to `undefined` and noted.
3. **Migration Path:** No database migration script is needed. In-memory schema parsing in `parseCollectionFileDetailed` handles legacy collection files without rewriting or invalidating stored JSON data.

### 2.3 Field Extraction Matrix (`CharacterSaveParameterMap`)

The importer reads character parameters from `CharacterSaveParameterMap` within `Level.sav`:

| GVAS / `.sav` Field                                          | Unreal Type                    | Extraction & Transformation Logic                                                                                                                   | Target Field |
| ------------------------------------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `IndividualId.InstanceId`                                    | `FGuid`                        | Formatted as standard UUID string (`8-4-4-4-12`). Replaced via `newInstanceId()` if missing or duplicate.                                           | `instanceId` |
| `CharacterID`                                                | `FString` / `FName`            | Matched against `PALS` catalog strictly on `internalName` (`PALS.find(p => p.internalName === CharacterID)?.id`).                                   | `palId`      |
| `Gender`                                                     | `ByteProperty` / Enum          | `"EPalGenderType::Male"` ➔ `"male"`, `"EPalGenderType::Female"` ➔ `"female"`, unmapped/missing ➔ `"unknown"`.                                       | `gender`     |
| `PassiveSkillList`                                           | `ArrayProperty` of `FName`     | Array of skill strings (e.g. `"Legend"`, `"Craftman"`). Filtered against valid `PASSIVES` catalog IDs, capped to max 4 slots (`MAX_PASSIVE_SLOTS`). | `passiveIds` |
| `Level`                                                      | `IntProperty`                  | Extracted integer level validated against `1`..`60`.                                                                                                | `level`      |
| `Talent_HP`, `Talent_Melee`, `Talent_Shot`, `Talent_Defense` | `ByteProperty` / `IntProperty` | Extracted individual IV integers (0..100). Validated strictly.                                                                                      | `ivs`        |

### 2.4 Safety & Hardening Rules

- **Strict `internalName` Join:** Saves are matched strictly on `internalName`. Joining on Paldeck numbers is prohibited because 85 of 300 Pals share numbers with variant forms.
- **Collection Limit (`MAX_ENTRIES = 500`):** Saves containing >500 Pals trigger a UI selection step before saving to prevent `localStorage` quota exhaustion.
- **Ignored Fields:** Non-collection structures (base camp facilities, guild structures, player inventory, coordinates, active move loadout, player UIDs) are ignored during binary stream traversal.

---

## 3. Palworld 1.0 Save Format Status & Verification Risk

### 3.1 Verification Status of Public Parsers

- **Current Public Parsers:** Public reference tools (`cheahjs/palworld-save-tools`, `blaynem/paldex`) reflect the pre-1.0 v0.3.x GVAS save schema (October 2024).
- **1.0 Status Assessment:** **No public parser has been verified against the official August 2026 Palworld 1.0 release save schema.**
- **Pre-Implementation Requirement:** **Do not implement the parser until a real 1.0 `Level.sav` file is verified against the GVAS header, `PLSD` zlib wrapper, and `CharacterSaveParameterMap` layout.**

### 3.2 Visible Failure Guarantee (No Guesswork)

- If the importer encounters unrecognised binary headers, unknown GVAS property types, or unexpected byte alignments, it **must fail visibly and throw a typed `SavImportError`**. It will never guess byte offsets or synthesize fake data.

---

## 4. Zero-Dependency Browser Decompression & Execution Architecture

### 4.1 Native Browser Decompression

- **Zero Dependency Risk:** Adding npm packages like `fflate` risks breaking the Cloudflare deployment pipeline (`bun install --frozen-lockfile` failing due to missing `bun.lock` entries).
- **Zero-Dependency Solution:** The browser's native `DecompressionStream("deflate")` (or `DecompressionStream("gzip")`) API handles zlib header stripping and decompression natively in all modern browsers (Chrome 80+, Firefox 113+, Safari 16.4+).
- **Implementation:**
  ```ts
  async function decompressSaveChunk(compressedBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    const stream = new Blob([compressedBuffer])
      .stream()
      .pipeThrough(new DecompressionStream("deflate"));
    return await new Response(stream).arrayBuffer();
  }
  ```

### 4.2 Lazy-Loaded Execution

- Processing occurs 100% client-side via `FileReader` and `ArrayBuffer`.
- The parser module resides at `src/lib/importers/gvas/` and is lazy-loaded dynamic-imported on user action (`await import("@/lib/importers/gvas")`), adding **0 bytes** to the initial bundle.

---

## 5. File Targets & Path Resolution

### 5.1 Correct Target File

- The importer specifically targets **`Level.sav`**, which contains `CharacterSaveParameterMap` (all player and Pal instances).

### 5.2 Typical Platform Save Paths

- **Windows (Steam):**
  `%LOCALAPPDATA%\Pal\Saved\SaveGames\<SteamID>\<SaveID>\Level.sav`
- **Steam Deck / Linux (Proton):**
  `~/.local/share/Steam/steamapps/compatdata/1623730/pfx/drive_c/users/steamuser/AppData/Local/Pal/Saved/SaveGames/<SteamID>/<SaveID>/Level.sav`

### 5.3 Wrong File Upload Handling

If a user selects an incorrect file (e.g. `WorldOption.sav`, `LocalData.sav`, or `LevelMeta.sav`):

- The parser checks for `CharacterSaveParameterMap` upon parsing the top-level GVAS header.
- If absent, parsing halts instantly with a clear error prompt: _"Selected file is not a valid Level.sav file (CharacterSaveParameterMap missing)."_

---

## 6. Offline Budget Impact

- **Current Core Footprint:** `3,806,682 bytes` (~3.81 MB).
- **Core Budget Limit:** `4,500,000 bytes` (~4.50 MB).
- **Available Budget Headroom:** `693,318 bytes` (~693 KB).
- **Importer Dependency Cost:** **0 KB external dependencies** (uses native TS stream reader and browser `DecompressionStream`).
- **Bundle Cost:** ~12 KB gzipped lazy-loaded chunk, consuming < 2% of available headroom.

---

## 7. Failure Handling Matrix

| Scenario                               | Detection Guard                                                   | User Experience / Action                                                                     |
| -------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Corrupted File / Truncated Stream**  | Out-of-bounds byte stream access or `DecompressionStream` error.  | Error alert: _"Corrupted save file: Unable to decompress or read byte stream."_              |
| **Unsupported / Incompatible Version** | GVAS magic bytes (`GVAS`) or header version check fails.          | Error alert: _"Incompatible save file format. Game save version not supported."_             |
| **Wrong Save File Selected**           | `CharacterSaveParameterMap` struct missing from parsed GVAS tree. | Error alert: _"Selected file is not a valid Level.sav. Please select Level.sav."_            |
| **Xbox / Game Pass Container Save**    | Standard GVAS header missing (`PLSD` / `GVAS` header absent).     | Error alert: _"Xbox/Game Pass container save detected. Extract Level.sav before importing."_ |
| **Unrecognised Pal Species ID**        | `CharacterID` lookup in `PALS` returns `undefined`.               | Species omitted; added to summary notes: _"Skipped 4 unrecognised species."_                 |
| **Out-of-Range Level or IVs**          | Range check in `parseCollectionFileDetailed` fails.               | `level` / `ivs` set to `undefined`; noted in summary notes.                                  |

---

## 8. Test Strategy (Zero Binary Save Files in Repository)

Testing relies on **synthetic binary mock generators**:

1. **Synthetic GVAS Buffer Generator (`src/lib/importers/gvas/__tests__/mock-gvas.ts`):**
   - A test utility constructs minimal `ArrayBuffer` instances with valid GVAS header structures and compressed deflate streams containing mock `CharacterSaveParameterMap` entries.
2. **Automated Unit Tests (`src/lib/importers/gvas/__tests__/parser.test.ts`):**
   - **Valid Mapping Test:** Verifies species, gender, passives, level, and IVs transform cleanly into `CollectionEntry[]`.
   - **Range Validation Test:** Verifies out-of-range IVs (`-1`, `105`) or levels (`0`, `99`) are rejected cleanly.
   - **Wrong File Test:** Verifies uploading a file lacking `CharacterSaveParameterMap` throws a descriptive error.
   - **Deduplication Test:** Verifies duplicate instance IDs are safely replaced with fresh UUIDs.
3. **Fuzzing & Boundary Testing:**
   - Passes randomized byte streams to verify all invalid inputs throw `SavImportError` without unhandled crashes.
