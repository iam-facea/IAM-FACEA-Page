import {
  createEditorPublicationsHandler,
  type EditorPublicationRow,
  type EditorPublicationsDatabaseClient,
  ImageUnavailableError,
} from "./handler.ts";
import type {
  PublicationCreateData,
  PublicationReplaceData,
} from "../_shared/publication_validator.ts";

const ENDPOINT = "http://localhost/functions/v1/editor-publications";
const EDITOR_SUBJECT = "00000000-0000-4000-8000-000000000001";
const OTHER_SUBJECT = "00000000-0000-4000-8000-000000000002";
const FIRST_ID = "f3a6128c-4a65-4810-a441-e19ab1d6d855";
const SECOND_ID = "64e0e8d4-56b4-4bd0-990f-0f3bc5e6bb31";
const CREATED_ID = "00000000-0000-4000-8000-000000000003";
const MISSING_ID = "00000000-0000-4000-8000-000000000099";
const FIRST_IMAGE_ID = "00000000-0000-4000-8000-000000000010";
const SECOND_IMAGE_ID = "00000000-0000-4000-8000-000000000011";
const FREE_IMAGE_ID = "00000000-0000-4000-8000-000000000012";
const REPLACEMENT_IMAGE_ID = "00000000-0000-4000-8000-000000000013";

interface StoredPublication {
  row: EditorPublicationRow;
  deletedAt: string | null;
}

class InMemoryEditorPublicationsDatabase
  implements EditorPublicationsDatabaseClient {
  editorSubject: string | null = EDITOR_SUBJECT;
  readonly tokens = new Map<string, string>([
    ["editor-token", EDITOR_SUBJECT],
    ["other-token", OTHER_SUBJECT],
  ]);
  readonly images = new Set([
    FIRST_IMAGE_ID,
    SECOND_IMAGE_ID,
    FREE_IMAGE_ID,
    REPLACEMENT_IMAGE_ID,
  ]);
  private readonly publications = new Map<string, StoredPublication>();
  private mutationCount = 0;

  constructor() {
    this.put(seedPublication(
      FIRST_ID,
      FIRST_IMAGE_ID,
      "draft",
      "2027-03-10T15:00:00Z",
    ));
    this.put(seedPublication(
      SECOND_ID,
      SECOND_IMAGE_ID,
      "published",
      "2027-03-10T15:00:00Z",
    ));
  }

  getAuthenticatedSubject(authHeader: string | null): Promise<string | null> {
    const match = authHeader === null
      ? null
      : /^Bearer\s+([^\s]+)$/.exec(authHeader);
    return Promise.resolve(match === null ? null : this.tokens.get(match[1]) ?? null);
  }

  getEditorSubject(): Promise<string | null> {
    return Promise.resolve(this.editorSubject);
  }

  listEditorPublications(params: {
    limit: number;
    cursorUpdatedAt: string | null;
    cursorId: string | null;
  }): Promise<EditorPublicationRow[]> {
    const active = [...this.publications.values()]
      .filter((publication) => publication.deletedAt === null)
      .map((publication) => publication.row)
      .sort(compareRows);
    const afterCursor = params.cursorUpdatedAt !== null && params.cursorId !== null
      ? active.filter((row) =>
        row.updated_at < params.cursorUpdatedAt! ||
        (row.updated_at === params.cursorUpdatedAt && row.id < params.cursorId!)
      )
      : active;
    return Promise.resolve(afterCursor.slice(0, params.limit).map(cloneRow));
  }

  getEditorPublication(id: string): Promise<EditorPublicationRow | null> {
    const publication = this.publications.get(id);
    return Promise.resolve(
      publication === undefined || publication.deletedAt !== null
        ? null
        : cloneRow(publication.row),
    );
  }

  createEditorPublication(
    data: PublicationCreateData & { publicationDate: string },
  ): Promise<EditorPublicationRow> {
    this.ensureImageAvailable(data.imageContentId);
    const timestamp = this.nextTimestamp();
    const row: EditorPublicationRow = {
      id: CREATED_ID,
      title: data.title,
      description: data.description,
      category: data.category,
      publication_date: data.publicationDate,
      status: data.status,
      created_at: timestamp,
      updated_at: timestamp,
      published_at: data.status === "published" ? timestamp : null,
      image: image(data.imageContentId),
    };
    this.put(row);
    return Promise.resolve(cloneRow(row));
  }

  replaceEditorPublication(
    id: string,
    data: PublicationReplaceData,
  ): Promise<EditorPublicationRow> {
    const stored = this.publications.get(id);
    if (stored === undefined || stored.deletedAt !== null) {
      return Promise.reject(new Error("inactive publication"));
    }
    this.ensureImageAvailable(data.imageContentId, id);
    const timestamp = this.nextTimestamp();
    const publishedAt = data.status === "draft"
      ? null
      : stored.row.status === "published"
      ? stored.row.published_at
      : timestamp;
    stored.row = {
      ...stored.row,
      title: data.title,
      description: data.description,
      category: data.category,
      publication_date: data.publicationDate,
      status: data.status,
      updated_at: timestamp,
      published_at: publishedAt,
      image: image(data.imageContentId),
    };
    return Promise.resolve(cloneRow(stored.row));
  }

  softDeletePublication(id: string): Promise<void> {
    const stored = this.publications.get(id);
    if (stored !== undefined && stored.deletedAt === null) {
      const timestamp = this.nextTimestamp();
      stored.deletedAt = timestamp;
      stored.row.updated_at = timestamp;
    }
    return Promise.resolve();
  }

  private put(row: EditorPublicationRow): void {
    this.publications.set(row.id, { row: cloneRow(row), deletedAt: null });
  }

  private ensureImageAvailable(imageId: string, publicationId?: string): void {
    const assignedElsewhere = [...this.publications.values()].some((stored) =>
      stored.row.image.id === imageId && stored.row.id !== publicationId
    );
    if (!this.images.has(imageId) || assignedElsewhere) {
      throw new ImageUnavailableError();
    }
  }

  private nextTimestamp(): string {
    const minute = 16 + this.mutationCount++;
    return `2027-03-10T${String(minute).padStart(2, "0")}:00:00Z`;
  }
}

