import {
  createPublicPublicationsHandler,
  type PublicPublicationRow,
  type PublicPublicationsDatabaseClient,
} from "./handler.ts";

export class SupabasePublicPublicationsDatabaseClient
  implements PublicPublicationsDatabaseClient {
  readonly #baseUrl: string;
  readonly #anonKey: string;
  readonly #fetch: typeof fetch;

  constructor(
    baseUrl: string,
    anonKey: string,
    fetcher: typeof fetch = fetch,
  ) {
    this.#baseUrl = baseUrl.replace(/\/+$/, "");
    this.#anonKey = anonKey;
    this.#fetch = fetcher;
  }

  async readPublications(params: {
    id?: string | null;
    limit?: number | null;
    cursorDate?: string | null;
    cursorId?: string | null;
  }): Promise<PublicPublicationRow[]> {
    const rpcParams: Record<string, string | number | null> = {};
    if (Object.hasOwn(params, "id")) {
      rpcParams.p_id = params.id ?? null;
    }
    if (Object.hasOwn(params, "limit")) {
      rpcParams.p_limit = params.limit ?? null;
    }
    if (Object.hasOwn(params, "cursorDate")) {
      rpcParams.p_cursor_date = params.cursorDate ?? null;
    }
    if (Object.hasOwn(params, "cursorId")) {
      rpcParams.p_cursor_id = params.cursorId ?? null;
    }

    const response = await this.#fetch(
      `${this.#baseUrl}/rest/v1/rpc/read_publications`,
      {
        method: "POST",
        headers: {
          apikey: this.#anonKey,
          Authorization: `Bearer ${this.#anonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rpcParams),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Public publications RPC failed with status ${response.status}`,
      );
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload) || !payload.every(isPublicPublicationRow)) {
      throw new Error("Public publications RPC returned an invalid response");
    }

    return payload;
  }
}

function requiredEnvironmentVariable(name: string): string {
  const value = Deno.env.get(name);
  if (value === undefined || value.trim() === "") {
    throw new Error(`${name} is required`);
  }
  return value;
}

function isPublicPublicationRow(
  value: unknown,
): value is PublicPublicationRow {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const row = value as Record<string, unknown>;
  return typeof row.id === "string" &&
    typeof row.title === "string" &&
    typeof row.description === "string" &&
    typeof row.category === "string" &&
    typeof row.publication_date === "string" &&
    typeof row.image_url === "string";
}

if (import.meta.main) {
  const supabaseUrl = requiredEnvironmentVariable("SUPABASE_URL");
  const anonKey = requiredEnvironmentVariable("SUPABASE_ANON_KEY");
  const db = new SupabasePublicPublicationsDatabaseClient(
    supabaseUrl,
    anonKey,
  );

  Deno.serve(createPublicPublicationsHandler({ db }));
}
