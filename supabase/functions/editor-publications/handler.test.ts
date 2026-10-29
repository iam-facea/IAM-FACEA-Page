import {
  createEditorPublicationsHandler,
  type EditorPublicationRow,
  type EditorPublicationsDatabaseClient,
  ImageUnavailableError,
} from "./handler.ts";
import { decodeEditorCursor, encodeEditorCursor } from "../_shared/cursor.ts";
import { SupabaseEditorPublicationsDatabaseClient } from "./index.ts";

const FIRST_ID = "f3a6128c-4a65-4810-a441-e19ab1d6d855";
const SECOND_ID = "64e0e8d4-56b4-4bd0-990f-0f3bc5e6bb31";
const THIRD_ID = "00000000-0000-4000-8000-000000000003";
const IMAGE_ID = "00000000-0000-4000-8000-000000000010";
const OTHER_IMAGE_ID = "00000000-0000-4000-8000-000000000011";

interface HarnessOptions {
  authenticatedSubject?: string | null;
  editorSubject?: string | null;
  listRows?: EditorPublicationRow[];
  detailRow?: EditorPublicationRow | null;
  createdRow?: EditorPublicationRow;
  replacedRow?: EditorPublicationRow;
  error?: Error;
  createError?: Error;
  replaceError?: Error;
}

function publicationRow(
  id = FIRST_ID,
  updatedAt = "2027-03-10T14:00:00Z",
  imageId = IMAGE_ID,
): EditorPublicationRow {
  return {
    id,
    title: "Jornada de investigación",
    description: "Actividad académica abierta a la comunidad.",
    category: "Institucional",
    publication_date: "2027-03-09",
    status: "draft",
    created_at: "2027-03-10T13:00:00Z",
    updated_at: updatedAt,
    published_at: null,
    image: {
      id: imageId,
      image_url: `https://media.example.invalid/${imageId}.webp`,
    },
  };
}

function createHarness(options: HarnessOptions = {}) {
  const authHeaders: Array<string | null> = [];
  const listCalls: Parameters<EditorPublicationsDatabaseClient["listEditorPublications"]>[0][] = [];
  const detailCalls: string[] = [];
  const createCalls: Parameters<EditorPublicationsDatabaseClient["createEditorPublication"]>[0][] = [];
  const replaceCalls: Array<{
    id: string;
    data: Parameters<EditorPublicationsDatabaseClient["replaceEditorPublication"]>[1];
  }> = [];
  const deleteCalls: string[] = [];
  let editorLookups = 0;

  const db: EditorPublicationsDatabaseClient = {
    getAuthenticatedSubject(authHeader) {
      authHeaders.push(authHeader);
      if (options.error !== undefined) return Promise.reject(options.error);
      return Promise.resolve(options.authenticatedSubject === undefined
        ? "editor-subject"
        : options.authenticatedSubject);
    },
    getEditorSubject() {
      editorLookups++;
      if (options.error !== undefined) return Promise.reject(options.error);
      return Promise.resolve(options.editorSubject === undefined
        ? "editor-subject"
        : options.editorSubject);
    },
    listEditorPublications(params) {
      listCalls.push(params);
      if (options.error !== undefined) return Promise.reject(options.error);
      return Promise.resolve(options.listRows ?? []);
    },
    getEditorPublication(id) {
      detailCalls.push(id);
      if (options.error !== undefined) return Promise.reject(options.error);
      return Promise.resolve(options.detailRow === undefined
        ? publicationRow(id)
        : options.detailRow);
    },
    createEditorPublication(data) {
      createCalls.push(data);
      if (options.createError !== undefined) {
        return Promise.reject(options.createError);
      }
      if (options.error !== undefined) return Promise.reject(options.error);
      return Promise.resolve(options.createdRow ?? publicationRow());
    },
    replaceEditorPublication(id, data) {
      replaceCalls.push({ id, data });
      if (options.replaceError !== undefined) {
        return Promise.reject(options.replaceError);
      }
      if (options.error !== undefined) return Promise.reject(options.error);
      return Promise.resolve(options.replacedRow ?? publicationRow(id));
    },
    softDeletePublication(id) {
      deleteCalls.push(id);
      if (options.error !== undefined) return Promise.reject(options.error);
      return Promise.resolve();
    },
  };

  return {
    handler: createEditorPublicationsHandler({
      db,
      now: () => new Date("2027-03-10T02:30:00Z"),
    }),
    authHeaders,
    listCalls,
    detailCalls,
    createCalls,
    replaceCalls,
    deleteCalls,
    editorLookups: () => editorLookups,
  };
}

