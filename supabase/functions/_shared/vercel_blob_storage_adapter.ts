import type { ValidatedImage } from "./image_validator.ts";
import type { StorageAdapter } from "./storage.ts";

const DEFAULT_BASE_URL = "https://blob.vercel-storage.com";

export interface VercelBlobStorageAdapterOptions {
  token?: string;
  fetchFn?: typeof fetch;
  baseUrl?: string;
}

export class VercelBlobStorageAdapter implements StorageAdapter {
  readonly #token: string;
  readonly #fetchFn: typeof fetch;
  readonly #baseUrl: string;

  constructor(options: VercelBlobStorageAdapterOptions = {}) {
    const token = options.token ?? readServerToken();
    if (token === undefined || token.trim() === "") {
      throw new Error("BLOB_READ_WRITE_TOKEN is required for Vercel Blob storage");
    }

    this.#token = token;
    this.#fetchFn = options.fetchFn ?? fetch;
    this.#baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

  async store(contentId: string, image: ValidatedImage): Promise<string> {
    const pathname = `publications/${contentId}.${image.format}`;
    const response = await this.#fetchFn(this.#objectUrl(pathname), {
      method: "PUT",
      headers: this.#headers(image.contentType),
      body: image.bytes,
    });

    if (!response.ok) {
      throw new Error(`Vercel Blob upload failed with status ${response.status}`);
    }

    const payload: unknown = await response.json();
    if (!isObjectWithStringUrl(payload)) {
      throw new Error("Vercel Blob upload returned an invalid response");
    }

    return payload.url;
  }

  async delete(publicImageUrl: string): Promise<boolean> {
    const pathname = extractPathname(publicImageUrl);
    const response = await this.#fetchFn(this.#objectUrl(pathname), {
      method: "DELETE",
      headers: this.#headers(),
    });

    if (response.status === 404) {
      return false;
    }
    if (!response.ok) {
      throw new Error(`Vercel Blob delete failed with status ${response.status}`);
    }

    return true;
  }

  #objectUrl(pathname: string): string {
    return `${this.#baseUrl}/${pathname.replace(/^\/+/, "")}`;
  }

  #headers(contentType?: string): Headers {
    const headers = new Headers({
      Authorization: `Bearer ${this.#token}`,
    });
    if (contentType !== undefined) {
      headers.set("Content-Type", contentType);
    }
    return headers;
  }
}

function readServerToken(): string | undefined {
  try {
    return Deno.env.get("BLOB_READ_WRITE_TOKEN");
  } catch {
    return undefined;
  }
}

function extractPathname(publicImageUrl: string): string {
  try {
    return new URL(publicImageUrl).pathname.replace(/^\/+/, "");
  } catch {
    return publicImageUrl.replace(/^\/+/, "");
  }
}

function isObjectWithStringUrl(value: unknown): value is { url: string } {
  return typeof value === "object" && value !== null &&
    "url" in value && typeof value.url === "string" && value.url.length > 0;
}
