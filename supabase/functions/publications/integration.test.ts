import {
  createPublicPublicationsHandler,
  type PublicPublicationRow,
  type PublicPublicationsDatabaseClient,
} from "./handler.ts";

const FIRST_ID = "f3a6128c-4a65-4810-a441-e19ab1d6d855";
const SECOND_ID = "64e0e8d4-56b4-4bd0-990f-0f3bc5e6bb31";
const THIRD_ID = "00000000-0000-4000-8000-000000000003";
const MISSING_ID = "00000000-0000-4000-8000-000000000099";
const ENDPOINT = "http://localhost/functions/v1/publications";

class InMemoryPublicationsDatabase implements PublicPublicationsDatabaseClient {
  constructor(private readonly rows: PublicPublicationRow[]) {}

  readPublications(params: {
    id?: string | null;
    limit?: number | null;
    cursorDate?: string | null;
    cursorId?: string | null;
  }): Promise<PublicPublicationRow[]> {
    if (params.id !== null && params.id !== undefined) {
      return Promise.resolve(this.rows.filter((row) => row.id === params.id));
    }

    const sorted = [...this.rows].sort(compareRows);
    const afterCursor = params.cursorDate !== null &&
        params.cursorDate !== undefined &&
        params.cursorId !== null &&
        params.cursorId !== undefined
      ? sorted.filter((row) =>
        row.publication_date < params.cursorDate! ||
        (row.publication_date === params.cursorDate && row.id < params.cursorId!)
      )
      : sorted;
    return Promise.resolve(afterCursor.slice(0, params.limit ?? 20));
  }
}

function compareRows(left: PublicPublicationRow, right: PublicPublicationRow): number {
  return right.publication_date.localeCompare(left.publication_date) ||
    right.id.localeCompare(left.id);
}

function publication(
  id: string,
  publicationDate: string,
  suffix: string,
): PublicPublicationRow {
  return {
    id,
    title: `Title ${suffix}`,
    description: `Description ${suffix}`,
    category: `Category ${suffix}`,
    publication_date: publicationDate,
    image_url: `https://media.example.invalid/${suffix}.webp`,
  };
}

function seededRows(): PublicPublicationRow[] {
  return [
    publication(FIRST_ID, "2027-03-10", "first"),
    publication(SECOND_ID, "2027-03-09", "second"),
    publication(THIRD_ID, "2027-03-08", "third"),
  ];
}

function createHandler(rows = seededRows()) {
  return createPublicPublicationsHandler({
    db: new InMemoryPublicationsDatabase(rows),
  });
}

function request(path = "", method = "GET"): Request {
  return new Request(`${ENDPOINT}${path}`, { method });
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

Deno.test("public publications integration: list schema, limits, and cursor roundtrip", async () => {
  const handler = createHandler();
  const firstResponse = await handler(request("?limit=2"));

  assertEquals(firstResponse.status, 200);
  const firstPage: unknown = await firstResponse.json();
  assertRecord(firstPage);
  assert(Array.isArray(firstPage.items));
  assertEquals(firstPage.items.length, 2);
  assert(typeof firstPage.nextCursor === "string");
  for (const item of firstPage.items) {
    assertRecord(item);
    assertEquals(Object.keys(item).sort(), [
      "category",
      "description",
      "id",
      "imageUrl",
      "publicationDate",
      "title",
    ]);
    assert(!Object.hasOwn(item, "publication_date"));
    assert(!Object.hasOwn(item, "image_url"));
  }
  assertEquals(firstPage.items.map((item) => (item as Record<string, unknown>).id), [
    FIRST_ID,
    SECOND_ID,
  ]);

  const secondResponse = await handler(
    request(`?limit=2&cursor=${encodeURIComponent(firstPage.nextCursor)}`),
  );
  assertEquals(secondResponse.status, 200);
  const secondPage: unknown = await secondResponse.json();
  assertRecord(secondPage);
  assert(Array.isArray(secondPage.items));
  assertEquals(secondPage.items.map((item) => (item as Record<string, unknown>).id), [
    THIRD_ID,
  ]);
  assertEquals(secondPage.nextCursor, null);

  for (const limit of [1, 50]) {
    const response = await handler(request(`?limit=${limit}`));
    assertEquals(response.status, 200);
    const page: unknown = await response.json();
    assertRecord(page);
    assert(Array.isArray(page.items));
    assertEquals(page.items.length, Math.min(limit, seededRows().length));
  }
});

Deno.test("public publications integration: empty list returns the canonical page", async () => {
  const response = await createHandler([])(request());

  assertEquals(response.status, 200);
  assertEquals(await response.json(), { items: [], nextCursor: null });
});

Deno.test("public publications integration: detail returns six camelCase fields", async () => {
  const response = await createHandler()(request(`/${FIRST_ID}`));

  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    id: FIRST_ID,
    title: "Title first",
    description: "Description first",
    category: "Category first",
    publicationDate: "2027-03-10",
    imageUrl: "https://media.example.invalid/first.webp",
  });
});

Deno.test("public publications integration: missing and malformed detail ids are distinguished", async () => {
  const handler = createHandler();

  await assertError(await handler(request(`/${MISSING_ID}`)), 404);
  await assertError(await handler(request("/not-a-uuid")), 400);
});

Deno.test("public publications integration: invalid limits and cursors return 400", async () => {
  const handler = createHandler();
  for (const query of [
    "limit=0",
    "limit=51",
    "limit=1.5",
    "limit=invalid",
    "cursor=not-a-cursor",
  ]) {
    await assertError(await handler(request(`?${query}`)), 400);
  }
});

Deno.test("public publications integration: write methods return 405", async () => {
  const handler = createHandler();
  for (const method of ["POST", "PUT", "DELETE"]) {
    const response = await handler(request("", method));
    await assertError(response, 405);
    assertEquals(response.headers.get("allow"), "GET");
  }
});
