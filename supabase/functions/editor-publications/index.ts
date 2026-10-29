import type {
  PublicationCreateData,
  PublicationReplaceData,
} from "../_shared/publication_validator.ts";
import {
  createEditorPublicationsHandler,
  type EditorPublicationRow,
  type EditorPublicationsDatabaseClient,
  ImageUnavailableError,
} from "./handler.ts";

const PUBLICATION_SELECT = [
  "id",
  "title",
  "description",
  "category",
  "publication_date",
  "status",
  "created_at",
  "updated_at",
  "published_at",
  "image:content!publication_content_id_fkey(id,image_url)",
].join(",");

export class SupabaseEditorPublicationsDatabaseClient
  implements EditorPublicationsDatabaseClient {
  readonly #baseUrl: string;
  readonly #serviceRoleKey: string;
  readonly #fetch: typeof fetch;

  constructor(
    baseUrl: string,
    serviceRoleKey: string,
    fetcher: typeof fetch = fetch,
  ) {
    this.#baseUrl = baseUrl.replace(/\/+$/, "");
    this.#serviceRoleKey = serviceRoleKey;
    this.#fetch = fetcher;
  }

  async getAuthenticatedSubject(
    authHeader: string | null,
  ): Promise<string | null> {
    if (authHeader === null || authHeader.trim() === "") {
      return null;
    }

    const response = await this.#fetch(`${this.#baseUrl}/auth/v1/user`, {
      headers: {
        apikey: this.#serviceRoleKey,
        Authorization: authHeader,
      },
    });
    if (response.status === 401 || response.status === 403) {
      return null;
    }
    if (!response.ok) {
      throw new Error(
        `Supabase Auth lookup failed with status ${response.status}`,
      );
    }

    const payload: unknown = await response.json();
    return isRecord(payload) && typeof payload.id === "string"
      ? payload.id
      : null;
  }

  async getEditorSubject(): Promise<string | null> {
    const response = await this.#fetch(
      `${this.#baseUrl}/rest/v1/rpc/get_editor_subject`,
      {
        method: "POST",
        headers: this.#serviceHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({}),
      },
    );
    if (!response.ok) {
      throw new Error(
        `Editor configuration lookup failed with status ${response.status}`,
      );
    }

    const payload: unknown = await response.json();
    return typeof payload === "string" ? payload : null;
  }

  async listEditorPublications(params: {
    limit: number;
    cursorUpdatedAt: string | null;
    cursorId: string | null;
  }): Promise<EditorPublicationRow[]> {
    if ((params.cursorUpdatedAt === null) !== (params.cursorId === null)) {
      throw new TypeError("A complete editor cursor is required");
    }

    const url = this.#publicationUrl();
    url.searchParams.set("select", PUBLICATION_SELECT);
    url.searchParams.set("deleted_at", "is.null");
    url.searchParams.set("order", "updated_at.desc,id.desc");
    url.searchParams.set("limit", String(params.limit));
    if (params.cursorUpdatedAt !== null && params.cursorId !== null) {
      url.searchParams.set(
        "or",
        `(updated_at.lt.${params.cursorUpdatedAt},and(updated_at.eq.${params.cursorUpdatedAt},id.lt.${params.cursorId}))`,
      );
    }

    return this.#readPublicationRows(url, "Editor publications list");
  }

  async getEditorPublication(
    id: string,
  ): Promise<EditorPublicationRow | null> {
    const url = this.#publicationUrl();
    url.searchParams.set("select", PUBLICATION_SELECT);
    url.searchParams.set("id", `eq.${id}`);
    url.searchParams.set("deleted_at", "is.null");
    url.searchParams.set("limit", "1");

    const rows = await this.#readPublicationRows(url, "Editor publication lookup");
    return rows[0] ?? null;
  }

  async createEditorPublication(
    data: PublicationCreateData & { publicationDate: string },
  ): Promise<EditorPublicationRow> {
    await this.#assertImageAvailable(data.imageContentId);

    const url = this.#publicationUrl();
    url.searchParams.set("select", PUBLICATION_SELECT);
    const response = await this.#fetch(url, {
      method: "POST",
      headers: this.#serviceHeaders({
        "Content-Type": "application/json",
        Prefer: "return=representation",
      }),
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        category: data.category,
        publication_date: data.publicationDate,
        status: data.status,
        content_id: data.imageContentId,
      }),
    });

    if (!response.ok) {
      if (await isUniqueViolation(response)) {
        throw new ImageUnavailableError();
      }
      throw new Error(`Publication insert failed with status ${response.status}`);
    }
    return readSinglePublication(await response.json(), "Publication insert");
  }

  async replaceEditorPublication(
    id: string,
    data: PublicationReplaceData,
  ): Promise<EditorPublicationRow> {
    await this.#assertImageAvailable(data.imageContentId, id);

    const url = this.#publicationUrl();
    url.searchParams.set("id", `eq.${id}`);
    url.searchParams.set("deleted_at", "is.null");
    url.searchParams.set("select", PUBLICATION_SELECT);
    const response = await this.#fetch(url, {
      method: "PATCH",
      headers: this.#serviceHeaders({
        "Content-Type": "application/json",
        Prefer: "return=representation",
      }),
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        category: data.category,
        publication_date: data.publicationDate,
        status: data.status,
        content_id: data.imageContentId,
      }),
    });

    if (!response.ok) {
      if (await isUniqueViolation(response)) {
        throw new ImageUnavailableError();
      }
      throw new Error(
        `Publication replacement failed with status ${response.status}`,
      );
    }
    return readSinglePublication(await response.json(), "Publication replacement");
  }

  async softDeletePublication(id: string): Promise<void> {
    const url = this.#publicationUrl();
    url.searchParams.set("id", `eq.${id}`);
    url.searchParams.set("deleted_at", "is.null");
    const response = await this.#fetch(url, {
      method: "DELETE",
      headers: this.#serviceHeaders({ Prefer: "return=minimal" }),
    });
    if (!response.ok) {
      throw new Error(`Publication soft delete failed with status ${response.status}`);
    }
  }

  async #assertImageAvailable(
    imageContentId: string,
    publicationId?: string,
  ): Promise<void> {
    const contentUrl = new URL(`${this.#baseUrl}/rest/v1/content`);
    contentUrl.searchParams.set("select", "id");
    contentUrl.searchParams.set("id", `eq.${imageContentId}`);
    contentUrl.searchParams.set("limit", "1");
    const contentResponse = await this.#fetch(contentUrl, {
      headers: this.#serviceHeaders(),
    });
    if (!contentResponse.ok) {
      throw new Error(
        `Image content lookup failed with status ${contentResponse.status}`,
      );
    }
    const contentPayload: unknown = await contentResponse.json();
    if (!Array.isArray(contentPayload) || contentPayload.length === 0) {
      throw new ImageUnavailableError();
    }

    const associationUrl = this.#publicationUrl();
    associationUrl.searchParams.set("select", "id");
    associationUrl.searchParams.set("content_id", `eq.${imageContentId}`);
    if (publicationId !== undefined) {
      associationUrl.searchParams.set("id", `neq.${publicationId}`);
    }
    associationUrl.searchParams.set("limit", "1");
    const associationResponse = await this.#fetch(associationUrl, {
      headers: this.#serviceHeaders(),
    });
    if (!associationResponse.ok) {
      throw new Error(
        `Image association lookup failed with status ${associationResponse.status}`,
      );
    }
    const associationPayload: unknown = await associationResponse.json();
    if (!Array.isArray(associationPayload)) {
      throw new Error("Image association lookup returned an invalid response");
    }
    if (associationPayload.length > 0) {
      throw new ImageUnavailableError();
    }
  }

  async #readPublicationRows(
    url: URL,
    operation: string,
  ): Promise<EditorPublicationRow[]> {
    const response = await this.#fetch(url, {
      headers: this.#serviceHeaders(),
    });
    if (!response.ok) {
      throw new Error(`${operation} failed with status ${response.status}`);
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload) || !payload.every(isEditorPublicationRow)) {
      throw new Error(`${operation} returned an invalid response`);
    }
    return payload;
  }

  #publicationUrl(): URL {
    return new URL(`${this.#baseUrl}/rest/v1/publication`);
  }

  #serviceHeaders(extra: HeadersInit = {}): Headers {
    const headers = new Headers(extra);
    headers.set("apikey", this.#serviceRoleKey);
    headers.set("Authorization", `Bearer ${this.#serviceRoleKey}`);
    return headers;
  }
}

