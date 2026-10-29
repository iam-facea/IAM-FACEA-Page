import {
  decodeEditorCursor,
  encodeEditorCursor,
} from "../_shared/cursor.ts";
import {
  type PublicationCreateData,
  type PublicationReplaceData,
  type PublicationStatus,
  PublicationValidationError,
  validateLimit,
  validatePublicationCreate,
  validatePublicationReplace,
  validateUuid,
} from "../_shared/publication_validator.ts";

export interface EditorPublicationRow {
  id: string;
  title: string;
  description: string;
  category: string;
  publication_date: string;
  status: PublicationStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  image: {
    id: string;
    image_url: string;
  };
}

export interface EditorPublicationResponse {
  id: string;
  title: string;
  description: string;
  category: string;
  publicationDate: string;
  status: PublicationStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  image: {
    id: string;
    url: string;
  };
}

export interface EditorPublicationsDatabaseClient {
  getAuthenticatedSubject(authHeader: string | null): Promise<string | null>;
  getEditorSubject(): Promise<string | null>;
  listEditorPublications(params: {
    limit: number;
    cursorUpdatedAt: string | null;
    cursorId: string | null;
  }): Promise<EditorPublicationRow[]>;
  getEditorPublication(id: string): Promise<EditorPublicationRow | null>;
  createEditorPublication(
    data: PublicationCreateData & { publicationDate: string },
  ): Promise<EditorPublicationRow>;
  replaceEditorPublication(
    id: string,
    data: PublicationReplaceData,
  ): Promise<EditorPublicationRow>;
  softDeletePublication(id: string): Promise<void>;
}

export class ImageUnavailableError extends Error {
  constructor() {
    super("Image content is unavailable");
    this.name = "ImageUnavailableError";
  }
}

export interface EditorPublicationsHandlerDependencies {
  db: EditorPublicationsDatabaseClient;
  now?: () => Date;
}

interface Route {
  id: string | null;
  allowedMethods: readonly string[];
}

export function createEditorPublicationsHandler(
  deps: EditorPublicationsHandlerDependencies,
): (request: Request) => Promise<Response> {
  const now = deps.now ?? (() => new Date());

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const route = parseRoute(url.pathname);
    if (route === null) {
      return jsonError(404, "Not found");
    }

    if (!route.allowedMethods.includes(request.method)) {
      return jsonError(405, "Method not allowed", {
        Allow: route.allowedMethods.join(", "),
      });
    }

    const authorization = request.headers.get("Authorization");
    if (authorization === null || authorization.trim() === "") {
      return jsonError(401, "Authentication required");
    }

    try {
      const authenticatedSubject = await deps.db.getAuthenticatedSubject(
        authorization.trim(),
      );
      if (authenticatedSubject === null) {
        return jsonError(401, "Authentication required");
      }

      const editorSubject = await deps.db.getEditorSubject();
      if (
        editorSubject === null || authenticatedSubject !== editorSubject
      ) {
        return jsonError(403, "Forbidden");
      }
    } catch {
      return jsonError(500, "Internal server error");
    }

    if (route.id === null) {
      if (request.method === "GET") {
        return handleList(url, deps.db);
      }
      return handleCreate(request, deps.db, now);
    }

    if (request.method === "GET") {
      return handleDetail(route.id, deps.db);
    }
    if (request.method === "PUT") {
      return handleReplace(route.id, request, deps.db);
    }
    return handleDelete(route.id, deps.db);
  };
}

async function handleList(
  url: URL,
  db: EditorPublicationsDatabaseClient,
): Promise<Response> {
  let limit: number;
  let cursor: ReturnType<typeof decodeEditorCursor> = null;

  try {
    limit = validateLimit(url.searchParams.get("limit"));
    const rawCursor = url.searchParams.get("cursor");
    if (rawCursor !== null) {
      cursor = decodeEditorCursor(rawCursor);
      if (cursor === null) {
        return jsonError(400, "Invalid cursor");
      }
    }
  } catch (error) {
    if (error instanceof PublicationValidationError) {
      return jsonError(400, error.message);
    }
    return jsonError(400, "Invalid pagination parameters");
  }

  try {
    const rows = await db.listEditorPublications({
      limit: limit + 1,
      cursorUpdatedAt: cursor?.updatedAt ?? null,
      cursorId: cursor?.id ?? null,
    });
    const hasNextPage = rows.length > limit;
    const pageRows = hasNextPage ? rows.slice(0, limit) : rows;
    const lastRow = pageRows.at(-1);
    const nextCursor = hasNextPage && lastRow !== undefined
      ? encodeEditorCursor(lastRow.updated_at, lastRow.id)
      : null;

    return Response.json({
      items: pageRows.map(mapEditorPublication),
      nextCursor,
    });
  } catch {
    return jsonError(500, "Internal server error");
  }
}

