import type { ValidatedImage } from "./image_validator.ts";

export interface StorageAdapter {
  store(contentId: string, image: ValidatedImage): Promise<string>;
  delete(publicImageUrl: string): Promise<boolean>;
}
