import {
  createPublicPublicationsHandler,
  type PublicPublicationRow,
  type PublicPublicationsDatabaseClient,
} from "./handler.ts";
import { decodePublicCursor, encodePublicCursor } from "../_shared/cursor.ts";
import { SupabasePublicPublicationsDatabaseClient } from "./index.ts";

const FIRST_ID = "f3a6128c-4a65-4810-a441-e19ab1d6d855";
const SECOND_ID = "64e0e8d4-56b4-4bd0-990f-0f3bc5e6bb31";
const THIRD_ID = "00000000-0000-4000-8000-000000000003";

interface ReadParams {
  id?: string | null;
  limit?: number | null;
  cursorDate?: string | null;
  cursorId?: string | null;
}

interface HarnessOptions {
  rows?: PublicPublicationRow[];
  error?: Error;
}

function row(
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

function createHarness(options: HarnessOptions = {}) {
  const calls: ReadParams[] = [];
  const db: PublicPublicationsDatabaseClient = {
    readPublications(params) {
      calls.push(params);
      if (options.error !== undefined) {
        return Promise.reject(options.error);
      }
      return Promise.resolve(options.rows ?? []);
    },
  };

  return {
    handler: createPublicPublicationsHandler({ db }),
    calls,
  };
}

function request(path: string, method = "GET"): Request {
  return new Request(`http://localhost${path}`, { method });
}

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

Deno.test("public publications handler allows GET only", async () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const harness = createHarness();
    const response = await harness.handler(
      request("/functions/v1/publications", method),
    );

    await assertError(response, 405);
    assertEquals(response.headers.get("allow"), "GET");
    assertEquals(harness.calls.length, 0);
  }
});

Deno.test("public publications list supports both route forms and default pagination", async () => {
  const publication = row(FIRST_ID, "2027-03-09", "first");

  for (const path of ["/functions/v1/publications", "/publications"]) {
    const harness = createHarness({ rows: [publication] });
    const response = await harness.handler(request(path));

    assertEquals(response.status, 200);
    assertEquals(await response.json(), {
      items: [{
        id: FIRST_ID,
        title: "Title first",
        description: "Description first",
        category: "Category first",
        publicationDate: "2027-03-09",
        imageUrl: "https://media.example.invalid/first.webp",
      }],
      nextCursor: null,
    });
    assertEquals(harness.calls, [{
      id: null,
      limit: 21,
      cursorDate: null,
      cursorId: null,
    }]);
  }
});

Deno.test("public publications list validates limit before querying", async () => {
  for (const invalidLimit of ["", "0", "51", "1.5", "+1", " 1", "01"]) {
    const harness = createHarness();
    const response = await harness.handler(
      request(`/functions/v1/publications?limit=${encodeURIComponent(invalidLimit)}`),
    );

    await assertError(response, 400);
    assertEquals(harness.calls.length, 0);
  }
});

Deno.test("public publications list accepts limit boundaries and queries limit plus one", async () => {
  for (const limit of [1, 50]) {
    const harness = createHarness();
    const response = await harness.handler(
      request(`/publications?limit=${limit}`),
    );

    assertEquals(response.status, 200);
    assertEquals(harness.calls[0].limit, limit + 1);
  }
});

Deno.test("public publications list rejects malformed cursors before querying", async () => {
  const harness = createHarness();
  const response = await harness.handler(
    request("/functions/v1/publications?cursor=not-a-valid-cursor"),
  );

  await assertError(response, 400);
  assertEquals(harness.calls.length, 0);
});

Deno.test("public publications list forwards a decoded keyset cursor", async () => {
  const cursor = encodePublicCursor("2027-03-09", FIRST_ID);
  const harness = createHarness();

  const response = await harness.handler(
    request(`/publications?limit=2&cursor=${encodeURIComponent(cursor)}`),
  );

  assertEquals(response.status, 200);
  assertEquals(harness.calls, [{
    id: null,
    limit: 3,
    cursorDate: "2027-03-09",
    cursorId: FIRST_ID,
  }]);
});

