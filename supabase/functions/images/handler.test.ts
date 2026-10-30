import {
  createImagesHandler,
  type DatabaseClient,
} from "./handler.ts";
import type { ValidatedImage } from "../_shared/image_validator.ts";
import type { StorageAdapter } from "../_shared/storage.ts";
import "./index.ts";

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

function png(width = 32, height = 24): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  bytes.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8);
  new DataView(bytes.buffer).setUint32(16, width, false);
  new DataView(bytes.buffer).setUint32(20, height, false);
  return bytes;
}

interface HarnessOptions {
  authenticatedSubject?: string | null;
  editorSubject?: string | null;
  insertError?: Error;
  storageError?: Error;
  deleteError?: Error;
}

function createHarness(options: HarnessOptions = {}) {
  const stored: Array<{ contentId: string; image: ValidatedImage }> = [];
  const deleted: string[] = [];
  const inserted: Array<{ id: string; image_url: string }> = [];
  const authHeaders: Array<string | null> = [];
  let editorLookups = 0;

  const storage: StorageAdapter = {
    store(contentId, image) {
      if (options.storageError !== undefined) {
        return Promise.reject(options.storageError);
      }
      stored.push({ contentId, image });
      return Promise.resolve(
        `https://media.example.invalid/publications/${contentId}.${image.format}`,
      );
    },
    delete(publicImageUrl) {
      deleted.push(publicImageUrl);
      if (options.deleteError !== undefined) {
        return Promise.reject(options.deleteError);
      }
      return Promise.resolve(true);
    },
  };

  const db: DatabaseClient = {
    getAuthenticatedSubject(authHeader) {
      authHeaders.push(authHeader);
      return Promise.resolve(options.authenticatedSubject === undefined
        ? "editor-subject"
        : options.authenticatedSubject);
    },
    getEditorSubject() {
      editorLookups++;
      return Promise.resolve(options.editorSubject === undefined
        ? "editor-subject"
        : options.editorSubject);
    },
    insertContent(record) {
      inserted.push(record);
      if (options.insertError !== undefined) {
        return Promise.reject(options.insertError);
      }
      return Promise.resolve({
        ...record,
        created_at: "2027-03-10T14:00:00Z",
      });
    },
  };

  return {
    handler: createImagesHandler({ storage, db }),
    stored,
    deleted,
    inserted,
    authHeaders,
    editorLookups: () => editorLookups,
  };
}

function multipartRequest(form: FormData): Request {
  return new Request("http://localhost/functions/v1/images", {
    method: "POST",
    headers: { Authorization: "Bearer editor-token" },
    body: form,
  });
}

function requestWithFile(bytes = png()): Request {
  const form = new FormData();
  form.set("file", new File([bytes], "image.png", { type: "image/png" }));
  return multipartRequest(form);
}

Deno.test("images handler allows POST only", async () => {
  const harness = createHarness();

  const response = await harness.handler(
    new Request("http://localhost/functions/v1/images", { method: "GET" }),
  );

  assertEquals(response.status, 405);
  assertEquals(response.headers.get("allow"), "POST");
  assertEquals(harness.authHeaders.length, 0);
});

Deno.test("images handler returns 401 for a missing or empty Authorization header", async () => {
  for (const authorization of [undefined, ""] as const) {
    const harness = createHarness();
    const headers = new Headers();
    if (authorization !== undefined) {
      headers.set("Authorization", authorization);
    }

    const response = await harness.handler(
      new Request("http://localhost/functions/v1/images", {
        method: "POST",
        headers,
      }),
    );

    assertEquals(response.status, 401);
    assertEquals(harness.authHeaders.length, 0);
  }
});

Deno.test("images handler returns 401 when the session is not authenticated", async () => {
  const harness = createHarness({ authenticatedSubject: null });

  const response = await harness.handler(requestWithFile());

  assertEquals(response.status, 401);
  assertEquals(harness.editorLookups(), 0);
});

Deno.test("images handler returns 403 for an authenticated non-editor", async () => {
  const harness = createHarness({ authenticatedSubject: "another-subject" });

  const response = await harness.handler(requestWithFile());

  assertEquals(response.status, 403);
  assertEquals(harness.stored.length, 0);
});

Deno.test("images handler fails closed with 403 when no editor subject is configured", async () => {
  const harness = createHarness({ editorSubject: null });

  const response = await harness.handler(requestWithFile());

  assertEquals(response.status, 403);
  assertEquals(harness.stored.length, 0);
});

Deno.test("images handler requires multipart/form-data", async () => {
  const harness = createHarness();

  const response = await harness.handler(
    new Request("http://localhost/functions/v1/images", {
      method: "POST",
      headers: {
        Authorization: "Bearer editor-token",
        "Content-Type": "application/json",
      },
      body: "{}",
    }),
  );

  assertEquals(response.status, 400);
  assertEquals(harness.stored.length, 0);
});

