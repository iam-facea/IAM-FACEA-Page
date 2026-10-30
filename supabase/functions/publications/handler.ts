import {
  handleCorsPreflight,
  withCors,
} from "../_shared/cors.ts";
import {
  decodePublicCursor,
  encodePublicCursor,
} from "../_shared/cursor.ts";
import {
  PublicationValidationError,
  validateLimit,
  validateUuid,
} from "../_shared/publication_validator.ts";

export interface PublicPublicationRow {
  id: string;
  title: string;
  description: string;
  category: string;
  publication_date: string;
  image_url: string;
}

export interface PublicPublicationResponse {
  id: string;
  title: string;
  description: string;
  category: string;
  publicationDate: string;
  imageUrl: string;
}

export interface PublicPublicationsDatabaseClient {
  readPublications(params: {
    id?: string | null;
    limit?: number | null;
    cursorDate?: string | null;
    cursorId?: string | null;
  }): Promise<PublicPublicationRow[]>;
}

export interface PublicPublicationsHandlerDependencies {
  db: PublicPublicationsDatabaseClient;
}

export function createPublicPublicationsHandler(
  deps: PublicPublicationsHandlerDependencies,
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const preflight = handleCorsPreflight(request);
    if (preflight !== null) {
      return preflight;
    }

    if (request.method !== "GET") {
      return withCors(jsonError(405, "Method not allowed", { Allow: "GET" }));
    }

    const route = parseRoute(new URL(request.url).pathname);
    if (route === null) {
      return withCors(jsonError(404, "Not found"));
    }

    const response = route.id !== null
      ? await handleDetail(route.id, deps.db)
      : await handleList(new URL(request.url), deps.db);

    return withCors(response);
  };
}

async function handleList(
  url: URL,
  db: PublicPublicationsDatabaseClient,
): Promise<Response> {
  let limit: number;
  let cursor: ReturnType<typeof decodePublicCursor> = null;

  try {
    limit = validateLimit(url.searchParams.get("limit"));
    const rawCursor = url.searchParams.get("cursor");
    if (rawCursor !== null) {
      cursor = decodePublicCursor(rawCursor);
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
    const rows = await db.readPublications({
      id: null,
      limit: limit + 1,
      cursorDate: cursor?.date ?? null,
      cursorId: cursor?.id ?? null,
    });
    const hasNextPage = rows.length > limit;
    const pageRows = hasNextPage ? rows.slice(0, limit) : rows;
    const lastRow = pageRows.at(-1);
    const nextCursor = hasNextPage && lastRow !== undefined
      ? encodePublicCursor(lastRow.publication_date, lastRow.id)
      : null;

    return Response.json({
      items: pageRows.map(mapPublicPublication),
      nextCursor,
    });
  } catch {
    return jsonError(500, "Internal server error");
  }
}

async function handleDetail(
  rawId: string,
  db: PublicPublicationsDatabaseClient,
): Promise<Response> {
  let id: string;
  try {
    id = validateUuid(rawId);
  } catch (error) {
    if (error instanceof PublicationValidationError) {
      return jsonError(400, error.message);
    }
    return jsonError(400, "Invalid publication id");
  }

  try {
    const rows = await db.readPublications({ id, limit: 1 });
    const publication = rows[0];
    if (publication === undefined) {
      return jsonError(404, "Publication not found");
    }

    return Response.json(mapPublicPublication(publication));
  } catch {
    return jsonError(500, "Internal server error");
  }
}

function mapPublicPublication(
  row: PublicPublicationRow,
): PublicPublicationResponse {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    publicationDate: row.publication_date,
    imageUrl: row.image_url,
  };
}

function parseRoute(pathname: string): { id: string | null } | null {
  for (const basePath of [
    "/functions/v1/publications",
    "/publications",
  ]) {
    if (pathname === basePath || pathname === `${basePath}/`) {
      return { id: null };
    }

    if (pathname.startsWith(`${basePath}/`)) {
      const id = pathname.slice(basePath.length + 1);
      if (id !== "" && !id.includes("/")) {
        return { id };
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
