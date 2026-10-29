import { MemoryStorageAdapter } from "./memory_storage_adapter.ts";
import type { ValidatedImage } from "./image_validator.ts";
import { VercelBlobStorageAdapter } from "./vercel_blob_storage_adapter.ts";

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

async function assertRejects(
  operation: () => Promise<unknown> | unknown,
  expectedMessage: string,
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    assert(error instanceof Error, "Expected an Error");
    assert(
      error.message.includes(expectedMessage),
      `Expected error message to include ${expectedMessage}, received ${error.message}`,
    );
    return;
  }

  throw new Error(`Expected operation to reject with ${expectedMessage}`);
}

const pngImage: ValidatedImage = {
  bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
  format: "png",
  contentType: "image/png",
  width: 32,
  height: 24,
};

const jpegImage: ValidatedImage = {
  bytes: new Uint8Array([0xff, 0xd8, 0xff]),
  format: "jpeg",
  contentType: "image/jpeg",
  width: 48,
  height: 36,
};

Deno.test("MemoryStorageAdapter stores and exposes images at deterministic public URLs", async () => {
  const adapter = new MemoryStorageAdapter();

  const url = await adapter.store("content-1", pngImage);

  assertEquals(
    url,
    "https://media.example.invalid/publications/content-1.png",
  );
  assertEquals(adapter.has(url), true);
  assertEquals(adapter.get(url), pngImage);
});

Deno.test("MemoryStorageAdapter replaces a content URL deterministically", async () => {
  const adapter = new MemoryStorageAdapter();

  const firstUrl = await adapter.store("content-2", pngImage);
  const secondUrl = await adapter.store("content-2", jpegImage);

  assertEquals(adapter.has(firstUrl), false);
  assertEquals(
    secondUrl,
    "https://media.example.invalid/publications/content-2.jpeg",
  );
  assertEquals(adapter.get(secondUrl), jpegImage);
});

Deno.test("MemoryStorageAdapter deletes stored images and reports missing images", async () => {
  const adapter = new MemoryStorageAdapter();
  const url = await adapter.store("content-3", pngImage);

  assertEquals(await adapter.delete(url), true);
  assertEquals(adapter.has(url), false);
  assertEquals(adapter.get(url), undefined);
  assertEquals(await adapter.delete(url), false);
});

Deno.test("MemoryStorageAdapter clears all stored images", async () => {
  const adapter = new MemoryStorageAdapter();
  const firstUrl = await adapter.store("content-4", pngImage);
  const secondUrl = await adapter.store("content-5", jpegImage);

  adapter.clear();

  assertEquals(adapter.has(firstUrl), false);
  assertEquals(adapter.has(secondUrl), false);
});

Deno.test("VercelBlobStorageAdapter fails closed without a server token", () => {
  let thrown: unknown;
  try {
    new VercelBlobStorageAdapter({ token: "" });
  } catch (error) {
    thrown = error;
  }

  assert(thrown instanceof Error, "Expected missing token to throw");
  assert(
    thrown.message.includes("BLOB_READ_WRITE_TOKEN"),
    "Expected the missing-token error to identify the server token",
  );
});

Deno.test("VercelBlobStorageAdapter uploads validated bytes with the expected pathname and headers", async () => {
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const fetchFn = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    calls.push({ input: String(input), init });
    return Response.json({
      url: "https://public.example.invalid/publications/content-6.png",
    });
  }) as typeof fetch;
  const adapter = new VercelBlobStorageAdapter({
    token: "server-token",
    fetchFn,
  });

  const url = await adapter.store("content-6", pngImage);

  assertEquals(
    url,
    "https://public.example.invalid/publications/content-6.png",
  );
  assertEquals(calls.length, 1);
  assertEquals(
    calls[0].input,
    "https://blob.vercel-storage.com/publications/content-6.png",
  );
  assertEquals(calls[0].init?.method, "PUT");
  const headers = new Headers(calls[0].init?.headers);
  assertEquals(headers.get("authorization"), "Bearer server-token");
  assertEquals(headers.get("content-type"), "image/png");
  assertEquals(calls[0].init?.body, pngImage.bytes);
});

Deno.test("VercelBlobStorageAdapter deletes by public URL pathname", async () => {
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const fetchFn = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    calls.push({ input: String(input), init });
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  const adapter = new VercelBlobStorageAdapter({
    token: "server-token",
    fetchFn,
    baseUrl: "https://blob.example.test/",
  });

  const deleted = await adapter.delete(
    "https://public.example.invalid/publications/content-7.webp",
  );

  assertEquals(deleted, true);
  assertEquals(calls[0].input, "https://blob.example.test/publications/content-7.webp");
  assertEquals(calls[0].init?.method, "DELETE");
  assertEquals(
    new Headers(calls[0].init?.headers).get("authorization"),
    "Bearer server-token",
  );
});

Deno.test("VercelBlobStorageAdapter deletes by pathname and treats not found as absent", async () => {
  const calls: string[] = [];
  const fetchFn = (async (
    input: string | URL | Request,
    _init?: RequestInit,
  ): Promise<Response> => {
    calls.push(String(input));
    return new Response(null, { status: 404 });
  }) as typeof fetch;
  const adapter = new VercelBlobStorageAdapter({
    token: "server-token",
    fetchFn,
  });

  assertEquals(await adapter.delete("publications/content-8.jpeg"), false);
  assertEquals(
    calls[0],
    "https://blob.vercel-storage.com/publications/content-8.jpeg",
  );
});

Deno.test("VercelBlobStorageAdapter surfaces upload and delete API failures", async () => {
  const fetchFn = (async (
    _input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    return new Response("provider unavailable", {
      status: init?.method === "PUT" ? 503 : 500,
    });
  }) as typeof fetch;
  const adapter = new VercelBlobStorageAdapter({
    token: "server-token",
    fetchFn,
  });

  await assertRejects(
    () => adapter.store("content-9", pngImage),
    "upload failed with status 503",
  );
  await assertRejects(
    () => adapter.delete("publications/content-9.png"),
    "delete failed with status 500",
  );
});
