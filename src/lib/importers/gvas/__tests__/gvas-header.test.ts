import { describe, expect, it } from "vitest";
import { inspectGvasHeader } from "../index";
import { createSyntheticGvasBuffer } from "./mock-gvas";

describe("inspectGvasHeader", () => {
  it("parses valid synthetic uncompressed GVAS buffer with CharacterSaveParameterMap", async () => {
    const buffer = createSyntheticGvasBuffer({
      saveVersion: 3,
      gvasVersion: 3,
      topLevelKeys: [
        { name: "CharacterSaveParameterMap", type: "MapProperty" },
        { name: "GroupSaveDataMap", type: "MapProperty" },
      ],
    });

    const report = await inspectGvasHeader(buffer);

    expect(report.isGvasMagicPresent).toBe(true);
    expect(report.saveFormatVersion).toBe(3);
    expect(report.gvasVersion).toBe(3);
    expect(report.isDecompressed).toBe(true);
    expect(report.hasCharacterSaveParameterMap).toBe(true);
    expect(report.topLevelKeys).toEqual(["CharacterSaveParameterMap", "GroupSaveDataMap"]);
    expect(report.error).toBeUndefined();
  });

  it("fails visibly on invalid magic bytes without offset guessing", async () => {
    const buffer = createSyntheticGvasBuffer({ includeMagic: false });

    const report = await inspectGvasHeader(buffer);

    expect(report.isGvasMagicPresent).toBe(false);
    expect(report.hasCharacterSaveParameterMap).toBe(false);
    expect(report.error).toContain("Invalid magic bytes");
  });

  it("fails visibly on truncated or corrupted buffer", async () => {
    const buffer = new Uint8Array([0x01, 0x02]).buffer;

    const report = await inspectGvasHeader(buffer);

    expect(report.isGvasMagicPresent).toBe(false);
    expect(report.error).toBeDefined();
  });

  it("accurately reports when CharacterSaveParameterMap is absent", async () => {
    const buffer = createSyntheticGvasBuffer({
      topLevelKeys: [{ name: "WorldOptionSaveData", type: "StructProperty" }],
    });

    const report = await inspectGvasHeader(buffer);

    expect(report.isGvasMagicPresent).toBe(true);
    expect(report.hasCharacterSaveParameterMap).toBe(false);
    expect(report.topLevelKeys).toEqual(["WorldOptionSaveData"]);
  });
});
