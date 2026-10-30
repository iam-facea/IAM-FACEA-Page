import {
  corsHeaders,
  handleCorsPreflight,
  withCors,
} from "./cors.ts";

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

Deno.test("corsHeaders exposes standard Supabase CORS configuration", () => {
  assertEquals(corsHeaders["Access-Control-Allow-Origin"], "*");
  assert(corsHeaders["Access-Control-Allow-Headers"].includes("authorization"));
  assert(corsHeaders["Access-Control-Allow-Headers"].includes("apikey"));
  assert(corsHeaders["Access-Control-Allow-Headers"].includes("content-type"));
  assert(corsHeaders["Access-Control-Allow-Methods"].includes("OPTIONS"));
  assert(corsHeaders["Access-Control-Allow-Methods"].includes("GET"));
  assert(corsHeaders["Access-Control-Allow-Methods"].includes("POST"));
});

Deno.test("handleCorsPreflight returns 200 with CORS headers for OPTIONS requests", () => {
  const optionsRequest = new Request("https://example.invalid/functions/v1/publications", {
    method: "OPTIONS",
  });
  const response = handleCorsPreflight(optionsRequest);

  assert(response !== null, "Expected preflight response for OPTIONS");
  assertEquals(response.status, 200);
  assertEquals(
    response.headers.get("Access-Control-Allow-Origin"),
    "*",
  );
  assertEquals(
    response.headers.get("Access-Control-Allow-Headers"),
    "authorization, x-client-info, apikey, content-type",
  );
});

Deno.test("handleCorsPreflight returns null for non-OPTIONS requests", () => {
  for (const method of ["GET", "POST", "PUT", "DELETE"]) {
    const request = new Request("https://example.invalid/functions/v1/publications", {
      method,
    });
    assertEquals(handleCorsPreflight(request), null);
  }
});

Deno.test("withCors merges CORS headers into a response while preserving status and body", async () => {
  const original = Response.json({ hello: "world" }, {
    status: 201,
    headers: { "X-Custom": "test" },
  });

  const wrapped = withCors(original);

  assertEquals(wrapped.status, 201);
  assertEquals(wrapped.headers.get("X-Custom"), "test");
  assertEquals(wrapped.headers.get("Access-Control-Allow-Origin"), "*");
  assertEquals(
    wrapped.headers.get("Access-Control-Allow-Headers"),
    "authorization, x-client-info, apikey, content-type",
  );
  assertEquals(await wrapped.json(), { hello: "world" });
});
