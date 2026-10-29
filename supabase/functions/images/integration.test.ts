import { MemoryStorageAdapter } from "../_shared/memory_storage_adapter.ts";
import {
  createImagesHandler,
  type DatabaseClient,
} from "./handler.ts";

const ENDPOINT = "http://localhost/functions/v1/images";
const EDITOR_SUBJECT = "00000000-0000-4000-8000-000000000001";
const OTHER_SUBJECT = "00000000-0000-4000-8000-000000000002";
const CREATED_AT = "2027-03-10T14:00:00Z";

interface ContentRecord {
  id: string;
  image_url: string;
  created_at: string;
}

class InMemoryDatabaseClient implements DatabaseClient {
  editorSubject: string | null = EDITOR_SUBJECT;
  failInsert = false;
  readonly contents = new Map<string, ContentRecord>();
  readonly insertAttempts: Array<{ id: string; image_url: string }> = [];
  readonly authLookups: string[] = [];
  readonly tokens = new Map<string, string>([
    ["editor-token", EDITOR_SUBJECT],
    ["other-token", OTHER_SUBJECT],
  ]);

  getAuthenticatedSubject(authHeader: string | null): Promise<string | null> {
    if (authHeader === null) {
      return Promise.resolve(null);
    }

    this.authLookups.push(authHeader);
    const match = /^Bearer\s+([^\s]+)$/.exec(authHeader);
    return Promise.resolve(match === null ? null : this.tokens.get(match[1]) ?? null);
  }

  getEditorSubject(): Promise<string | null> {
    return Promise.resolve(this.editorSubject);
  }

  insertContent(record: { id: string; image_url: string }): Promise<ContentRecord> {
    this.insertAttempts.push(record);
    if (this.failInsert) {
      return Promise.reject(new Error("simulated content insert failure"));
    }

    const content = { ...record, created_at: CREATED_AT };
    this.contents.set(content.id, content);
    return Promise.resolve(content);
  }
}

function createHarness() {
  const storage = new MemoryStorageAdapter();
  const db = new InMemoryDatabaseClient();
  return {
    db,
    storage,
    handler: createImagesHandler({ db, storage }),
  };
}

function assert(condition: unknown, message = "Assertion failed"): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals<T>(actual: T, expected: T, message?: string): void {
  if (!Object.is(actual, expected)) {
    throw new Error(
      message ?? `Expected ${String(expected)}, received ${String(actual)}`,
    );
  }
}

async function assertError(response: Response, status: number): Promise<void> {
  assertEquals(response.status, status);
  assert(
    response.headers.get("content-type")?.startsWith("application/json"),
    "Expected an application/json error response",
  );
  const body: unknown = await response.json();
  assert(isRecord(body) && typeof body.error === "string" && body.error.length > 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function multipartRequest(
  form: FormData,
  authorization = "Bearer editor-token",
): Request {
  return new Request(ENDPOINT, {
    method: "POST",
    headers: { Authorization: authorization },
    body: form,
  });
}

function uploadRequest(
  bytes: Uint8Array,
  filename: string,
  contentType: string,
  authorization = "Bearer editor-token",
): Request {
  const form = new FormData();
  form.set("file", new File([bytes], filename, { type: contentType }));
  return multipartRequest(form, authorization);
}

function png(width = 32, height = 24): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  bytes.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return bytes;
}

function jpeg(width = 32, height = 24): Uint8Array {
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
    0xc0,
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

function webp(width = 32, height = 24): Uint8Array {
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

  const bytes = new Uint8Array(20 + payload.length);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  new DataView(bytes.buffer).setUint32(4, bytes.length - 8, true);
  bytes.set([0x57, 0x45, 0x42, 0x50], 8);
  bytes.set([0x56, 0x50, 0x38, 0x58], 12);
  new DataView(bytes.buffer).setUint32(16, payload.length, true);
  bytes.set(payload, 20);
  return bytes;
}

Deno.test("images integration: valid PNG, JPEG, and WebP uploads persist and return 201", async () => {
  const cases = [
    { format: "png", bytes: png(640, 480), type: "image/png" },
    { format: "jpeg", bytes: jpeg(800, 600), type: "image/jpeg" },
    { format: "webp", bytes: webp(1024, 768), type: "image/webp" },
  ] as const;

  for (const testCase of cases) {
    const { db, storage, handler } = createHarness();
    const response = await handler(
      uploadRequest(
        testCase.bytes,
        `image.${testCase.format}`,
        testCase.type,
      ),
    );

    assertEquals(response.status, 201, `Expected ${testCase.format} upload to succeed`);
    assert(
      response.headers.get("content-type")?.startsWith("application/json"),
      "Expected an application/json success response",
    );

    const body: unknown = await response.json();
    assert(isRecord(body));
    assert(typeof body.id === "string");
    assert(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(body.id),
      "Expected a UUID response id",
    );
    assert(typeof body.url === "string");
    assertEquals(body.createdAt, CREATED_AT);
    assertEquals(
      new Date(body.createdAt as string).getTime(),
      Date.parse(CREATED_AT),
    );

    const persisted = db.contents.get(body.id);
    assert(persisted !== undefined, "Expected content to be inserted in the database");
    assertEquals(persisted.image_url, body.url);
    assertEquals(persisted.created_at, body.createdAt as string);
    assert(storage.has(body.url), "Expected image bytes to be stored");
    assertEquals(storage.get(body.url)?.format, testCase.format);
  }
});

Deno.test("images integration: non-POST methods return 405 with Allow POST", async () => {
  for (const method of ["GET", "PUT", "DELETE", "PATCH"]) {
    const { db, handler } = createHarness();
    const response = await handler(new Request(ENDPOINT, { method }));

    await assertError(response, 405);
    assertEquals(response.headers.get("allow"), "POST");
    assertEquals(db.authLookups.length, 0);
  }
});

Deno.test("images integration: missing and empty authorization return 401", async () => {
  for (const authorization of [undefined, ""] as const) {
    const { db, handler } = createHarness();
    const headers = new Headers();
    if (authorization !== undefined) {
      headers.set("Authorization", authorization);
    }

    const response = await handler(
      new Request(ENDPOINT, { method: "POST", headers }),
    );

    await assertError(response, 401);
    assertEquals(db.authLookups.length, 0);
  }
});

Deno.test("images integration: invalid and unrecognized bearer tokens return 401", async () => {
  for (const authorization of [
    "not-a-bearer-token",
    "Bearer unknown-token",
  ]) {
    const { db, handler } = createHarness();
    const response = await handler(
      uploadRequest(png(), "image.png", "image/png", authorization),
    );

    await assertError(response, 401);
    assertEquals(db.contents.size, 0);
  }
});

Deno.test("images integration: non-editor and unconfigured editor access fail closed with 403", async () => {
  const nonEditor = createHarness();
  const nonEditorResponse = await nonEditor.handler(
    uploadRequest(png(), "image.png", "image/png", "Bearer other-token"),
  );
  await assertError(nonEditorResponse, 403);
  assertEquals(nonEditor.db.contents.size, 0);

  const unconfigured = createHarness();
  unconfigured.db.editorSubject = null;
  const unconfiguredResponse = await unconfigured.handler(
    uploadRequest(png(), "image.png", "image/png"),
  );
  await assertError(unconfiguredResponse, 403);
  assertEquals(unconfigured.db.contents.size, 0);
});

Deno.test("images integration: non-multipart requests return 400", async () => {
  for (const [contentType, body] of [
    ["application/json", "{}"],
    ["text/plain", "image bytes"],
  ] as const) {
    const { db, handler } = createHarness();
    const response = await handler(
      new Request(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: "Bearer editor-token",
          "Content-Type": contentType,
        },
        body,
      }),
    );

    await assertError(response, 400);
    assertEquals(db.insertAttempts.length, 0);
  }
});