function compareRows(left: EditorPublicationRow, right: EditorPublicationRow): number {
  return right.updated_at.localeCompare(left.updated_at) ||
    right.id.localeCompare(left.id);
}

function image(id: string): EditorPublicationRow["image"] {
  return {
    id,
    image_url: `https://media.example.invalid/${id}.webp`,
  };
}

function seedPublication(
  id: string,
  imageId: string,
  status: "draft" | "published",
  updatedAt: string,
): EditorPublicationRow {
  return {
    id,
    title: status === "draft" ? "Draft publication" : "Published publication",
    description: `${status} description`,
    category: "Institutional",
    publication_date: "2027-03-09",
    status,
    created_at: "2027-03-10T13:00:00Z",
    updated_at: updatedAt,
    published_at: status === "published" ? "2027-03-10T14:00:00Z" : null,
    image: image(imageId),
  };
}

function cloneRow(row: EditorPublicationRow): EditorPublicationRow {
  return { ...row, image: { ...row.image } };
}

function createHarness() {
  const db = new InMemoryEditorPublicationsDatabase();
  return {
    db,
    handler: createEditorPublicationsHandler({
      db,
      now: () => new Date("2027-03-10T02:30:00Z"),
    }),
  };
}

function request(
  path = "",
  init: RequestInit = {},
  token: string | null = "editor-token",
): Request {
  const headers = new Headers(init.headers);
  if (token !== null) headers.set("Authorization", `Bearer ${token}`);
  return new Request(`${ENDPOINT}${path}`, { ...init, headers });
}

function jsonRequest(
  path: string,
  method: "POST" | "PUT",
  body: unknown,
  token: string | null = "editor-token",
): Request {
  return request(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, token);
}

function createBody(imageContentId = FREE_IMAGE_ID): Record<string, unknown> {
  return {
    title: " New publication ",
    description: " Full integration lifecycle. ",
    category: " Institutional ",
    imageContentId,
  };
}

function replacementBody(
  imageContentId = REPLACEMENT_IMAGE_ID,
): Record<string, unknown> {
  return {
    title: "Replacement title",
    description: "Replacement description",
    category: "Academic",
    publicationDate: "2027-03-11",
    status: "published",
    imageContentId,
  };
}

function assert(condition: unknown, message = "Assertion failed"): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals<T>(actual: T, expected: T): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
}

function assertRecord(value: unknown): asserts value is Record<string, unknown> {
  assert(typeof value === "object" && value !== null && !Array.isArray(value));
}

async function assertError(response: Response, status: number): Promise<void> {
  assertEquals(response.status, status);
  const body: unknown = await response.json();
  assertRecord(body);
  assert(typeof body.error === "string" && body.error.length > 0);
}