Deno.test("public publications list slices the extra row and emits a cursor from the last returned item", async () => {
  const rows = [
    row(FIRST_ID, "2027-03-09", "first"),
    row(SECOND_ID, "2027-03-08", "second"),
    row(THIRD_ID, "2027-03-07", "third"),
  ];
  const harness = createHarness({ rows });

  const response = await harness.handler(
    request("/functions/v1/publications?limit=2"),
  );
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.items.length, 2);
  assertEquals(body.items.map((item: { id: string }) => item.id), [
    FIRST_ID,
    SECOND_ID,
  ]);
  assert(typeof body.nextCursor === "string");
  assertEquals(decodePublicCursor(body.nextCursor), {
    date: "2027-03-08",
    id: SECOND_ID,
  });
});

Deno.test("public publications detail supports both route forms and maps the public projection", async () => {
  const publication = row(FIRST_ID, "2027-03-09", "detail");

  for (const path of [
    `/functions/v1/publications/${FIRST_ID}`,
    `/publications/${FIRST_ID}`,
  ]) {
    const harness = createHarness({ rows: [publication] });
    const response = await harness.handler(request(path));

    assertEquals(response.status, 200);
    assertEquals(await response.json(), {
      id: FIRST_ID,
      title: "Title detail",
      description: "Description detail",
      category: "Category detail",
      publicationDate: "2027-03-09",
      imageUrl: "https://media.example.invalid/detail.webp",
    });
    assertEquals(harness.calls, [{ id: FIRST_ID, limit: 1 }]);
  }
});

Deno.test("public publications detail validates UUIDs before querying", async () => {
  const harness = createHarness();
  const response = await harness.handler(
    request("/functions/v1/publications/not-a-uuid"),
  );

  await assertError(response, 400);
  assertEquals(harness.calls.length, 0);
});

Deno.test("public publications detail returns 404 when the RPC exposes no row", async () => {
  const harness = createHarness({ rows: [] });
  const response = await harness.handler(
    request(`/publications/${FIRST_ID}`),
  );

  await assertError(response, 404);
  assertEquals(harness.calls, [{ id: FIRST_ID, limit: 1 }]);
});

Deno.test("public publications handler returns 404 for unsupported paths", async () => {
  const harness = createHarness();
  const response = await harness.handler(
    request("/functions/v1/publications/extra/path"),
  );

  await assertError(response, 404);
  assertEquals(harness.calls.length, 0);
});

Deno.test("public publications handler returns 500 when the database read fails", async () => {
  const harness = createHarness({ error: new Error("database unavailable") });
  const response = await harness.handler(
    request("/functions/v1/publications"),
  );

  await assertError(response, 500);
});

Deno.test("public publications RPC client posts mapped parameters with the anon key", async () => {
  const publication = row(FIRST_ID, "2027-03-09", "rpc");
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const fetcher: typeof fetch = (input, init) => {
    calls.push({ input: String(input), init });
    return Promise.resolve(Response.json([publication]));
  };
  const client = new SupabasePublicPublicationsDatabaseClient(
    "https://project.example.invalid/",
    "synthetic-anon-key",
    fetcher,
  );

  const result = await client.readPublications({
    id: null,
    limit: 21,
    cursorDate: "2027-03-09",
    cursorId: FIRST_ID,
  });

  assertEquals(result, [publication]);
  assertEquals(calls.length, 1);
  assertEquals(
    calls[0].input,
    "https://project.example.invalid/rest/v1/rpc/read_publications",
  );
  assertEquals(calls[0].init?.method, "POST");
  const headers = new Headers(calls[0].init?.headers);
  assertEquals(headers.get("apikey"), "synthetic-anon-key");
  assertEquals(
    headers.get("authorization"),
    "Bearer synthetic-anon-key",
  );
  assertEquals(
    JSON.parse(String(calls[0].init?.body)),
    {
      p_id: null,
      p_limit: 21,
      p_cursor_date: "2027-03-09",
      p_cursor_id: FIRST_ID,
    },
  );
});