async function handleDetail(
  rawId: string,
  db: EditorPublicationsDatabaseClient,
): Promise<Response> {
  const id = validatedId(rawId);
  if (id instanceof Response) return id;

  try {
    const publication = await db.getEditorPublication(id);
    if (publication === null) {
      return jsonError(404, "Publication not found");
    }
    return Response.json(mapEditorPublication(publication));
  } catch {
    return jsonError(500, "Internal server error");
  }
}

async function handleCreate(
  request: Request,
  db: EditorPublicationsDatabaseClient,
  now: () => Date,
): Promise<Response> {
  const contentTypeError = requireJsonContentType(request);
  if (contentTypeError !== null) return contentTypeError;

  let data: PublicationCreateData;
  try {
    data = validatePublicationCreate(await request.json());
  } catch (error) {
    return validationResponse(error);
  }

  const publicationDate = data.publicationDate ?? argentinaDate(now());
  try {
    const publication = await db.createEditorPublication({
      ...data,
      publicationDate,
    });
    return Response.json(mapEditorPublication(publication), {
      status: 201,
      headers: {
        Location: `/functions/v1/editor-publications/${publication.id}`,
      },
    });
  } catch (error) {
    if (error instanceof ImageUnavailableError) {
      return jsonError(422, error.message);
    }
    return jsonError(500, "Internal server error");
  }
}

async function handleReplace(
  rawId: string,
  request: Request,
  db: EditorPublicationsDatabaseClient,
): Promise<Response> {
  const id = validatedId(rawId);
  if (id instanceof Response) return id;

  const contentTypeError = requireJsonContentType(request);
  if (contentTypeError !== null) return contentTypeError;

  let data: PublicationReplaceData;
  try {
    data = validatePublicationReplace(await request.json());
  } catch (error) {
    return validationResponse(error);
  }

  try {
    const existing = await db.getEditorPublication(id);
    if (existing === null) {
      return jsonError(404, "Publication not found");
    }

    const publication = await db.replaceEditorPublication(id, data);
    return Response.json(mapEditorPublication(publication));
  } catch (error) {
    if (error instanceof ImageUnavailableError) {
      return jsonError(422, error.message);
    }
    return jsonError(500, "Internal server error");
  }
}

async function handleDelete(
  rawId: string,
  db: EditorPublicationsDatabaseClient,
): Promise<Response> {
  const id = validatedId(rawId);
  if (id instanceof Response) return id;

  try {
    await db.softDeletePublication(id);
    return new Response(null, { status: 204 });
  } catch {
    return jsonError(500, "Internal server error");
  }
}

function validatedId(rawId: string): string | Response {
  try {
    return validateUuid(rawId);
  } catch (error) {
    if (error instanceof PublicationValidationError) {
      return jsonError(400, error.message);
    }
    return jsonError(400, "Invalid publication id");
  }
}

function requireJsonContentType(request: Request): Response | null {
  const contentType = request.headers.get("Content-Type");
  if (
    contentType === null ||
    !/^application\/json(?:\s*;|\s*$)/i.test(contentType)
  ) {
    return jsonError(415, "Expected application/json");
  }
  return null;
}

function validationResponse(error: unknown): Response {
  if (error instanceof PublicationValidationError) {
    return jsonError(400, error.message);
  }
  if (error instanceof SyntaxError) {
    return jsonError(400, "Invalid JSON body");
  }
  return jsonError(400, "Invalid request body");
}

function argentinaDate(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("Current time must be a valid date");
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (year === undefined || month === undefined || day === undefined) {
    throw new TypeError("Could not calculate the Argentina publication date");
  }
  return `${year}-${month}-${day}`;
}

function mapEditorPublication(
  row: EditorPublicationRow,
): EditorPublicationResponse {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    publicationDate: row.publication_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    image: {
      id: row.image.id,
      url: row.image.image_url,
    },
  };
}

function parseRoute(pathname: string): Route | null {
  for (const basePath of [
    "/functions/v1/editor-publications",
    "/editor-publications",
  ]) {
    if (pathname === basePath || pathname === `${basePath}/`) {
      return { id: null, allowedMethods: ["GET", "POST"] };
    }

    if (pathname.startsWith(`${basePath}/`)) {
      const id = pathname.slice(basePath.length + 1);
      if (id !== "" && !id.includes("/")) {
        return { id, allowedMethods: ["GET", "PUT", "DELETE"] };
      }
    }
  }
  return null;
}

function jsonError(
  status: number,
  message: string,
  headers?: HeadersInit,
): Response {
  return Response.json({ error: message }, { status, headers });
}
