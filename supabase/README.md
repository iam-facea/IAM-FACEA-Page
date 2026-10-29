# Supabase local database operations

The local database currently has 22 ordered migrations for the publication schema, access controls, soft deletion, and Edge Function service-role RPCs. `supabase/seed.sql` adds three synthetic development fixtures after a local reconstruction. All three Edge Functions (`images`, `publications`, `editor-publications`) implementing the 8 approved contract actions are implemented locally and verified via unit and HTTP integration tests. No real editor identity, email provisioning, signup, or recovery flow is implemented.

## Rebuild the local database

> **Destructive and local only:** `supabase db reset --local` erases and reconstructs the local database. Never omit `--local`, and never use these instructions against Supabase Cloud.

From the repository root, run the reset only after explicitly authorizing local data loss:

```sh
supabase db reset --local
```

A reset applies the 22-migration chain in order and then applies `supabase/seed.sql`. The seed is idempotent for its fixed identifiers and contains only `.example.invalid` URLs and clearly synthetic UUIDs. It creates one published publication, one draft, and one soft-deleted publication. The deleted fixture and its referenced content remain stored; the seed invokes the existing soft-delete trigger and never physically purges them.

The local `supabase/config.toml` remains ignored and unmodified. Its generated Auth defaults are local development defaults, not a hardened production configuration.

## Run the database tests

The exact observed runner is:

```sh
supabase test db
```

The pgTAP files under `supabase/tests/` open a transaction and finish with `ROLLBACK`, so their synthetic users and product fixtures do not persist. Tests whose expectations depend on a complete product-table result set truncate `public.publication` and `public.content` inside that transaction; rollback restores the local seed afterward. The suite does not use seed presence as proof that the schema works.

Migrations are ordered schema history. Do not edit an already applied migration to change behavior; add a later migration and test the public database seam instead.

## Access model

### Public reads

`public.read_publications(p_id, p_limit, p_cursor_date, p_cursor_id)` is the narrow SQL adapter that a future public Edge Function can consume. It does not add an HTTP endpoint. The function returns exactly six fields:

1. `id`
2. `title`
3. `description`
4. `category`
5. `publication_date`
6. `image_url`

Passing `p_id` performs detail lookup. Omitting it performs a list ordered by `(publication_date DESC, id DESC)`, with a default limit of 20, an allowed range of 1–51 (where 51 enables the Edge Function to fetch `limit + 1` for cursor calculation on a 50-item page), and an optional complete `(p_cursor_date, p_cursor_id)` cursor pair.

The function is `SECURITY DEFINER` with an empty `search_path`. Because its owner may bypass RLS, it uses fully qualified tables and explicitly enforces `status = 'published' AND deleted_at IS NULL`; this is defense in depth rather than a replacement for table RLS. Execute is granted only to `anon` and `authenticated` after revoking `PUBLIC`, while both roles remain unable to select the raw product tables.

An earlier migration temporarily introduced an owner-rights public view during prepublication TDD. The later access migration drops that view and installs this function without rewriting applied history. The final product schema contains no database views.

### Editorial reads and writes

The private singleton `app_private.editor_configuration` stores one allowed Supabase Auth subject. Its default `editor_subject` is `NULL`, so editorial access fails closed until an actual authenticated user is provisioned and configured.

For the exact configured subject, RLS permits reading live publications. Content reads permit unreferenced content and content referenced by a live publication; content retained by a soft-deleted publication is preserved but excluded from editorial reads. Authenticated publication writes are limited to approved business columns. Direct content creation, technical timestamp changes, direct physical deletion, and private configuration changes remain unavailable to client roles.

Soft deletion is exposed through `public.soft_delete_publication(uuid)`. The guarded function checks the exact configured subject, while the table trigger converts the targeted delete into a retained row and preserves its content reference. This is a single-editor gate, not a general role system.

## Configure the real editor later

First provision a real user through a separately approved Supabase Auth administrative process. Email delivery, signup policy, password recovery, and real account provisioning are future work and have not been completed.

After provisioning, a trusted database administrator may adapt this template. Replace the placeholder with the actual authenticated user's UUID; do not run the placeholder itself and do not add credentials to the repository.

```sql
BEGIN;

UPDATE app_private.editor_configuration
SET editor_subject = '<actual-authenticated-user-uuid>'::uuid
WHERE singleton;

COMMIT;
```

This update configures one exact subject only. It does not create an Auth user, email flow, role hierarchy, or recovery mechanism.

## Edge Functions and image storage

The repository implements all three Edge Functions under `supabase/functions/` covering the 8 approved MVP actions:

- `_shared/storage.ts`: `StorageAdapter` interface (`store` and `delete`).
- `_shared/memory_storage_adapter.ts`: deterministic in-memory storage adapter for zero-network testing.
- `_shared/vercel_blob_storage_adapter.ts`: production server-side Vercel Blob adapter using `BLOB_READ_WRITE_TOKEN`.
- `_shared/image_validator.ts`: validates multipart images by inspecting magic bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF...WEBP`), enforcing a strict 5 MiB size limit, and parsing image headers to enforce maximum 4096×4096 dimensions.
- `_shared/cursor.ts`: Base64url unpadded versioned keyset cursor codec for public `(publicationDate, id)` and editorial `(updatedAt, id)` tuples.
- `_shared/publication_validator.ts`: strict validators for limits (1..50, default 20), UUIDs, `PublicationCreate`, and `PublicationReplace`.
- `images/`: Action 8 (`POST /functions/v1/images`), multipart upload, exact editor session authorization, storage upload, insertion into `public.content`, and compensatory storage deletion on database failure.
- `publications/`: Public endpoints without session:
  - Action 1: `GET /functions/v1/publications` (keyset pagination, default 20, max 50, nextCursor).
  - Action 2: `GET /functions/v1/publications/{id}` (6-field public projection, 404 for draft/deleted/nonexistent).
- `editor-publications/`: Editorial endpoints requiring valid session matching `get_editor_subject()`:
  - Action 3: `GET /functions/v1/editor-publications` (keyset pagination by `(updatedAt, id)`, both draft/published, no deleted).
  - Action 4: `GET /functions/v1/editor-publications/{id}` (full editorial projection with `image.id`).
  - Action 5: `POST /functions/v1/editor-publications` (creates draft, checks image availability, sets Argentine date default, returns 201 + `Location`).
  - Action 6: `PUT /functions/v1/editor-publications/{id}` (full replacement, checks image reassignment, returns 200).
  - Action 7: `DELETE /functions/v1/editor-publications/{id}` (idempotent soft deletion, returns 204 No Content).

### Run Edge Function tests

Run the Deno test suite using the verified containerized runtime:

```sh
MSYS_NO_PATHCONV=1 docker run --rm -v "C:/000 MIS COSAS NUEVAS/00 REPOS/iam-facea-workspace/iam-facea-page:/app" -w /app denoland/deno:2.1.4 deno test supabase/functions/
```

## Current limits

- The database schema, RLS, grants, bounded public read function, soft-delete gate, tests, and local synthetic seed exist.
- All three approved Edge Functions (`publications`, `editor-publications`, `images`) covering the 8 actions are implemented and verified via unit and HTTP integration tests.
- Vercel Blob production credentials remain unconfigured; production uses the verified server adapter once provisioned.
- These instructions neither link nor operate a Supabase Cloud project.
- No real editor identity, secret, privileged client key, or `auth.users` seed account is included.
- Any future privileged database or Blob credential remains server-only and must never be exposed through client-prefixed environment variables.
