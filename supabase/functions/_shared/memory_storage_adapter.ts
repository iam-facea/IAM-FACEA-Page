import type { ValidatedImage } from "./image_validator.ts";
import type { StorageAdapter } from "./storage.ts";

const PUBLIC_BASE_URL = "https://media.example.invalid/publications";

export class MemoryStorageAdapter implements StorageAdapter {
  readonly #images = new Map<string, ValidatedImage>();
  readonly #urlsByContentId = new Map<string, string>();

  store(contentId: string, image: ValidatedImage): Promise<string> {
    const publicImageUrl = `${PUBLIC_BASE_URL}/${contentId}.${image.format}`;
    const previousUrl = this.#urlsByContentId.get(contentId);

    if (previousUrl !== undefined && previousUrl !== publicImageUrl) {
      this.#images.delete(previousUrl);
    }

    this.#images.set(publicImageUrl, image);
    this.#urlsByContentId.set(contentId, publicImageUrl);
    return Promise.resolve(publicImageUrl);
  }

  delete(publicImageUrl: string): Promise<boolean> {
    const deleted = this.#images.delete(publicImageUrl);
    if (deleted) {
      for (const [contentId, storedUrl] of this.#urlsByContentId) {
        if (storedUrl === publicImageUrl) {
          this.#urlsByContentId.delete(contentId);
          break;
        }
      }
    }
    return Promise.resolve(deleted);
  }

  has(publicImageUrl: string): boolean {
    return this.#images.has(publicImageUrl);
  }

  get(publicImageUrl: string): ValidatedImage | undefined {
    return this.#images.get(publicImageUrl);
  }

  clear(): void {
    this.#images.clear();
    this.#urlsByContentId.clear();
  }
}