function readSinglePublication(
  payload: unknown,
  operation: string,
): EditorPublicationRow {
  const row = Array.isArray(payload) ? payload[0] : undefined;
  if (!isEditorPublicationRow(row)) {
    throw new Error(`${operation} returned an invalid response`);
  }
  return row;
}

async function isUniqueViolation(response: Response): Promise<boolean> {
  if (response.status === 409) return true;
  try {
    const payload: unknown = await response.clone().json();
    return isRecord(payload) && payload.code === "23505";
  } catch {
    return false;
  }
}

function isEditorPublicationRow(value: unknown): value is EditorPublicationRow {
  if (!isRecord(value) || !isRecord(value.image)) return false;
  return typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    typeof value.category === "string" &&
    typeof value.publication_date === "string" &&
    (value.status === "draft" || value.status === "published") &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string" &&
    (value.published_at === null || typeof value.published_at === "string") &&
    typeof value.image.id === "string" &&
    typeof value.image.image_url === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredEnvironmentVariable(name: string): string {
  const value = Deno.env.get(name);
  if (value === undefined || value.trim() === "") {
    throw new Error(`${name} is required`);
  }
  return value;
}

if (import.meta.main) {
  const supabaseUrl = requiredEnvironmentVariable("SUPABASE_URL");
  const serviceRoleKey = requiredEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY");
  const db = new SupabaseEditorPublicationsDatabaseClient(
    supabaseUrl,
    serviceRoleKey,
  );

  Deno.serve(createEditorPublicationsHandler({ db }));
}
