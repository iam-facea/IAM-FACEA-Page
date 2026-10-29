import {
  ValidationError,
  validateId,
  validateLimit,
  validatePublicationCreate,
  validatePublicationReplace,
  validateUuid,
} from "./publication_validator.ts";

const IMAGE_ID = "64e0e8d4-56b4-4bd0-990f-0f3bc5e6bb31";

function assert(condition: unknown, message = "Assertion failed"): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals<T>(actual: T, expected: T): void {
  const actualJson = JSON.stringify(sortObjectKeys(actual));
  const expectedJson = JSON.stringify(sortObjectKeys(expected));
  if (actualJson !== expectedJson) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortObjectKeys(entry)]),
  );
}

function assertValidationError(
  operation: () => unknown,
  expectedField?: string,
): void {
  try {
    operation();
  } catch (error) {
    assert(error instanceof ValidationError, "Expected ValidationError");
    assertEquals(error.status, 400);
    if (expectedField !== undefined) {
      assertEquals(error.field, expectedField);
    }
    return;
  }

  throw new Error("Expected ValidationError");
}

Deno.test("validateLimit applies the default and accepts integer bounds", () => {
  assertEquals(validateLimit(undefined), 20);
  assertEquals(validateLimit(null), 20);
  assertEquals(validateLimit("1"), 1);
  assertEquals(validateLimit("20"), 20);
  assertEquals(validateLimit("50"), 50);
});

Deno.test("validateLimit rejects non-integers and values outside 1..50", () => {
  for (const rawLimit of ["", "0", "51", "1.5", " 20 ", "+20", "abc"]) {
    assertValidationError(() => validateLimit(rawLimit), "limit");
  }
});

Deno.test("UUID validation normalizes valid UUIDs to lowercase", () => {
  const uppercase = "64E0E8D4-56B4-4BD0-990F-0F3BC5E6BB31";

  assertEquals(validateUuid(uppercase), IMAGE_ID);
  assertEquals(validateId(uppercase), IMAGE_ID);
});

Deno.test("UUID validation rejects missing and malformed values", () => {
  for (const value of [undefined, null, "", "not-a-uuid", `{${IMAGE_ID}}`]) {
    assertValidationError(() => validateUuid(value), "id");
  }
});

Deno.test("validatePublicationCreate trims text and applies safe defaults", () => {
  assertEquals(
    validatePublicationCreate({
      title: "  Jornada de investigación  ",
      description: "  Actividad académica abierta.  ",
      category: "  Institucional  ",
      imageContentId: IMAGE_ID,
    }),
    {
      title: "Jornada de investigación",
      description: "Actividad académica abierta.",
      category: "Institucional",
      status: "draft",
      imageContentId: IMAGE_ID,
    },
  );
});

Deno.test("validatePublicationCreate accepts explicit publication state and civil date", () => {
  assertEquals(
    validatePublicationCreate({
      title: "Publicación",
      description: "Descripción",
      category: "Institucional",
      status: "published",
      publicationDate: "2028-02-29",
      imageContentId: IMAGE_ID.toUpperCase(),
    }),
    {
      title: "Publicación",
      description: "Descripción",
      category: "Institucional",
      status: "published",
      publicationDate: "2028-02-29",
      imageContentId: IMAGE_ID,
    },
  );
});

Deno.test("validatePublicationCreate rejects missing, empty, oversized, and invalid fields", () => {
  const valid = {
    title: "Publicación",
    description: "Descripción",
    category: "Institucional",
    imageContentId: IMAGE_ID,
  };
  const invalidCases: Array<[unknown, string]> = [
    [null, "payload"],
    [{ ...valid, title: undefined }, "title"],
    [{ ...valid, title: "   " }, "title"],
    [{ ...valid, title: "x".repeat(161) }, "title"],
    [{ ...valid, description: "x".repeat(1001) }, "description"],
    [{ ...valid, category: "x".repeat(81) }, "category"],
    [{ ...valid, status: "archived" }, "status"],
    [{ ...valid, status: 1 }, "status"],
    [{ ...valid, publicationDate: "2027-02-29" }, "publicationDate"],
    [{ ...valid, publicationDate: "2027-3-09" }, "publicationDate"],
    [{ ...valid, imageContentId: "not-a-uuid" }, "imageContentId"],
    [{ ...valid, createdAt: "2027-03-10T14:00:00Z" }, "payload"],
  ];

  for (const [payload, field] of invalidCases) {
    assertValidationError(() => validatePublicationCreate(payload), field);
  }
});

Deno.test("validatePublicationReplace returns a trimmed full replacement", () => {
  assertEquals(
    validatePublicationReplace({
      title: "  Publicación actualizada  ",
      description: "  Descripción completa  ",
      category: "  Académica  ",
      status: "draft",
      publicationDate: "2027-03-09",
      imageContentId: IMAGE_ID,
    }),
    {
      title: "Publicación actualizada",
      description: "Descripción completa",
      category: "Académica",
      status: "draft",
      publicationDate: "2027-03-09",
      imageContentId: IMAGE_ID,
    },
  );
});

Deno.test("validatePublicationReplace requires every replacement field", () => {
  const valid = {
    title: "Publicación",
    description: "Descripción",
    category: "Institucional",
    status: "published",
    publicationDate: "2027-03-09",
    imageContentId: IMAGE_ID,
  };

  for (const field of Object.keys(valid)) {
    const payload: Record<string, unknown> = { ...valid };
    delete payload[field];
    assertValidationError(() => validatePublicationReplace(payload), field);
  }
});

Deno.test("validatePublicationReplace rejects invalid types, dates, status, and UUIDs", () => {
  const valid = {
    title: "Publicación",
    description: "Descripción",
    category: "Institucional",
    status: "published",
    publicationDate: "2027-03-09",
    imageContentId: IMAGE_ID,
  };

  assertValidationError(
    () => validatePublicationReplace({ ...valid, description: 42 }),
    "description",
  );
  assertValidationError(
    () => validatePublicationReplace({ ...valid, status: "archived" }),
    "status",
  );
  assertValidationError(
    () => validatePublicationReplace({ ...valid, publicationDate: "2027-04-31" }),
    "publicationDate",
  );
  assertValidationError(
    () => validatePublicationReplace({ ...valid, imageContentId: null }),
    "imageContentId",
  );
});
