export interface GvasHeaderReport {
  isGvasMagicPresent: boolean;
  saveFormatVersion: number | null;
  gvasVersion: number | null;
  isDecompressed: boolean;
  compressionType: "none" | "zlib_cnk" | "unknown";
  hasCharacterSaveParameterMap: boolean;
  topLevelKeys: string[];
  error?: string;
}

/**
 * Binary Stream Helper for reading Unreal GVAS data without guessing offsets.
 */
class BinaryReader {
  private view: DataView;
  private offset = 0;
  private isLittleEndian: boolean;

  constructor(buffer: ArrayBuffer, littleEndian = true) {
    this.view = new DataView(buffer);
    this.isLittleEndian = littleEndian;
  }

  get length(): number {
    return this.view.byteLength;
  }

  get currentOffset(): number {
    return this.offset;
  }

  seek(position: number): void {
    if (position < 0 || position > this.view.byteLength) {
      throw new Error(`Out of bounds seek: ${position}`);
    }
    this.offset = position;
  }

  readBytes(count: number): Uint8Array {
    if (this.offset + count > this.view.byteLength) {
      throw new Error(`Out of bounds read of ${count} bytes at offset ${this.offset}`);
    }
    const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, count);
    this.offset += count;
    return bytes;
  }

  readUInt32(): number {
    if (this.offset + 4 > this.view.byteLength) throw new Error("Out of bounds read uint32");
    const val = this.view.getUint32(this.offset, this.isLittleEndian);
    this.offset += 4;
    return val;
  }

  readInt32(): number {
    if (this.offset + 4 > this.view.byteLength) throw new Error("Out of bounds read int32");
    const val = this.view.getInt32(this.offset, this.isLittleEndian);
    this.offset += 4;
    return val;
  }

  readString(): string {
    const len = this.readInt32();
    if (len === 0) return "";
    if (len > 0) {
      // ASCII / UTF-8 string including null terminator
      const bytes = this.readBytes(len);
      // Strip trailing null
      const actualBytes =
        bytes[bytes.length - 1] === 0 ? bytes.subarray(0, bytes.length - 1) : bytes;
      return new TextDecoder("utf-8").decode(actualBytes);
    } else {
      // UTF-16LE string
      const charCount = -len;
      const byteCount = charCount * 2;
      const bytes = this.readBytes(byteCount);
      const actualBytes =
        bytes[bytes.length - 2] === 0 && bytes[bytes.length - 1] === 0
          ? bytes.subarray(0, bytes.length - 2)
          : bytes;
      return new TextDecoder("utf-16le").decode(actualBytes);
    }
  }
}

/**
 * Strips Palworld `PLSD` / `CNK` compressed header and decompress using native DecompressionStream.
 * Palworld `.sav` files typically have:
 * - Uncompressed length (4 bytes)
 * - Compressed length (4 bytes)
 * - Magic "PlSD" (4 bytes)
 * - Compression type (1 byte: 0x31 for zlib/deflate)
 * - Compressed payload (zlib header 0x78 0x9C or 0x78 0xDA + deflate stream)
 */
