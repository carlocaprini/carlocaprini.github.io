import { readFile } from "node:fs/promises";
import { extname } from "node:path";

const SUPPORTED_EXTENSIONS = new Set([".png", ".webp"]);

function readUint24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function pngDimensions(buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature) || buffer.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("invalid PNG header");
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), format: "png" };
}

function webpDimensions(buffer) {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    throw new Error("invalid WebP header");
  }

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    if (dataOffset + chunkSize > buffer.length) throw new Error("truncated WebP chunk");

    if (chunkType === "VP8X") {
      if (chunkSize < 10) throw new Error("invalid VP8X chunk");
      return {
        width: readUint24LE(buffer, dataOffset + 4) + 1,
        height: readUint24LE(buffer, dataOffset + 7) + 1,
        format: "webp"
      };
    }

    if (chunkType === "VP8L") {
      if (chunkSize < 5 || buffer[dataOffset] !== 0x2f) throw new Error("invalid VP8L chunk");
      const byte1 = buffer[dataOffset + 1];
      const byte2 = buffer[dataOffset + 2];
      const byte3 = buffer[dataOffset + 3];
      const byte4 = buffer[dataOffset + 4];
      return {
        width: 1 + byte1 + ((byte2 & 0x3f) << 8),
        height: 1 + (byte2 >> 6) + (byte3 << 2) + ((byte4 & 0x0f) << 10),
        format: "webp"
      };
    }

    if (chunkType === "VP8 ") {
      if (chunkSize < 10 || !buffer.subarray(dataOffset + 3, dataOffset + 6).equals(Buffer.from([0x9d, 0x01, 0x2a]))) {
        throw new Error("invalid VP8 chunk");
      }
      return {
        width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff,
        format: "webp"
      };
    }

    offset = dataOffset + chunkSize + (chunkSize % 2);
  }

  throw new Error("WebP dimensions not found");
}

export async function readImageDimensions(path) {
  const extension = extname(path).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error(`unsupported image type ${extension || "(none)"}`);
  }

  const buffer = await readFile(path);
  const dimensions = extension === ".png" ? pngDimensions(buffer) : webpDimensions(buffer);
  if (dimensions.width <= 0 || dimensions.height <= 0) throw new Error("invalid image dimensions");
  return dimensions;
}
