import type { StorageAdapter } from "./storage.ts";
import {
  ImageValidationError,
  type ValidatedImage,
  validateImage,
} from "./image_validator.ts";

const MEBIBYTE = 1024 * 1024;

function assert(condition: unknown, message = "Assertion failed"): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals<T>(actual: T, expected: T): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assertValidationError(
  operation: () => unknown,
  expectedCode: ImageValidationError["code"],
): void {
  try {
    operation();
  } catch (error) {
    assert(error instanceof ImageValidationError, "Expected ImageValidationError");
    assertEquals(error.code, expectedCode);
    return;
  }

  throw new Error(`Expected ImageValidationError with code ${expectedCode}`);
}

function png(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  bytes.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8);
  new DataView(bytes.buffer).setUint32(16, width, false);
  new DataView(bytes.buffer).setUint32(20, height, false);
  return bytes;
}

function jpeg(width: number, height: number, marker = 0xc0): Uint8Array {
  return new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe0,
    0x00,
    0x04,
    0x00,
    0x00,
    0xff,
    marker,
    0x00,
    0x0b,
    0x08,
    (height >>> 8) & 0xff,
    height & 0xff,
    (width >>> 8) & 0xff,
    width & 0xff,
    0x01,
    0x01,
    0x11,
    0x00,
    0xff,
    0xd9,
  ]);
}

function riffWebP(chunkType: string, payload: Uint8Array): Uint8Array {
  const paddedLength = payload.length + (payload.length % 2);
  const bytes = new Uint8Array(20 + paddedLength);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  new DataView(bytes.buffer).setUint32(4, bytes.length - 8, true);
  bytes.set([0x57, 0x45, 0x42, 0x50], 8);
  bytes.set([...chunkType].map((character) => character.charCodeAt(0)), 12);
  new DataView(bytes.buffer).setUint32(16, payload.length, true);
  bytes.set(payload, 20);
  return bytes;
}

function webpVp8x(width: number, height: number): Uint8Array {
  const payload = new Uint8Array(10);
  const storedWidth = width - 1;
  const storedHeight = height - 1;
  payload.set([
    storedWidth & 0xff,
    (storedWidth >>> 8) & 0xff,
    (storedWidth >>> 16) & 0xff,
  ], 4);
  payload.set([
    storedHeight & 0xff,
    (storedHeight >>> 8) & 0xff,
    (storedHeight >>> 16) & 0xff,
  ], 7);
  return riffWebP("VP8X", payload);
}

function webpVp8l(width: number, height: number): Uint8Array {
  const bits = (width - 1) | ((height - 1) << 14);
  const payload = new Uint8Array(5);
  payload[0] = 0x2f;
  new DataView(payload.buffer).setUint32(1, bits, true);
  return riffWebP("VP8L", payload);
}

function webpVp8(width: number, height: number): Uint8Array {
  const payload = new Uint8Array(10);
  payload.set([0x10, 0x00, 0x00, 0x9d, 0x01, 0x2a]);
  const view = new DataView(payload.buffer);
  view.setUint16(6, width, true);
  view.setUint16(8, height, true);
  return riffWebP("VP8 ", payload);
}

Deno.test("StorageAdapter exposes deterministic store and delete boundaries", async () => {
  const stored: string[] = [];
  const adapter: StorageAdapter = {
    store(contentId: string, image: ValidatedImage): Promise<string> {
      stored.push(`${contentId}:${image.format}:${image.width}x${image.height}`);
      return Promise.resolve(`https://media.example.invalid/${contentId}.${image.format}`);
    },
    delete(publicImageUrl: string): Promise<boolean> {
      return Promise.resolve(publicImageUrl.includes("media.example.invalid"));
    },
  };

  const image = validateImage(png(32, 24));
  assertEquals(
    await adapter.store("content-1", image),
    "https://media.example.invalid/content-1.png",
  );
  assertEquals(await adapter.delete("https://media.example.invalid/content-1.png"), true);
  assertEquals(stored[0], "content-1:png:32x24");
});

Deno.test("validateImage accepts PNG and reports its metadata", () => {
  const bytes = png(640, 480);
  const image = validateImage(bytes);

  assertEquals(image.bytes, bytes);
  assertEquals(image.format, "png");
  assertEquals(image.contentType, "image/png");
  assertEquals(image.width, 640);
  assertEquals(image.height, 480);
});

for (const marker of [0xc0, 0xc1, 0xc2]) {
  Deno.test(`validateImage parses JPEG SOF marker 0x${marker.toString(16)}`, () => {
    const image = validateImage(jpeg(1024, 768, marker));
    assertEquals(image.format, "jpeg");
    assertEquals(image.contentType, "image/jpeg");
    assertEquals(image.width, 1024);
    assertEquals(image.height, 768);
  });
}

Deno.test("validateImage parses WebP VP8X dimensions", () => {
  const image = validateImage(webpVp8x(4096, 2048));
  assertEquals(image.format, "webp");
  assertEquals(image.contentType, "image/webp");
  assertEquals(image.width, 4096);
  assertEquals(image.height, 2048);
});

Deno.test("validateImage parses WebP VP8L dimensions", () => {
  const image = validateImage(webpVp8l(321, 123));
  assertEquals(image.width, 321);
  assertEquals(image.height, 123);
});

Deno.test("validateImage parses WebP VP8 dimensions", () => {
  const image = validateImage(webpVp8(800, 600));
  assertEquals(image.width, 800);
  assertEquals(image.height, 600);
});

Deno.test("validateImage accepts an image exactly 5 MiB large", () => {
  const bytes = new Uint8Array(5 * MEBIBYTE);
  bytes.set(png(16, 16));

  const image = validateImage(bytes);
  assertEquals(image.width, 16);
  assertEquals(image.height, 16);
});

Deno.test("validateImage rejects files larger than 5 MiB before parsing", () => {
  assertValidationError(
    () => validateImage(new Uint8Array(5 * MEBIBYTE + 1)),
    "FILE_TOO_LARGE",
  );
});

Deno.test("validateImage rejects unsupported magic bytes", () => {
  assertValidationError(
    () => validateImage(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])),
    "UNSUPPORTED_FORMAT",
  );
});

Deno.test("validateImage rejects corrupt and truncated supported images", () => {
  assertValidationError(
    () => validateImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    "CORRUPT_IMAGE",
  );
  assertValidationError(
    () => validateImage(new Uint8Array([0xff, 0xd8, 0xff, 0xd9])),
    "CORRUPT_IMAGE",
  );
  assertValidationError(
    () => validateImage(riffWebP("VP8L", new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00]))),
    "CORRUPT_IMAGE",
  );
});

Deno.test("validateImage rejects zero or excessive dimensions", () => {
  assertValidationError(() => validateImage(png(0, 100)), "CORRUPT_IMAGE");
  assertValidationError(() => validateImage(png(4097, 100)), "DIMENSIONS_EXCEEDED");
  assertValidationError(() => validateImage(jpeg(100, 4097)), "DIMENSIONS_EXCEEDED");
  assertValidationError(() => validateImage(webpVp8x(4097, 1)), "DIMENSIONS_EXCEEDED");
});