function request(
  path: string,
  init: RequestInit = {},
  authenticated = true,
): Request {
  const headers = new Headers(init.headers);
  if (authenticated) headers.set("Authorization", "Bearer editor-token");
  return new Request(`http://localhost${path}`, { ...init, headers });
}

function jsonRequest(path: string, method: string, body: unknown): Request {
  return request(path, {
    method,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
}

function validCreate(overrides: Record<string, unknown> = {}) {
  return {
    title: " Jornada de investigación ",
    description: " Actividad académica abierta a la comunidad. ",
    category: " Institucional ",
    imageContentId: IMAGE_ID,
    ...overrides,
  };
}

function validReplace(overrides: Record<string, unknown> = {}) {
  return {
    title: "Jornada de investigación 2027",
    description: "Actividad académica abierta a la comunidad.",
    category: "Institucional",
    publicationDate: "2027-03-09",
    status: "published",
    imageContentId: OTHER_IMAGE_ID,
    ...overrides,
  };
}

function assert(condition: unknown, message = "Assertion failed"): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals<T>(actual: T, expected: T): void {
  if (stableJson(actual) !== stableJson(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, nested) => {
    if (
      typeof nested !== "object" || nested === null || Array.isArray(nested)
    ) {
      return nested;
    }

    return Object.fromEntries(
      Object.entries(nested as Record<string, unknown>).sort(([left], [right]) =>
        left.localeCompare(right)
      ),
    );
  });
}

async function assertError(response: Response, status: number): Promise<void> {
  assertEquals(response.status, status);
  assert(
    response.headers.get("content-type")?.startsWith("application/json"),
    "Expected an application/json error response",
  );
  const body: unknown = await response.json();
  assert(
    typeof body === "object" && body !== null &&
      typeof (body as Record<string, unknown>).error === "string",
    "Expected an error message",
  );
}

Deno.test("editor publications requires authentication before database operations", async () => {
  for (const authorization of [undefined, ""] as const) {
    const harness = createHarness();
    const headers = new Headers();
    if (authorization !== undefined) headers.set("Authorization", authorization);

    const response = await harness.handler(
      new Request("http://localhost/functions/v1/editor-publications", { headers }),
    );

    await assertError(response, 401);
    assertEquals(harness.authHeaders.length, 0);
  }
});

Deno.test("editor publications returns 401 for an invalid token", async () => {
  const harness = createHarness({ authenticatedSubject: null });
  const response = await harness.handler(
    request("/functions/v1/editor-publications"),
  );

  await assertError(response, 401);
  assertEquals(harness.editorLookups(), 0);
});

Deno.test("editor publications returns 403 for a non-editor or missing editor configuration", async () => {
  for (const options of [
    { authenticatedSubject: "another-subject" },
    { editorSubject: null },
  ]) {
    const harness = createHarness(options);
    const response = await harness.handler(request("/editor-publications"));

    await assertError(response, 403);
    assertEquals(harness.listCalls.length, 0);
  }
});

Deno.test("editor publications enforces route-specific methods", async () => {
  const cases = [
    ["/functions/v1/editor-publications", "PUT", "GET, POST"],
    [`/editor-publications/${FIRST_ID}`, "POST", "GET, PUT, DELETE"],
  ] as const;

  for (const [path, method, allow] of cases) {
    const harness = createHarness();
    const response = await harness.handler(request(path, { method }));

    await assertError(response, 405);
    assertEquals(response.headers.get("allow"), allow);
    assertEquals(harness.authHeaders.length, 0);
  }
});

Deno.test("editor publications returns 404 for unsupported paths", async () => {
  const harness = createHarness();
  const response = await harness.handler(
    request("/functions/v1/editor-publications/extra/path"),
  );

  await assertError(response, 404);
  assertEquals(harness.authHeaders.length, 0);
});

Deno.test("editor list supports both route forms and default pagination", async () => {
  const row = publicationRow();
  for (const path of [
    "/functions/v1/editor-publications",
    "/editor-publications",
  ]) {
    const harness = createHarness({ listRows: [row] });
    const response = await harness.handler(request(path));

    assertEquals(response.status, 200);
    assertEquals(await response.json(), {
      items: [{
        id: FIRST_ID,
        title: row.title,
        description: row.description,
        category: row.category,
        publicationDate: row.publication_date,
        status: "draft",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        publishedAt: null,
        image: { id: IMAGE_ID, url: row.image.image_url },
      }],
      nextCursor: null,
    });
    assertEquals(harness.listCalls, [{
      limit: 21,
      cursorUpdatedAt: null,
      cursorId: null,
    }]);
  }
});

Deno.test("editor list validates limits and cursor before querying", async () => {
  for (const query of [
    "limit=0",
    "limit=51",
    "limit=1.5",
    "cursor=not-a-cursor",
  ]) {
    const harness = createHarness();
    const response = await harness.handler(
      request(`/editor-publications?${query}`),
    );

    await assertError(response, 400);
    assertEquals(harness.listCalls.length, 0);
  }
});

Deno.test("editor list forwards keyset cursor and fetches limit plus one", async () => {
  const cursor = encodeEditorCursor("2027-03-10T14:00:00Z", FIRST_ID);
  const harness = createHarness();
  const response = await harness.handler(
    request(`/editor-publications?limit=50&cursor=${encodeURIComponent(cursor)}`),
  );

  assertEquals(response.status, 200);
  assertEquals(harness.listCalls, [{
    limit: 51,
    cursorUpdatedAt: "2027-03-10T14:00:00Z",
    cursorId: FIRST_ID,
  }]);
});

Deno.test("editor list slices the extra row and encodes the last returned keyset", async () => {
  const rows = [
    publicationRow(FIRST_ID, "2027-03-10T14:00:00Z"),
    publicationRow(SECOND_ID, "2027-03-10T13:00:00Z"),
    publicationRow(THIRD_ID, "2027-03-10T12:00:00Z"),
  ];
  const harness = createHarness({ listRows: rows });
  const response = await harness.handler(
    request("/functions/v1/editor-publications?limit=2"),
  );
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.items.map((item: { id: string }) => item.id), [
    FIRST_ID,
    SECOND_ID,
  ]);
  assertEquals(decodeEditorCursor(body.nextCursor), {
    updatedAt: "2027-03-10T13:00:00Z",
    id: SECOND_ID,
  });
});

Deno.test("editor detail validates UUID and returns an active publication", async () => {
  const invalidHarness = createHarness();
  const invalidResponse = await invalidHarness.handler(
    request("/editor-publications/not-a-uuid"),
  );
  await assertError(invalidResponse, 400);
  assertEquals(invalidHarness.detailCalls.length, 0);

  const harness = createHarness();
  const response = await harness.handler(
    request(`/functions/v1/editor-publications/${FIRST_ID}`),
  );
  assertEquals(response.status, 200);
  assertEquals((await response.json()).id, FIRST_ID);
  assertEquals(harness.detailCalls, [FIRST_ID]);
});

Deno.test("editor detail returns 404 for a missing or deleted publication", async () => {
  const harness = createHarness({ detailRow: null });
  const response = await harness.handler(
    request(`/editor-publications/${FIRST_ID}`),
  );

  await assertError(response, 404);
});

Deno.test("editor create requires application/json and valid PublicationCreate", async () => {
  const wrongTypeHarness = createHarness();
  const wrongTypeResponse = await wrongTypeHarness.handler(
    request("/editor-publications", { method: "POST", body: "{}" }),
  );
  await assertError(wrongTypeResponse, 415);

  const invalidHarness = createHarness();
  const invalidResponse = await invalidHarness.handler(
    jsonRequest("/editor-publications", "POST", validCreate({ title: "" })),
  );
  await assertError(invalidResponse, 400);
  assertEquals(invalidHarness.createCalls.length, 0);
});

Deno.test("editor create applies draft and Argentina date defaults and returns Location", async () => {
  const harness = createHarness();
  const response = await harness.handler(
    jsonRequest("/editor-publications", "POST", validCreate()),
  );

  assertEquals(response.status, 201);
  assertEquals(
    response.headers.get("location"),
    `/functions/v1/editor-publications/${FIRST_ID}`,
  );
  assertEquals((await response.json()).id, FIRST_ID);
  assertEquals(harness.createCalls, [{
    title: "Jornada de investigación",
    description: "Actividad académica abierta a la comunidad.",
    category: "Institucional",
    status: "draft",
    publicationDate: "2027-03-09",
    imageContentId: IMAGE_ID,
  }]);
});

Deno.test("editor create preserves explicit values and maps unavailable images to 422", async () => {
  const unavailableHarness = createHarness({
    createError: new ImageUnavailableError(),
  });
  const unavailableResponse = await unavailableHarness.handler(
    jsonRequest("/editor-publications", "POST", validCreate()),
  );
  await assertError(unavailableResponse, 422);

  const harness = createHarness();
  const response = await harness.handler(jsonRequest(
    "/functions/v1/editor-publications",
    "POST",
    validCreate({ publicationDate: "2027-03-08", status: "published" }),
  ));
  assertEquals(response.status, 201);
  assertEquals(harness.createCalls[0].publicationDate, "2027-03-08");
  assertEquals(harness.createCalls[0].status, "published");
});

Deno.test("editor replace validates UUID, content type, and complete PublicationReplace", async () => {
  const invalidIdHarness = createHarness();
  const invalidIdResponse = await invalidIdHarness.handler(
    jsonRequest("/editor-publications/not-a-uuid", "PUT", validReplace()),
  );
  await assertError(invalidIdResponse, 400);

  const wrongTypeHarness = createHarness();
  const wrongTypeResponse = await wrongTypeHarness.handler(request(
    `/editor-publications/${FIRST_ID}`,
    { method: "PUT", body: "{}" },
  ));
  await assertError(wrongTypeResponse, 415);

  const invalidHarness = createHarness();
  const { status: _status, ...partial } = validReplace();
  const invalidResponse = await invalidHarness.handler(
    jsonRequest(`/editor-publications/${FIRST_ID}`, "PUT", partial),
  );
  await assertError(invalidResponse, 400);
  assertEquals(invalidHarness.replaceCalls.length, 0);
});

Deno.test("editor replace returns 404 before replacement when the target is inactive", async () => {
  const harness = createHarness({ detailRow: null });
  const response = await harness.handler(
    jsonRequest(`/editor-publications/${FIRST_ID}`, "PUT", validReplace()),
  );

  await assertError(response, 404);
  assertEquals(harness.replaceCalls.length, 0);
});

Deno.test("editor replace maps image reassignment to 422 and returns the updated response", async () => {
  const unavailableHarness = createHarness({
    replaceError: new ImageUnavailableError(),
  });
  const unavailableResponse = await unavailableHarness.handler(
    jsonRequest(`/editor-publications/${FIRST_ID}`, "PUT", validReplace()),
  );
  await assertError(unavailableResponse, 422);

  const updated = publicationRow(FIRST_ID, "2027-03-10T15:00:00Z", OTHER_IMAGE_ID);
  updated.status = "published";
  updated.published_at = "2027-03-10T15:00:00Z";
  const harness = createHarness({ replacedRow: updated });
  const response = await harness.handler(
    jsonRequest(`/editor-publications/${FIRST_ID}`, "PUT", validReplace()),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.status, "published");
  assertEquals(body.image.id, OTHER_IMAGE_ID);
  assertEquals(harness.replaceCalls, [{ id: FIRST_ID, data: validReplace() }]);
});

Deno.test("editor delete validates UUID and performs idempotent soft deletion with an empty 204", async () => {
  const invalidHarness = createHarness();
  const invalidResponse = await invalidHarness.handler(
    request("/editor-publications/not-a-uuid", { method: "DELETE" }),
  );
  await assertError(invalidResponse, 400);
  assertEquals(invalidHarness.deleteCalls.length, 0);

  const harness = createHarness();
  const response = await harness.handler(request(
    `/functions/v1/editor-publications/${FIRST_ID}`,
    { method: "DELETE" },
  ));

  assertEquals(response.status, 204);
  assertEquals(await response.text(), "");
  assertEquals(harness.deleteCalls, [FIRST_ID]);
});

Deno.test("editor handler returns 500 for unexpected database failures", async () => {
  const harness = createHarness({ error: new Error("database unavailable") });
  const response = await harness.handler(request("/editor-publications"));
  await assertError(response, 500);
});

Deno.test("Supabase editor client authenticates users and reads editor configuration", async () => {
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const fetcher: typeof fetch = (input, init) => {
    calls.push({ input: String(input), init });
    if (String(input).endsWith("/auth/v1/user")) {
      return Promise.resolve(Response.json({ id: "editor-subject" }));
    }
    return Promise.resolve(Response.json("editor-subject"));
  };
  const client = new SupabaseEditorPublicationsDatabaseClient(
    "https://project.example.invalid/",
    "synthetic-service-role-key",
    fetcher,
  );

  assertEquals(
    await client.getAuthenticatedSubject("Bearer editor-token"),
    "editor-subject",
  );
  assertEquals(await client.getEditorSubject(), "editor-subject");
  assertEquals(calls.map((call) => call.input), [
    "https://project.example.invalid/auth/v1/user",
    "https://project.example.invalid/rest/v1/rpc/get_editor_subject",
  ]);
  assertEquals(
    new Headers(calls[0].init?.headers).get("authorization"),
    "Bearer editor-token",
  );
});

Deno.test("Supabase editor client builds the descending keyset list query", async () => {
  const calls: string[] = [];
  const fetcher: typeof fetch = (input) => {
    calls.push(String(input));
    return Promise.resolve(Response.json([publicationRow()]));
  };
  const client = new SupabaseEditorPublicationsDatabaseClient(
    "https://project.example.invalid",
    "synthetic-service-role-key",
    fetcher,
  );

  const rows = await client.listEditorPublications({
    limit: 21,
    cursorUpdatedAt: "2027-03-10T14:00:00Z",
    cursorId: FIRST_ID,
  });

  assertEquals(rows.length, 1);
  const url = new URL(calls[0]);
  assertEquals(url.pathname, "/rest/v1/publication");
  assertEquals(url.searchParams.get("deleted_at"), "is.null");
  assertEquals(url.searchParams.get("order"), "updated_at.desc,id.desc");
  assertEquals(url.searchParams.get("limit"), "21");
  assert(
    url.searchParams.get("or")?.includes(`id.lt.${FIRST_ID}`),
    "Expected the id tie-breaker in the keyset filter",
  );
});

Deno.test("Supabase editor client verifies image availability and requests the image projection on create", async () => {
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const fetcher: typeof fetch = (input, init) => {
    calls.push({ input: String(input), init });
    const call = calls.length;
    if (call === 1) return Promise.resolve(Response.json([{ id: IMAGE_ID }]));
    if (call === 2) return Promise.resolve(Response.json([]));
    return Promise.resolve(Response.json([publicationRow()]));
  };
  const client = new SupabaseEditorPublicationsDatabaseClient(
    "https://project.example.invalid",
    "synthetic-service-role-key",
    fetcher,
  );

  const created = await client.createEditorPublication({
    title: "Jornada de investigación",
    description: "Actividad académica abierta a la comunidad.",
    category: "Institucional",
    publicationDate: "2027-03-09",
    status: "draft",
    imageContentId: IMAGE_ID,
  });

  assertEquals(created.id, FIRST_ID);
  assertEquals(calls.length, 3);
  assertEquals(new URL(calls[0].input).pathname, "/rest/v1/content");
  assertEquals(
    new URL(calls[1].input).searchParams.get("content_id"),
    `eq.${IMAGE_ID}`,
  );
  const insertUrl = new URL(calls[2].input);
  assertEquals(calls[2].init?.method, "POST");
  assert(
    insertUrl.searchParams.get("select")?.includes("image:content"),
    "Expected the inserted representation to include its image",
  );
});