Deno.test("images integration: multipart requests require exactly one file field", async () => {
  const invalidForms: FormData[] = [];

  invalidForms.push(new FormData());

  const extraField = new FormData();
  extraField.set("file", new File([png()], "image.png", { type: "image/png" }));
  extraField.set("caption", "unexpected");
  invalidForms.push(extraField);

  const multipleFiles = new FormData();
  multipleFiles.append("file", new File([png()], "first.png", { type: "image/png" }));
  multipleFiles.append("file", new File([png()], "second.png", { type: "image/png" }));
  invalidForms.push(multipleFiles);

  for (const form of invalidForms) {
    const { db, handler } = createHarness();
    const response = await handler(multipartRequest(form));

    await assertError(response, 400);
    assertEquals(db.insertAttempts.length, 0);
  }
});

Deno.test("images integration: files larger than 5 MiB return 413", async () => {
  const { db, handler } = createHarness();
  const bytes = new Uint8Array(5 * 1024 * 1024 + 1);
  bytes.set(png());

  const response = await handler(
    uploadRequest(bytes, "oversized.png", "image/png"),
  );

  await assertError(response, 413);
  assertEquals(db.insertAttempts.length, 0);
});

Deno.test("images integration: invalid image content and dimensions return 422", async () => {
  const invalidImages = [
    {
      name: "corrupt.png",
      type: "image/png",
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    },
    {
      name: "wrong-magic.png",
      type: "image/png",
      bytes: new Uint8Array([0x00, 0x01, 0x02, 0x03]),
    },
    {
      name: "disguised.png",
      type: "image/png",
      bytes: new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>"),
    },
    {
      name: "too-wide.png",
      type: "image/png",
      bytes: png(4097, 32),
    },
    {
      name: "too-tall.webp",
      type: "image/webp",
      bytes: webp(32, 4097),
    },
  ];

  for (const invalidImage of invalidImages) {
    const { db, handler } = createHarness();
    const response = await handler(
      uploadRequest(invalidImage.bytes, invalidImage.name, invalidImage.type),
    );

    await assertError(response, 422);
    assertEquals(db.insertAttempts.length, 0);
  }
});

Deno.test("images integration: failed database insert deletes the uploaded object and returns 500", async () => {
  const { db, storage, handler } = createHarness();
  db.failInsert = true;

  const response = await handler(
    uploadRequest(png(640, 480), "image.png", "image/png"),
  );

  await assertError(response, 500);
  assertEquals(db.insertAttempts.length, 1);
  assertEquals(db.contents.size, 0);
  const uploadedUrl = db.insertAttempts[0].image_url;
  assertEquals(storage.has(uploadedUrl), false);
});
