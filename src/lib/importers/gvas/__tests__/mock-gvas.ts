/**
 * Helper utility to build synthetic binary GVAS buffers for unit testing.
 */
export function createSyntheticGvasBuffer(options: {
  includeMagic?: boolean;
  saveVersion?: number;
  gvasVersion?: number;
  topLevelKeys?: Array<{ name: string; type: string; valueBytes?: Uint8Array }>;
}): ArrayBuffer {
  const {
    includeMagic = true,
    saveVersion = 3,
    gvasVersion = 3,
    topLevelKeys = [
      { name: "CharacterSaveParameterMap", type: "MapProperty" },
      { name: "GroupSaveDataMap", type: "MapProperty" },
    ],
  } = options;

  const encoder = new TextEncoder();

  // Helper stream builder
  const chunks: Uint8Array[] = [];

  const writeUInt32 = (num: number) => {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, num, true);
    chunks.push(b);
  };

  const writeInt32 = (num: number) => {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setInt32(0, num, true);
    chunks.push(b);
  };

  const writeString = (str: string) => {
    if (str === "") {
      writeInt32(0);
      return;
    }
    const encoded = encoder.encode(str);
    writeInt32(encoded.length + 1); // include null terminator
    chunks.push(encoded);
    chunks.push(new Uint8Array([0])); // null terminator
  };

  // 1. Magic GVAS
  if (includeMagic) {
    writeUInt32(0x53415647); // "GVAS"
  } else {
    writeUInt32(0x12345678); // Invalid magic
  }

  // 2. Header versions
  writeInt32(saveVersion);
  writeInt32(gvasVersion);

  // 3. Engine Version (6 bytes version + 4 bytes build + buildId string)
  chunks.push(new Uint8Array(6)); // 0.0.0
  writeUInt32(0);
  writeString("1.0.0-Release");

  // 4. Custom Version format & array
  writeInt32(0);
  writeInt32(0); // 0 custom versions

  // 5. SaveGameClassName
  writeString("/Script/Pal.PalSaveGame");

  // 6. Properties
  for (const prop of topLevelKeys) {
    writeString(prop.name);
    writeString(prop.type);

    const val = prop.valueBytes || new Uint8Array([0, 0, 0, 0]);
    writeInt32(val.length); // size
    writeInt32(0); // index / padding

    if (prop.type === "MapProperty") {
      writeString("StructProperty");
      writeString("StructProperty");
    } else if (prop.type === "ByteProperty") {
      writeString("None");
    } else if (prop.type === "ArrayProperty") {
      writeString("StructProperty");
    } else if (prop.type === "StructProperty") {
      writeString("PalOptionData");
      chunks.push(new Uint8Array(16)); // 16-byte GUID
    }

    chunks.push(val);
  }

  // Terminal "None" key
  writeString("None");

  // Total buffer concatenation
  const totalLength = chunks.reduce((acc, curr) => acc + curr.length, 0);
  const finalBuffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    finalBuffer.set(chunk, offset);
    offset += chunk.length;
  }

  return finalBuffer.buffer;
}
