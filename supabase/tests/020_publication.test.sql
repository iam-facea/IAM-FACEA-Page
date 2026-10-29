BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(8);

INSERT INTO public.content (image_url)
VALUES ('https://media.example.invalid/t3-create.webp')
RETURNING id \gset publication_create_content_

INSERT INTO public.publication (
  title,
  description,
  category,
  publication_date,
  content_id
)
VALUES (
  'Research conference',
  'An open academic event.',
  'Institutional',
  DATE '2027-03-09',
  :'publication_create_content_id'
);

SELECT is(
  (
    SELECT ROW(
      title,
      description,
      category,
      publication_date,
      status,
      content_id
    )::text
    FROM public.publication
    WHERE content_id = :'publication_create_content_id'
  ),
  ROW(
    'Research conference',
    'An open academic event.',
    'Institutional',
    DATE '2027-03-09',
    'draft',
    :'publication_create_content_id'::uuid
  )::text,
  'a valid draft publication can be created and retrieved'
);

CREATE TEMP TABLE publication_test_results (
  invariant text PRIMARY KEY,
  enforced boolean NOT NULL
) ON COMMIT DROP;

DO $$
DECLARE
  candidate_content_id uuid;
BEGIN
  INSERT INTO public.content (image_url)
  VALUES ('https://media.example.invalid/t3-title-blank.webp')
  RETURNING id INTO candidate_content_id;

  BEGIN
    INSERT INTO public.publication (title, description, category, content_id)
    VALUES ('   ', 'Valid description', 'Institutional', candidate_content_id);
    INSERT INTO publication_test_results VALUES ('title_blank', false);
  EXCEPTION WHEN check_violation THEN
    INSERT INTO publication_test_results VALUES ('title_blank', true);
  END;

  INSERT INTO public.content (image_url)
  VALUES ('https://media.example.invalid/t3-title-untrimmed.webp')
  RETURNING id INTO candidate_content_id;

  BEGIN
    INSERT INTO public.publication (title, description, category, content_id)
    VALUES (' Untrimmed title', 'Valid description', 'Institutional', candidate_content_id);
    INSERT INTO publication_test_results VALUES ('title_untrimmed', false);
  EXCEPTION WHEN check_violation THEN
    INSERT INTO publication_test_results VALUES ('title_untrimmed', true);
  END;

  INSERT INTO public.content (image_url)
  VALUES ('https://media.example.invalid/t3-title-long.webp')
  RETURNING id INTO candidate_content_id;

  BEGIN
    INSERT INTO public.publication (title, description, category, content_id)
    VALUES (repeat('t', 161), 'Valid description', 'Institutional', candidate_content_id);
    INSERT INTO publication_test_results VALUES ('title_too_long', false);
  EXCEPTION WHEN string_data_right_truncation OR check_violation THEN
    INSERT INTO publication_test_results VALUES ('title_too_long', true);
  END;

  INSERT INTO public.content (image_url)
  VALUES ('https://media.example.invalid/t3-description-blank.webp')
  RETURNING id INTO candidate_content_id;

  BEGIN
    INSERT INTO public.publication (title, description, category, content_id)
    VALUES ('Valid title', E'\t ', 'Institutional', candidate_content_id);
    INSERT INTO publication_test_results VALUES ('description_blank', false);
  EXCEPTION WHEN check_violation THEN
    INSERT INTO publication_test_results VALUES ('description_blank', true);
  END;

  INSERT INTO public.content (image_url)
  VALUES ('https://media.example.invalid/t3-description-untrimmed.webp')
  RETURNING id INTO candidate_content_id;

  BEGIN
    INSERT INTO public.publication (title, description, category, content_id)
    VALUES ('Valid title', 'Untrimmed description ', 'Institutional', candidate_content_id);
    INSERT INTO publication_test_results VALUES ('description_untrimmed', false);
  EXCEPTION WHEN check_violation THEN
    INSERT INTO publication_test_results VALUES ('description_untrimmed', true);
  END;

  INSERT INTO public.content (image_url)
  VALUES ('https://media.example.invalid/t3-description-long.webp')
  RETURNING id INTO candidate_content_id;

  BEGIN
    INSERT INTO public.publication (title, description, category, content_id)
    VALUES ('Valid title', repeat('d', 1001), 'Institutional', candidate_content_id);
    INSERT INTO publication_test_results VALUES ('description_too_long', false);
  EXCEPTION WHEN check_violation THEN
    INSERT INTO publication_test_results VALUES ('description_too_long', true);
  END;

  INSERT INTO public.content (image_url)
  VALUES ('https://media.example.invalid/t3-category-blank.webp')
  RETURNING id INTO candidate_content_id;

  BEGIN
    INSERT INTO public.publication (title, description, category, content_id)
    VALUES ('Valid title', 'Valid description', '   ', candidate_content_id);
    INSERT INTO publication_test_results VALUES ('category_blank', false);
  EXCEPTION WHEN check_violation THEN
    INSERT INTO publication_test_results VALUES ('category_blank', true);
  END;

  INSERT INTO public.content (image_url)
  VALUES ('https://media.example.invalid/t3-category-untrimmed.webp')
  RETURNING id INTO candidate_content_id;

  BEGIN
    INSERT INTO public.publication (title, description, category, content_id)
    VALUES ('Valid title', 'Valid description', ' Institutional', candidate_content_id);
    INSERT INTO publication_test_results VALUES ('category_untrimmed', false);
  EXCEPTION WHEN check_violation THEN
    INSERT INTO publication_test_results VALUES ('category_untrimmed', true);
  END;

  INSERT INTO public.content (image_url)
  VALUES ('https://media.example.invalid/t3-category-long.webp')
  RETURNING id INTO candidate_content_id;

  BEGIN
    INSERT INTO public.publication (title, description, category, content_id)
    VALUES ('Valid title', 'Valid description', repeat('c', 81), candidate_content_id);
    INSERT INTO publication_test_results VALUES ('category_too_long', false);
  EXCEPTION WHEN string_data_right_truncation OR check_violation THEN
    INSERT INTO publication_test_results VALUES ('category_too_long', true);
  END;

  INSERT INTO public.content (image_url)
  VALUES ('https://media.example.invalid/t3-status-invalid.webp')
  RETURNING id INTO candidate_content_id;

  BEGIN
    INSERT INTO public.publication (title, description, category, status, content_id)
    VALUES ('Valid title', 'Valid description', 'Institutional', 'archived', candidate_content_id);
    INSERT INTO publication_test_results VALUES ('status_invalid', false);
  EXCEPTION WHEN check_violation THEN
    INSERT INTO publication_test_results VALUES ('status_invalid', true);
  END;
