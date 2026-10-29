import { VercelBlobStorageAdapter } from "../_shared/vercel_blob_storage_adapter.ts";
import {
  createImagesHandler,
  type DatabaseClient,
} from "./handler.ts";

class SupabaseRestDatabaseClient implements DatabaseClient {
  readonly #baseUrl: string;
  readonly #serviceRoleKey: string;

  constructor(baseUrl: string, serviceRoleKey: string) {
    this.#baseUrl = baseUrl.replace(/\/+$/, "");
    this.#serviceRoleKey = serviceRoleKey;
  }

  async getAuthenticatedSubject(authHeader: string | null): Promise<string | null> {
    if (authHeader === null || authHeader.trim() === "") {
      return null;
    }

    const response = await fetch(`${this.#baseUrl}/auth/v1/user`, {
      headers: {
        apikey: this.#serviceRoleKey,
        Authorization: authHeader,
      },
    });

    if (response.status === 401 || response.status === 403) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Supabase Auth lookup failed with status ${response.status}`);
    }

    const payload: unknown = await response.json();
    return isRecord(payload) && typeof payload.id === "string"
      ? payload.id
      : null;
  }

  async getEditorSubject(): Promise<string | null> {
    const response = await fetch(`${this.#baseUrl}/rest/v1/rpc/get_editor_subject`, {
      method: "POST",
      headers: this.#serviceHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(
        `Editor configuration lookup failed with status ${response.status}`,
      );
    }

    const payload: unknown = await response.json();
    return typeof payload === "string" ? payload : null;
  }

  async insertContent(record: { id: string; image_url: string }): Promise<{
    id: string;
    image_url: string;
    created_at: string;
  }> {
    const response = await fetch(`${this.#baseUrl}/rest/v1/content`, {
      method: "POST",
      headers: this.#serviceHeaders({
        "Content-Profile": "public",
        "Content-Type": "application/json",
        Prefer: "return=representation",
      }),
      body: JSON.stringify(record),
    });

    if (!response.ok) {
      throw new Error(`Content insert failed with status ${response.status}`);
    }

    const payload: unknown = await response.json();
    const row = Array.isArray(payload) ? payload[0] : undefined;
    if (
      !isRecord(row) || typeof row.id !== "string" ||
      typeof row.image_url !== "string" || typeof row.created_at !== "string"
    ) {
      throw new Error("Content insert returned an invalid response");
    }

    return {
      id: row.id,
      image_url: row.image_url,
      created_at: row.created_at,
    };
  }

  #serviceHeaders(extra: HeadersInit = {}): Headers {
    const headers = new Headers(extra);
    headers.set("apikey", this.#serviceRoleKey);
    headers.set("Authorization", `Bearer ${this.#serviceRoleKey}`);
    return headers;
  }
}

function requiredEnvironmentVariable(name: string): string {
  const value = Deno.env.get(name);
  if (value === undefined || value.trim() === "") {
    throw new Error(`${name} is required`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

if (import.meta.main) {
  const supabaseUrl = requiredEnvironmentVariable("SUPABASE_URL");
  const serviceRoleKey = requiredEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY");
  const blobToken = requiredEnvironmentVariable("BLOB_READ_WRITE_TOKEN");
  const db = new SupabaseRestDatabaseClient(supabaseUrl, serviceRoleKey);
  const storage = new VercelBlobStorageAdapter({ token: blobToken });

  Deno.serve(createImagesHandler({ storage, db }));
}