async function decompressPalworldSave(
  buffer: ArrayBuffer,
): Promise<{ decompressed: ArrayBuffer; compressionType: "none" | "zlib_cnk" | "unknown" }> {
  const bytes = new Uint8Array(buffer);

  // Check if already uncompressed GVAS (Magic "GVAS" = 0x47, 0x56, 0x41, 0x53 or 0x53415647 LE)
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x56 &&
    bytes[2] === 0x41 &&
    bytes[3] === 0x53
  ) {
    return { decompressed: buffer, compressionType: "none" };
  }

  // Check for Palworld compressed header format (0x31 or 'PlSD' / 'CNK')
  if (bytes.length > 12) {
    // Palworld custom header format:
    // [0..3]: uncompressed size
    // [4..8]: compressed size
    // [8..11]: "PlSD" (0x50, 0x6C, 0x53, 0x44) or "CNK"
    // [12]: compression byte (0x31 = deflate/zlib, 0x32 = double compressed)
    const magicStr = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (magicStr === "PlSD" || magicStr === "CNK\0" || bytes[12] === 0x31 || bytes[12] === 0x32) {
      const payload = bytes.subarray(12);

      // Native DecompressionStream("deflate") handles raw deflate / zlib.
      // Standard zlib headers start with 0x78 0x9C or 0x78 0xDA.
      // Browser DecompressionStream("deflate-raw") or DecompressionStream("deflate") (with zlib wrapper stripped if raw needed).
      try {
        let rawPayload = payload;
        // If zlib header 0x78 present, skip 2-byte zlib header if using deflate-raw, or use "deflate"
        if (payload[0] === 0x78) {
          rawPayload = payload.subarray(2);
        }

        const stream = new Blob([rawPayload])
          .stream()
          .pipeThrough(new DecompressionStream("deflate-raw"));
        const decompressedBuffer = await new Response(stream).arrayBuffer();
        return { decompressed: decompressedBuffer, compressionType: "zlib_cnk" };
      } catch (err) {
        // Fallback: try standard "deflate" with full header
        try {
          const stream = new Blob([payload])
            .stream()
            .pipeThrough(new DecompressionStream("deflate"));
          const decompressedBuffer = await new Response(stream).arrayBuffer();
          return { decompressed: decompressedBuffer, compressionType: "zlib_cnk" };
        } catch {
          throw new Error(
            `Failed to decompress save chunk via DecompressionStream: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }
  }

  // Unknown header / unrecognised format
  return { decompressed: buffer, compressionType: "unknown" };
}

/**
 * Inspects a Palworld `.sav` ArrayBuffer and returns diagnostic GVAS report.
 * Strictly checks magic bytes and parses top-level property keys without offset guessing.
 */
export async function inspectGvasHeader(buffer: ArrayBuffer): Promise<GvasHeaderReport> {
  const report: GvasHeaderReport = {
    isGvasMagicPresent: false,
    saveFormatVersion: null,
    gvasVersion: null,
    isDecompressed: false,
    compressionType: "none",
    hasCharacterSaveParameterMap: false,
    topLevelKeys: [],
  };

  try {
    const { decompressed, compressionType } = await decompressPalworldSave(buffer);
    report.compressionType = compressionType;

    const reader = new BinaryReader(decompressed);

    // Read GVAS Magic (0x53415647 LE = "GVAS")
    if (reader.length < 4) {
      report.error = "File buffer is too small to contain a GVAS header.";
      return report;
    }

    const magic = reader.readUInt32();
    if (magic !== 0x53415647) {
      report.error = `Invalid magic bytes: expected 0x53415647 ('GVAS'), found 0x${magic.toString(16)}.`;
      return report;
    }

    report.isGvasMagicPresent = true;
    report.isDecompressed = true;

    // GVAS Header parameters:
    // - SaveGameVersion (int32)
    // - StructureVersion (int32)
    // - EngineVersion (int16 major, int16 minor, int16 patch, uint32 build, string buildID)
    // - CustomVersionFormat (int32)
    // - CustomVersions (Array of GUID + int32)
    // - SaveGameClassName (String)
    report.saveFormatVersion = reader.readInt32();
    report.gvasVersion = reader.readInt32();

    // Read Engine Version
    reader.readBytes(6); // Major, Minor, Patch (2 bytes each)
    reader.readUInt32(); // Build
    reader.readString(); // BuildID

    // Custom Version Format & Array
    reader.readInt32(); // CustomVersionFormat
    const customVersionsCount = reader.readInt32();
    for (let i = 0; i < customVersionsCount; i++) {
      reader.readBytes(16); // Guid (16 bytes)
      reader.readInt32(); // Version (4 bytes)
    }

    // Save Game Class Name
    const className = reader.readString();
    if (!className) {
      report.error = "GVAS header missing SaveGameClassName.";
      return report;
    }

    // Top-Level Property Map traversal
    const topLevelKeys: string[] = [];
    while (reader.currentOffset < reader.length) {
      const propName = reader.readString();
      if (!propName || propName === "None") {
        break; // End of top-level properties
      }

      topLevelKeys.push(propName);

      const propType = reader.readString();
      const propSize = reader.readInt32(); // Property length in bytes
      reader.readInt32(); // Index / padding

      // Handle specific property types with extra metadata bytes before skipping value
      if (propType === "StructProperty") {
        reader.readString(); // StructType
        reader.readBytes(16); // Struct GUID
      } else if (propType === "ByteProperty") {
        reader.readString(); // EnumName
      } else if (propType === "BoolProperty") {
        reader.readBytes(1); // Value byte
      } else if (propType === "ArrayProperty") {
        reader.readString(); // ArrayInnerType
      } else if (propType === "MapProperty") {
        reader.readString(); // KeyType
        reader.readString(); // ValueType
      } else if (propType === "SetProperty") {
        reader.readString(); // SetInnerType
      }

      // Skip the property value body by `propSize`
      if (propType !== "BoolProperty") {
        reader.readBytes(propSize);
      }
    }

    report.topLevelKeys = topLevelKeys;
    report.hasCharacterSaveParameterMap = topLevelKeys.includes("CharacterSaveParameterMap");

    return report;
  } catch (err) {
    report.error = err instanceof Error ? err.message : String(err);
    return report;
  }
}