END;
$$;

SELECT is(
  (
    SELECT count(*)
    FROM publication_test_results
    WHERE enforced
  ),
  10::bigint,
  'blank, untrimmed, oversized text and unsupported statuses are rejected'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO public.publication (title, description, category, content_id)
    VALUES (
      'Missing image relation',
      'This publication points at no stored content.',
      'Institutional',
      '00000000-0000-4000-8000-000000000001'
    );
    INSERT INTO publication_test_results VALUES ('content_fk', false);
  EXCEPTION WHEN foreign_key_violation THEN
    INSERT INTO publication_test_results VALUES ('content_fk', true);
  END;

  BEGIN
    INSERT INTO public.publication (title, description, category, content_id)
    VALUES (
      'Duplicate image relation',
      'This publication reuses stored content.',
      'Institutional',
      (
        SELECT id
        FROM public.content
        WHERE image_url = 'https://media.example.invalid/t3-create.webp'
      )
    );
    INSERT INTO publication_test_results VALUES ('content_unique', false);
  EXCEPTION WHEN unique_violation THEN
    INSERT INTO publication_test_results VALUES ('content_unique', true);
  END;
END;
$$;

SELECT is(
  (
    SELECT count(*)
    FROM publication_test_results
    WHERE invariant IN ('content_fk', 'content_unique')
      AND enforced
  ),
  2::bigint,
  'each publication references one existing content row that no other publication uses'
);

CREATE TEMP TABLE publication_date_observations (
  zone_name text PRIMARY KEY,
  publication_id uuid NOT NULL,
  observed_date date NOT NULL
) ON COMMIT DROP;

SET LOCAL TIME ZONE 'Pacific/Kiritimati';

INSERT INTO public.content (image_url)
VALUES ('https://media.example.invalid/t3-date-kiritimati.webp')
RETURNING id \gset publication_date_kiritimati_content_

INSERT INTO public.publication (title, description, category, content_id)
VALUES (
  'Kiritimati date check',
  'Creation omits the editorial date.',
  'Institutional',
  :'publication_date_kiritimati_content_id'
)
RETURNING id, publication_date \gset publication_date_kiritimati_

INSERT INTO publication_date_observations
VALUES (
  'Pacific/Kiritimati',
  :'publication_date_kiritimati_id',
  :'publication_date_kiritimati_publication_date'
);

SET LOCAL TIME ZONE 'Pacific/Pago_Pago';

INSERT INTO public.content (image_url)
VALUES ('https://media.example.invalid/t3-date-pago-pago.webp')
RETURNING id \gset publication_date_pago_content_

INSERT INTO public.publication (title, description, category, content_id)
VALUES (
  'Pago Pago date check',
  'Creation omits the editorial date.',
  'Institutional',
  :'publication_date_pago_content_id'
)
RETURNING id, publication_date \gset publication_date_pago_

INSERT INTO publication_date_observations
VALUES (
  'Pacific/Pago_Pago',
  :'publication_date_pago_id',
  :'publication_date_pago_publication_date'
);

UPDATE public.publication
SET publication_date = DATE '2030-01-15'
WHERE id = :'publication_date_kiritimati_id';

SET LOCAL TIME ZONE 'UTC';

SELECT ok(
  (
    SELECT bool_and(
      observed_date = (
        transaction_timestamp()
        AT TIME ZONE 'America/Argentina/Buenos_Aires'
      )::date
    )
    FROM publication_date_observations
  )
  AND (
    SELECT publication_date = DATE '2030-01-15'
    FROM public.publication
    WHERE id = :'publication_date_kiritimati_id'
  ),
  'the default publication date uses the Argentina day in every session timezone and remains editable'
);

INSERT INTO public.content (image_url)
VALUES ('https://media.example.invalid/t3-trusted-times.webp')
RETURNING id \gset publication_trusted_times_content_

INSERT INTO public.publication (
  title,
  description,
  category,
  publication_date,
  content_id,
  created_at,
  updated_at,
  published_at,
  deleted_at
)
VALUES (
  'Trusted timestamp check',
  'Client-provided technical timestamps must not be stored.',
  'Institutional',
  DATE '2027-03-09',
  :'publication_trusted_times_content_id',
  TIMESTAMPTZ '2000-01-01 00:00:00+00',
  TIMESTAMPTZ '2001-01-01 00:00:00+00',
  TIMESTAMPTZ '2002-01-01 00:00:00+00',
  TIMESTAMPTZ '2003-01-01 00:00:00+00'
)
RETURNING id \gset publication_trusted_times_

CREATE TEMP TABLE publication_time_observations AS
SELECT id, created_at, updated_at
FROM public.publication
WHERE id = :'publication_trusted_times_id';

SELECT pg_sleep(0.01);

UPDATE public.publication
SET
  title = 'Trusted timestamp check updated',
  created_at = TIMESTAMPTZ '1999-01-01 00:00:00+00',
  updated_at = TIMESTAMPTZ '1999-01-01 00:00:00+00',
  published_at = TIMESTAMPTZ '1999-01-01 00:00:00+00',
  deleted_at = TIMESTAMPTZ '1999-01-01 00:00:00+00'
WHERE id = :'publication_trusted_times_id';

SELECT ok(
  (
    SELECT
      stored.created_at = observed.created_at
      AND observed.created_at = observed.updated_at
      AND observed.created_at > TIMESTAMPTZ '2020-01-01 00:00:00+00'
      AND stored.updated_at > observed.updated_at
      AND stored.published_at IS NULL
      AND stored.deleted_at IS NULL
    FROM public.publication AS stored
    JOIN publication_time_observations AS observed USING (id)
    WHERE stored.id = :'publication_trusted_times_id'
  ),
  'technical timestamps ignore client values, keep creation immutable and refresh updates from trusted time'
);

CREATE TEMP TABLE publication_lifecycle_observations (
  stage text PRIMARY KEY,
  published_at timestamptz,
  publication_date date NOT NULL
) ON COMMIT DROP;

INSERT INTO public.content (image_url)
VALUES ('https://media.example.invalid/t3-lifecycle.webp')
RETURNING id \gset publication_lifecycle_content_

INSERT INTO public.publication (
  title,
  description,
  category,
  publication_date,
  content_id
)
VALUES (
  'Publication lifecycle',
  'Publication and withdrawal transitions use trusted time.',
  'Institutional',
  DATE '2027-03-01',
  :'publication_lifecycle_content_id'
)
RETURNING id \gset publication_lifecycle_

SELECT pg_sleep(0.01);

UPDATE public.publication
SET
  status = 'published',
  published_at = TIMESTAMPTZ '2000-01-01 00:00:00+00'
WHERE id = :'publication_lifecycle_id';

INSERT INTO publication_lifecycle_observations
SELECT 'first_publish', published_at, publication_date
FROM public.publication
WHERE id = :'publication_lifecycle_id';

SELECT pg_sleep(0.01);

UPDATE public.publication
SET
  title = 'Publication lifecycle updated',
  publication_date = DATE '2027-04-02',
  published_at = TIMESTAMPTZ '2001-01-01 00:00:00+00'
WHERE id = :'publication_lifecycle_id';

INSERT INTO publication_lifecycle_observations
SELECT 'published_update', published_at, publication_date
FROM public.publication
WHERE id = :'publication_lifecycle_id';

SELECT pg_sleep(0.01);

UPDATE public.publication
SET
  status = 'draft',
  published_at = TIMESTAMPTZ '2002-01-01 00:00:00+00'
WHERE id = :'publication_lifecycle_id';

INSERT INTO publication_lifecycle_observations
SELECT 'withdraw', published_at, publication_date
FROM public.publication
WHERE id = :'publication_lifecycle_id';

SELECT pg_sleep(0.01);

UPDATE public.publication
SET
  status = 'published',
  published_at = TIMESTAMPTZ '2003-01-01 00:00:00+00'
WHERE id = :'publication_lifecycle_id';

INSERT INTO publication_lifecycle_observations
SELECT 'republish', published_at, publication_date
FROM public.publication
WHERE id = :'publication_lifecycle_id';

INSERT INTO public.content (image_url)
VALUES ('https://media.example.invalid/t3-created-published.webp')
RETURNING id \gset publication_created_published_content_

INSERT INTO public.publication (
  title,
  description,
  category,
  status,
  content_id,
  published_at
)
VALUES (
  'Created published',
  'A publication may be visible immediately.',
  'Institutional',
  'published',
  :'publication_created_published_content_id',
  TIMESTAMPTZ '2004-01-01 00:00:00+00'
);

SELECT ok(
  (
    SELECT first_publish.published_at IS NOT NULL
      AND first_publish.published_at > TIMESTAMPTZ '2020-01-01 00:00:00+00'
      AND published_update.published_at = first_publish.published_at
      AND withdraw.published_at IS NULL
      AND republish.published_at > first_publish.published_at
      AND published_update.publication_date = DATE '2027-04-02'
      AND withdraw.publication_date = DATE '2027-04-02'
      AND republish.publication_date = DATE '2027-04-02'
    FROM publication_lifecycle_observations AS first_publish
    CROSS JOIN publication_lifecycle_observations AS published_update
    CROSS JOIN publication_lifecycle_observations AS withdraw
    CROSS JOIN publication_lifecycle_observations AS republish
    WHERE first_publish.stage = 'first_publish'
      AND published_update.stage = 'published_update'
      AND withdraw.stage = 'withdraw'
      AND republish.stage = 'republish'
  )
  AND (
    SELECT published_at > TIMESTAMPTZ '2020-01-01 00:00:00+00'
    FROM public.publication
    WHERE content_id = :'publication_created_published_content_id'
  ),
  'publishing uses a trusted instant, retains it while published, clears it on withdrawal and renews it on republish without resetting the editorial date'
);

SELECT ok(
  (
    SELECT relrowsecurity AND relforcerowsecurity
    FROM pg_catalog.pg_class
    WHERE oid = 'public.publication'::regclass
  )
  AND NOT EXISTS (
    SELECT 1
    FROM unnest(
      ARRAY[
        'SELECT',
        'INSERT',
        'UPDATE',
        'DELETE',
        'TRUNCATE',
        'REFERENCES',
        'TRIGGER'
      ]
    ) AS privilege(privilege_name)
    WHERE has_table_privilege(
      'anon',
      'public.publication',
      privilege.privilege_name
    )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM unnest(
      ARRAY['DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']
    ) AS privilege(privilege_name)
    WHERE has_table_privilege(
      'authenticated',
      'public.publication',
      privilege.privilege_name
    )
  ),
  'publication storage forces RLS, stays closed to anonymous access and withholds dangerous authenticated privileges'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_index AS publication_index
    JOIN pg_catalog.pg_class AS index_relation
      ON index_relation.oid = publication_index.indexrelid
    WHERE publication_index.indrelid = 'public.publication'::regclass
      AND index_relation.relname = 'publication_public_listing_idx'
      AND publication_index.indisvalid
      AND NOT publication_index.indisunique
      AND publication_index.indnkeyatts = 2
      AND publication_index.indnatts = 2
      AND pg_get_indexdef(publication_index.indexrelid, 1, true) = 'publication_date'
      AND pg_get_indexdef(publication_index.indexrelid, 2, true) = 'id'
      AND (publication_index.indoption[0] & 1) = 1
      AND (publication_index.indoption[1] & 1) = 1
      AND pg_get_expr(publication_index.indpred, publication_index.indrelid)
        LIKE '%status = ''published''::text%'
      AND pg_get_expr(publication_index.indpred, publication_index.indrelid)
        LIKE '%deleted_at IS NULL%'
  )
  AND EXISTS (
    SELECT 1
    FROM pg_catalog.pg_index AS publication_index
    JOIN pg_catalog.pg_class AS index_relation
      ON index_relation.oid = publication_index.indexrelid
    WHERE publication_index.indrelid = 'public.publication'::regclass
      AND index_relation.relname = 'publication_editor_listing_idx'
      AND publication_index.indisvalid
      AND NOT publication_index.indisunique
      AND publication_index.indnkeyatts = 2
      AND publication_index.indnatts = 2
      AND pg_get_indexdef(publication_index.indexrelid, 1, true) = 'updated_at'
      AND pg_get_indexdef(publication_index.indexrelid, 2, true) = 'id'
      AND (publication_index.indoption[0] & 1) = 1
      AND (publication_index.indoption[1] & 1) = 1
      AND pg_get_expr(publication_index.indpred, publication_index.indrelid)
        LIKE '%deleted_at IS NULL%'
  ),
  'publication listing indexes use the approved order and live-row predicates'
);

SELECT * FROM finish();

ROLLBACK;
