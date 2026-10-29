export type ImageFormat = "jpeg" | "png" | "webp";

export type ImageValidationErrorCode =
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FORMAT"
  | "DIMENSIONS_EXCEEDED"
  | "CORRUPT_IMAGE";

export interface ValidatedImage {
  readonly bytes: Uint8Array;
  readonly format: ImageFormat;
  readonly contentType: "image/jpeg" | "image/png" | "image/webp";
  readonly width: number;
  readonly height: number;
}

export class ImageValidationError extends Error {
  constructor(
    readonly code: ImageValidationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ImageValidationError";
  }
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_DIMENSION = 4096;

interface Dimensions {
  width: number;
  height: number;
}

export function validateImage(bytes: Uint8Array): ValidatedImage {
  if (bytes.byteLength > MAX_FILE_SIZE) {
    throw new ImageValidationError(
      "FILE_TOO_LARGE",
      "Image files must not exceed 5 MiB",
    );
  }

  let format: ImageFormat;
  let contentType: ValidatedImage["contentType"];
  let dimensions: Dimensions;

  if (hasBytes(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    format = "png";
    contentType = "image/png";
    dimensions = parsePngDimensions(bytes);
  } else if (hasBytes(bytes, 0, [0xff, 0xd8, 0xff])) {
    format = "jpeg";
    contentType = "image/jpeg";
    dimensions = parseJpegDimensions(bytes);
  } else if (
    hasAscii(bytes, 0, "RIFF") && hasAscii(bytes, 8, "WEBP")
  ) {
    format = "webp";
    contentType = "image/webp";
    dimensions = parseWebPDimensions(bytes);
  } else {
    throw new ImageValidationError(
      "UNSUPPORTED_FORMAT",
      "Only JPEG, PNG, and WebP images are supported",
    );
  }

  validateDimensions(dimensions);

  return {
    bytes,
    format,
    contentType,
    width: dimensions.width,
    height: dimensions.height,
  };
}

function parsePngDimensions(bytes: Uint8Array): Dimensions {
  if (
    bytes.byteLength < 24 ||
    readUint32(bytes, 8, false) !== 13 ||
    !hasAscii(bytes, 12, "IHDR")
  ) {
    throw corruptImage("PNG image has an invalid IHDR chunk");
  }

  return {
    width: readUint32(bytes, 16, false),
    height: readUint32(bytes, 20, false),
  };
}

function parseJpegDimensions(bytes: Uint8Array): Dimensions {
  let offset = 2;

  while (offset < bytes.byteLength) {
    if (bytes[offset] !== 0xff) {
      throw corruptImage("JPEG image contains an invalid segment marker");
    }

    while (offset < bytes.byteLength && bytes[offset] === 0xff) {
      offset++;
    }
    if (offset >= bytes.byteLength) {
      break;
    }

    const marker = bytes[offset++];
    if (marker === 0x00) {
      throw corruptImage("JPEG image contains an invalid stuffed marker");
    }
    if (marker === 0xd9) {
      break;
    }
    if (isStandaloneJpegMarker(marker)) {
      continue;
    }
    if (offset + 2 > bytes.byteLength) {
      throw corruptImage("JPEG image has a truncated segment length");
    }

    const segmentLength = readUint16(bytes, offset, false);
    if (segmentLength < 2 || offset + segmentLength > bytes.byteLength) {
      throw corruptImage("JPEG image has an invalid segment length");
    }

    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      if (segmentLength < 7) {
        throw corruptImage("JPEG SOF segment is too short");
      }
      return {
        height: readUint16(bytes, offset + 3, false),
        width: readUint16(bytes, offset + 5, false),
      };
    }

    offset += segmentLength;
  }

  throw corruptImage("JPEG image does not contain a supported SOF segment");
}

function parseWebPDimensions(bytes: Uint8Array): Dimensions {
  if (bytes.byteLength < 20) {
    throw corruptImage("WebP image is truncated");
  }

  const riffEnd = readUint32(bytes, 4, true) + 8;
  if (riffEnd < 20 || riffEnd > bytes.byteLength) {
    throw corruptImage("WebP image has an invalid RIFF size");
  }

  let offset = 12;
  while (offset + 8 <= riffEnd) {
    const chunkType = readAscii(bytes, offset, 4);
    const chunkSize = readUint32(bytes, offset + 4, true);
    const payloadOffset = offset + 8;
    const payloadEnd = payloadOffset + chunkSize;

    if (payloadEnd > riffEnd) {
      throw corruptImage("WebP image contains a truncated chunk");
    }

    if (chunkType === "VP8X") {
      return parseVp8xDimensions(bytes, payloadOffset, chunkSize);
    }
    if (chunkType === "VP8L") {
      return parseVp8lDimensions(bytes, payloadOffset, chunkSize);
    }
    if (chunkType === "VP8 ") {
      return parseVp8Dimensions(bytes, payloadOffset, chunkSize);
    }

    offset = payloadEnd + (chunkSize % 2);
  }

  throw corruptImage("WebP image does not contain a supported image chunk");
}

function parseVp8xDimensions(
  bytes: Uint8Array,
  offset: number,
  chunkSize: number,
): Dimensions {
  if (chunkSize < 10) {
    throw corruptImage("WebP VP8X chunk is too short");
  }

  return {
    width: readUint24(bytes, offset + 4) + 1,
    height: readUint24(bytes, offset + 7) + 1,
  };
}

function parseVp8lDimensions(
  bytes: Uint8Array,
  offset: number,
  chunkSize: number,
): Dimensions {
  if (chunkSize < 5 || bytes[offset] !== 0x2f) {
    throw corruptImage("WebP VP8L chunk has an invalid signature");
  }

  const dimensionBits = readUint32(bytes, offset + 1, true);
  if ((dimensionBits >>> 29) !== 0) {
    throw corruptImage("WebP VP8L chunk uses an unsupported version");
  }

  return {
    width: (dimensionBits & 0x3fff) + 1,
    height: ((dimensionBits >>> 14) & 0x3fff) + 1,
  };
}

function parseVp8Dimensions(
  bytes: Uint8Array,
  offset: number,
  chunkSize: number,
): Dimensions {
  if (
    chunkSize < 10 ||
    (bytes[offset] & 0x01) !== 0 ||
    !hasBytes(bytes, offset + 3, [0x9d, 0x01, 0x2a])
  ) {
    throw corruptImage("WebP VP8 chunk has an invalid key frame header");
  }

  return {
    width: readUint16(bytes, offset + 6, true) & 0x3fff,
    height: readUint16(bytes, offset + 8, true) & 0x3fff,
  };
}

function validateDimensions({ width, height }: Dimensions): void {
  if (width <= 0 || height <= 0) {
    throw corruptImage("Image dimensions must be positive");
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new ImageValidationError(
      "DIMENSIONS_EXCEEDED",
      "Image width and height must not exceed 4096 pixels",
    );
  }
}

function isStandaloneJpegMarker(marker: number): boolean {
  return marker === 0x01 || marker === 0xd8 ||
    (marker >= 0xd0 && marker <= 0xd7);
}

function hasBytes(
  bytes: Uint8Array,
  offset: number,
  expected: readonly number[],
): boolean {
  if (offset < 0 || offset + expected.length > bytes.byteLength) {
    return false;
  }
  return expected.every((value, index) => bytes[offset + index] === value);
}

function hasAscii(bytes: Uint8Array, offset: number, expected: string): boolean {
  return readAscii(bytes, offset, expected.length) === expected;
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  if (offset < 0 || offset + length > bytes.byteLength) {
    return "";
  }

  let value = "";
  for (let index = 0; index < length; index++) {
    value += String.fromCharCode(bytes[offset + index]);
  }
  return value;
}

function readUint16(
  bytes: Uint8Array,
  offset: number,
  littleEndian: boolean,
): number {
  return view(bytes, offset, 2).getUint16(0, littleEndian);
}

function readUint24(bytes: Uint8Array, offset: number): number {
  if (offset < 0 || offset + 3 > bytes.byteLength) {
    throw corruptImage("Image metadata is truncated");
  }
  return bytes[offset] | (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16);
}

function readUint32(
  bytes: Uint8Array,
  offset: number,
  littleEndian: boolean,
): number {
  return view(bytes, offset, 4).getUint32(0, littleEndian);
}

function view(bytes: Uint8Array, offset: number, length: number): DataView {
  if (offset < 0 || offset + length > bytes.byteLength) {
    throw corruptImage("Image metadata is truncated");
  }
  return new DataView(bytes.buffer, bytes.byteOffset + offset, length);
}

function corruptImage(message: string): ImageValidationError {
  return new ImageValidationError("CORRUPT_IMAGE", message);
}
