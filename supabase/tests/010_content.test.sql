BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(5);

INSERT INTO public.content (image_url)
VALUES ('https://media.example.invalid/t2-store.webp');

SELECT is(
  (
    SELECT image_url
    FROM public.content
    WHERE image_url = 'https://media.example.invalid/t2-store.webp'
  ),
  'https://media.example.invalid/t2-store.webp',
  'stored content can be retrieved by its image URL'
);

SELECT is(
  (
    SELECT pg_typeof(id)::text
    FROM public.content
    WHERE image_url = 'https://media.example.invalid/t2-store.webp'
  ),
  'uuid',
  'stored content receives a UUID identifier'
);

SELECT is(
  (
    SELECT created_at
    FROM public.content
    WHERE image_url = 'https://media.example.invalid/t2-store.webp'
  ),
  transaction_timestamp(),
  'stored content receives the trusted database transaction time'
);

CREATE TEMP TABLE content_test_results (
  invariant text PRIMARY KEY,
  enforced boolean NOT NULL
) ON COMMIT DROP;

DO $$
BEGIN
  INSERT INTO public.content (image_url)
  VALUES
    ('https://media.example.invalid/t2-duplicate.webp'),
    ('https://media.example.invalid/t2-duplicate.webp');

  INSERT INTO content_test_results (invariant, enforced)
  VALUES ('unique_image_url', false);
EXCEPTION
  WHEN unique_violation THEN
    INSERT INTO content_test_results (invariant, enforced)
    VALUES ('unique_image_url', true);
END;
$$;

SELECT ok(
  (
    SELECT enforced
    FROM content_test_results
    WHERE invariant = 'unique_image_url'
  ),
  'duplicate image URLs are rejected'
);

DO $$
BEGIN
  INSERT INTO public.content (image_url)
  VALUES ('   ');

  INSERT INTO content_test_results (invariant, enforced)
  VALUES ('nonblank_image_url', false);
EXCEPTION
  WHEN check_violation THEN
    INSERT INTO content_test_results (invariant, enforced)
    VALUES ('nonblank_image_url', true);
END;
$$;

SELECT ok(
  (
    SELECT enforced
    FROM content_test_results
    WHERE invariant = 'nonblank_image_url'
  ),
  'blank image URLs are rejected after trimming'
);

SELECT * FROM finish();

ROLLBACK;
