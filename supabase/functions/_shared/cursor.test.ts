import {
  decodeEditorCursor,
  decodePublicCursor,
  encodeEditorCursor,
  encodePublicCursor,
} from "./cursor.ts";

const PUBLICATION_ID = "f3a6128c-4a65-4810-a441-e19ab1d6d855";

function assert(condition: unknown, message = "Assertion failed"): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals<T>(actual: T, expected: T): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
}

function assertThrows(operation: () => unknown): void {
  try {
    operation();
  } catch {
    return;
  }

  throw new Error("Expected operation to throw");
}

function encodeEnvelope(envelope: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(envelope));
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeEnvelope(cursor: string): unknown {
  const base64 = cursor.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

Deno.test("public cursors use a versioned unpadded base64url envelope", () => {
  const cursor = encodePublicCursor("2027-03-09", PUBLICATION_ID);

  assert(!cursor.includes("="), "Expected an unpadded cursor");
  assert(/^[A-Za-z0-9_-]+$/.test(cursor), "Expected base64url characters only");
  assertEquals(decodeEnvelope(cursor), {
    v: 1,
    type: "public",
    date: "2027-03-09",
    id: PUBLICATION_ID,
  });
  assertEquals(decodePublicCursor(cursor), {
    date: "2027-03-09",
    id: PUBLICATION_ID,
  });
});

Deno.test("editor cursors round-trip strict UTC timestamps", () => {
  const cursor = encodeEditorCursor(
    "2027-03-10T14:00:00.123456Z",
    PUBLICATION_ID,
  );

  assertEquals(decodeEnvelope(cursor), {
    v: 1,
    type: "editor",
    updatedAt: "2027-03-10T14:00:00.123456Z",
    id: PUBLICATION_ID,
  });
  assertEquals(decodeEditorCursor(cursor), {
    updatedAt: "2027-03-10T14:00:00.123456Z",
    id: PUBLICATION_ID,
  });
});

Deno.test("cursor decoders cross-reject cursors from the other listing", () => {
  const publicCursor = encodePublicCursor("2027-03-09", PUBLICATION_ID);
  const editorCursor = encodeEditorCursor(
    "2027-03-10T14:00:00Z",
    PUBLICATION_ID,
  );

  assertEquals(decodeEditorCursor(publicCursor), null);
  assertEquals(decodePublicCursor(editorCursor), null);
});

Deno.test("public cursor decoding rejects malformed or non-canonical envelopes", () => {
  const invalidCursors = [
    "",
    "not+base64url",
    "abcd=",
    encodeEnvelope({ v: 2, type: "public", date: "2027-03-09", id: PUBLICATION_ID }),
    encodeEnvelope({ v: 1, type: "public", date: "2027-02-29", id: PUBLICATION_ID }),
    encodeEnvelope({ v: 1, type: "public", date: "2027-3-09", id: PUBLICATION_ID }),
    encodeEnvelope({ v: 1, type: "public", date: "2027-03-09", id: "not-a-uuid" }),
    encodeEnvelope({
      v: 1,
      type: "public",
      date: "2027-03-09",
      id: PUBLICATION_ID,
      unexpected: true,
    }),
    encodeEnvelope([1, "public", "2027-03-09", PUBLICATION_ID]),
  ];

  for (const cursor of invalidCursors) {
    assertEquals(decodePublicCursor(cursor), null);
  }
});

Deno.test("editor cursor decoding requires a real ISO-8601 UTC timestamp ending in Z", () => {
  const invalidTimestamps = [
    "2027-03-10T14:00:00+00:00",
    "2027-03-10 14:00:00Z",
    "2027-02-29T14:00:00Z",
    "2027-03-10T24:00:00Z",
    "2027-03-10T14:60:00Z",
    "2027-03-10T14:00:60Z",
  ];

  for (const updatedAt of invalidTimestamps) {
    assertEquals(
      decodeEditorCursor(
        encodeEnvelope({ v: 1, type: "editor", updatedAt, id: PUBLICATION_ID }),
      ),
      null,
    );
  }
});

Deno.test("cursor encoders reject invalid tuple values", () => {
  assertThrows(() => encodePublicCursor("2027-02-29", PUBLICATION_ID));
  assertThrows(() => encodePublicCursor("2027-03-09", "not-a-uuid"));
  assertThrows(() =>
    encodeEditorCursor("2027-03-10T14:00:00+00:00", PUBLICATION_ID)
  );
  assertThrows(() => encodeEditorCursor("2027-03-10T14:00:00Z", "not-a-uuid"));
});