Deno.test("images handler requires the file field to contain a File", async () => {
  const missingFileHarness = createHarness();
  const missingResponse = await missingFileHarness.handler(
    multipartRequest(new FormData()),
  );

  const textFileHarness = createHarness();
  const form = new FormData();
  form.set("file", "not-a-file");
  const textResponse = await textFileHarness.handler(multipartRequest(form));

  assertEquals(missingResponse.status, 400);
  assertEquals(textResponse.status, 400);
});

Deno.test("images handler rejects extra fields and multiple files", async () => {
  const extraFieldHarness = createHarness();
  const extraFieldForm = new FormData();
  extraFieldForm.set("file", new File([png()], "image.png"));
  extraFieldForm.set("caption", "not supported");
  const extraFieldResponse = await extraFieldHarness.handler(
    multipartRequest(extraFieldForm),
  );

  const multipleFilesHarness = createHarness();
  const multipleFilesForm = new FormData();
  multipleFilesForm.append("file", new File([png()], "first.png"));
  multipleFilesForm.append("file", new File([png()], "second.png"));
  const multipleFilesResponse = await multipleFilesHarness.handler(
    multipartRequest(multipleFilesForm),
  );

  assertEquals(extraFieldResponse.status, 400);
  assertEquals(multipleFilesResponse.status, 400);
});

Deno.test("images handler returns 413 for files larger than 5 MiB", async () => {
  const harness = createHarness();
  const bytes = new Uint8Array(5 * 1024 * 1024 + 1);
  bytes.set(png());

  const response = await harness.handler(requestWithFile(bytes));

  assertEquals(response.status, 413);
  assertEquals(harness.stored.length, 0);
});

Deno.test("images handler returns 422 for unsupported, corrupt, or oversized-dimension images", async () => {
  const invalidImages = [
    new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    png(4097, 32),
  ];

  for (const bytes of invalidImages) {
    const harness = createHarness();
    const response = await harness.handler(requestWithFile(bytes));

    assertEquals(response.status, 422);
    assertEquals(harness.stored.length, 0);
  }
});

Deno.test("images handler stores and inserts a validated image before returning 201", async () => {
  const harness = createHarness();

  const response = await harness.handler(requestWithFile(png(640, 480)));
  const body = await response.json();

  assertEquals(response.status, 201);
  assertEquals(harness.stored.length, 1);
  assertEquals(harness.stored[0].image.format, "png");
  assertEquals(harness.stored[0].image.width, 640);
  assertEquals(harness.stored[0].image.height, 480);
  assertEquals(harness.inserted.length, 1);
  assertEquals(harness.inserted[0].id, harness.stored[0].contentId);
  assertEquals(harness.inserted[0].image_url, body.url);
  assertEquals(body.id, harness.stored[0].contentId);
  assertEquals(body.createdAt, "2027-03-10T14:00:00Z");
  assert(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      body.id,
    ),
    "Expected a random UUID",
  );
});

Deno.test("images handler compensates storage when the database insert fails", async () => {
  const harness = createHarness({ insertError: new Error("database unavailable") });

  const response = await harness.handler(requestWithFile());

  assertEquals(response.status, 500);
  assertEquals(harness.stored.length, 1);
  assertEquals(harness.deleted.length, 1);
  assertEquals(
    harness.deleted[0],
    `https://media.example.invalid/publications/${harness.stored[0].contentId}.png`,
  );
});

Deno.test("images handler remains 500 if compensatory deletion also fails", async () => {
  const harness = createHarness({
    insertError: new Error("database unavailable"),
    deleteError: new Error("storage unavailable"),
  });

  const response = await harness.handler(requestWithFile());

  assertEquals(response.status, 500);
  assertEquals(harness.deleted.length, 1);
});

Deno.test("images handler returns 500 when storage upload fails without inserting", async () => {
  const harness = createHarness({ storageError: new Error("storage unavailable") });

  const response = await harness.handler(requestWithFile());

  assertEquals(response.status, 500);
  assertEquals(harness.inserted.length, 0);
  assertEquals(harness.deleted.length, 0);
});

Deno.test("images handler responds to OPTIONS preflight and attaches CORS headers", async () => {
  const harness = createHarness();
  const preflightResponse = await harness.handler(
    new Request("http://localhost/functions/v1/images", { method: "OPTIONS" }),
  );

  assertEquals(preflightResponse.status, 200);
  assertEquals(preflightResponse.headers.get("access-control-allow-origin"), "*");
  assertEquals(
    preflightResponse.headers.get("access-control-allow-headers"),
    "authorization, x-client-info, apikey, content-type",
  );

  const unauthResponse = await harness.handler(
    new Request("http://localhost/functions/v1/images", { method: "POST" }),
  );
  assertEquals(unauthResponse.status, 401);
  assertEquals(unauthResponse.headers.get("access-control-allow-origin"), "*");
});