Deno.test("editor publications integration: full create, detail, list, replace, and delete lifecycle", async () => {
  const { handler } = createHarness();

  const createResponse = await handler(jsonRequest("", "POST", createBody()));
  assertEquals(createResponse.status, 201);
  assertEquals(
    createResponse.headers.get("location"),
    `/functions/v1/editor-publications/${CREATED_ID}`,
  );
  const created: unknown = await createResponse.json();
  assertRecord(created);
  assertEquals(created.id, CREATED_ID);
  assertEquals(created.title, "New publication");
  assertEquals(created.status, "draft");
  assertEquals(created.publicationDate, "2027-03-09");
  assertEquals(created.publishedAt, null);

  const detailResponse = await handler(request(`/${CREATED_ID}`));
  assertEquals(detailResponse.status, 200);
  const detail: unknown = await detailResponse.json();
  assertRecord(detail);
  assertEquals(Object.keys(detail).sort(), [
    "category",
    "createdAt",
    "description",
    "id",
    "image",
    "publicationDate",
    "publishedAt",
    "status",
    "title",
    "updatedAt",
  ]);
  assert(typeof detail.createdAt === "string");
  assert(typeof detail.updatedAt === "string");
  assertRecord(detail.image);
  assertEquals(detail.image.id, FREE_IMAGE_ID);
  assert(typeof detail.image.url === "string");

  const listResponse = await handler(request("?limit=10"));
  assertEquals(listResponse.status, 200);
  const list: unknown = await listResponse.json();
  assertRecord(list);
  assert(Array.isArray(list.items));
  assert(list.items.some((item) =>
    (item as Record<string, unknown>).status === "draft"
  ));
  assert(list.items.some((item) =>
    (item as Record<string, unknown>).status === "published"
  ));
  assert(list.items.some((item) =>
    (item as Record<string, unknown>).id === CREATED_ID
  ));

  const replaceResponse = await handler(
    jsonRequest(`/${CREATED_ID}`, "PUT", replacementBody()),
  );
  assertEquals(replaceResponse.status, 200);
  const replaced: unknown = await replaceResponse.json();
  assertRecord(replaced);
  assertEquals(replaced.title, "Replacement title");
  assertEquals(replaced.description, "Replacement description");
  assertEquals(replaced.category, "Academic");
  assertEquals(replaced.publicationDate, "2027-03-11");
  assertEquals(replaced.status, "published");
  assert(typeof replaced.publishedAt === "string");
  assertRecord(replaced.image);
  assertEquals(replaced.image.id, REPLACEMENT_IMAGE_ID);

  const deleteResponse = await handler(
    request(`/${CREATED_ID}`, { method: "DELETE" }),
  );
  assertEquals(deleteResponse.status, 204);
  assertEquals(await deleteResponse.text(), "");

  const repeatedDeleteResponse = await handler(
    request(`/${CREATED_ID}`, { method: "DELETE" }),
  );
  assertEquals(repeatedDeleteResponse.status, 204);
  assertEquals(await repeatedDeleteResponse.text(), "");

  await assertError(await handler(request(`/${CREATED_ID}`)), 404);
});

Deno.test("editor publications integration: list keyset cursor roundtrips updatedAt and id", async () => {
  const { handler } = createHarness();
  const firstResponse = await handler(request("?limit=1"));

  assertEquals(firstResponse.status, 200);
  const firstPage: unknown = await firstResponse.json();
  assertRecord(firstPage);
  assert(Array.isArray(firstPage.items));
  assertEquals(firstPage.items.length, 1);
  assertEquals((firstPage.items[0] as Record<string, unknown>).id, FIRST_ID);
  assert(typeof firstPage.nextCursor === "string");

  const secondResponse = await handler(request(
    `?limit=1&cursor=${encodeURIComponent(firstPage.nextCursor)}`,
  ));
  assertEquals(secondResponse.status, 200);
  const secondPage: unknown = await secondResponse.json();
  assertRecord(secondPage);
  assert(Array.isArray(secondPage.items));
  assertEquals(secondPage.items.length, 1);
  assertEquals((secondPage.items[0] as Record<string, unknown>).id, SECOND_ID);
  assertEquals(secondPage.nextCursor, null);
});

Deno.test("editor publications integration: missing and deleted details return 404", async () => {
  const { handler } = createHarness();

  await assertError(await handler(request(`/${MISSING_ID}`)), 404);
  assertEquals(
    (await handler(request(`/${FIRST_ID}`, { method: "DELETE" }))).status,
    204,
  );
  await assertError(await handler(request(`/${FIRST_ID}`)), 404);
});

Deno.test("editor publications integration: unauthenticated and non-editor requests fail closed", async () => {
  const { handler } = createHarness();

  await assertError(await handler(request("", {}, null)), 401);
  await assertError(await handler(request("", {}, "other-token")), 403);
});

Deno.test("editor publications integration: replacing an inactive publication returns 404", async () => {
  const { handler } = createHarness();
  assertEquals(
    (await handler(request(`/${FIRST_ID}`, { method: "DELETE" }))).status,
    204,
  );

  await assertError(
    await handler(jsonRequest(`/${FIRST_ID}`, "PUT", replacementBody())),
    404,
  );
});

Deno.test("editor publications integration: assigned images return 422 on create and replace", async () => {
  const { handler } = createHarness();

  await assertError(
    await handler(jsonRequest("", "POST", createBody(FIRST_IMAGE_ID))),
    422,
  );
  await assertError(
    await handler(
      jsonRequest(`/${SECOND_ID}`, "PUT", replacementBody(FIRST_IMAGE_ID)),
    ),
    422,
  );
});

Deno.test("editor publications integration: route-specific unsupported methods return 405", async () => {
  const { handler } = createHarness();
  const cases = [
    ["", "PUT", "GET, POST"],
    [`/${FIRST_ID}`, "POST", "GET, PUT, DELETE"],
  ] as const;

  for (const [path, method, allow] of cases) {
    const response = await handler(request(path, { method }));
    await assertError(response, 405);
    assertEquals(response.headers.get("allow"), allow);
  }
});
