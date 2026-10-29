import {
  ImageValidationError,
  validateImage,
} from "../_shared/image_validator.ts";
import type { StorageAdapter } from "../_shared/storage.ts";

export interface DatabaseClient {
  insertContent(record: {
    id: string;
    image_url: string;
  }): Promise<{ id: string; image_url: string; created_at: string }>;
  getEditorSubject(): Promise<string | null>;
  getAuthenticatedSubject(authHeader: string | null): Promise<string | null>;
}

export interface ImagesHandlerDependencies {
  storage: StorageAdapter;
  db: DatabaseClient;
  now?: () => Date;
}

export function createImagesHandler(
  deps: ImagesHandlerDependencies,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST") {
      return jsonError(405, "Method not allowed", { Allow: "POST" });
    }

    const authHeader = req.headers.get("Authorization");
    if (authHeader === null || authHeader.trim() === "") {
      return jsonError(401, "Authentication required");
    }

    let authenticatedSubject: string | null;
    let editorSubject: string | null;
    try {
      authenticatedSubject = await deps.db.getAuthenticatedSubject(
        authHeader.trim(),
      );
      if (authenticatedSubject === null) {
        return jsonError(401, "Authentication required");
      }
      editorSubject = await deps.db.getEditorSubject();
    } catch {
      return jsonError(500, "Internal server error");
    }

    if (editorSubject === null || authenticatedSubject !== editorSubject) {
      return jsonError(403, "Forbidden");
    }

    const contentType = req.headers.get("Content-Type");
    if (
      contentType === null ||
      !/^multipart\/form-data(?:\s*;|\s*$)/i.test(contentType)
    ) {
      return jsonError(400, "Expected multipart/form-data");
    }

    let file: File;
    try {
      const form = await req.formData();
      const entries = Array.from(form.entries());
      if (
        entries.length !== 1 || entries[0][0] !== "file" ||
        !(entries[0][1] instanceof File)
      ) {
        return jsonError(400, 'Expected one file field named "file"');
      }
      file = entries[0][1];
    } catch {
      return jsonError(400, "Invalid multipart form data");
    }

    let image;
    try {
      image = validateImage(new Uint8Array(await file.arrayBuffer()));
    } catch (error) {
      if (error instanceof ImageValidationError) {
        return jsonError(
          error.code === "FILE_TOO_LARGE" ? 413 : 422,
          error.message,
        );
      }
      return jsonError(422, "Invalid image");
    }

    const contentId = crypto.randomUUID();
    let publicImageUrl: string;
    try {
      publicImageUrl = await deps.storage.store(contentId, image);
    } catch {
      return jsonError(500, "Internal server error");
    }

    try {
      const content = await deps.db.insertContent({
        id: contentId,
        image_url: publicImageUrl,
      });
      return Response.json({
        id: content.id,
        url: content.image_url,
        createdAt: content.created_at,
      }, { status: 201 });
    } catch {
      try {
        await deps.storage.delete(publicImageUrl);
      } catch {
        // The request still fails closed; provider-level retry is handled outside this boundary.
      }
      return jsonError(500, "Internal server error");
    }
  };
}

function jsonError(
  status: number,
  message: string,
  headers?: HeadersInit,
): Response {
  return Response.json({ error: message }, { status, headers });
}
