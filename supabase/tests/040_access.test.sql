BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(32);

-- Keep access expectations deterministic when local seed data is present.
-- The surrounding transaction restores all seeded rows on rollback.
TRUNCATE TABLE public.publication, public.content;

INSERT INTO public.content (id, image_url)
VALUES
  (
    '00000000-0000-4000-8000-500000000001',
    'https://media.example.invalid/t5-public.webp'
  ),
  (
    '00000000-0000-4000-8000-500000000003',
    'https://media.example.invalid/t5-draft.webp'
  ),
  (
    '00000000-0000-4000-8000-500000000005',
    'https://media.example.invalid/t5-deleted.webp'
  ),
  (
    '00000000-0000-4000-8000-500000000007',
    'https://media.example.invalid/t5-unreferenced.webp'
  ),
  (
    '00000000-0000-4000-8000-500000000009',
    'https://media.example.invalid/t5-public-same-date.webp'
  ),
  (
    '00000000-0000-4000-8000-500000000011',
    'https://media.example.invalid/t5-public-older.webp'
  );

INSERT INTO public.publication (
  id,
  title,
  description,
  category,
  publication_date,
  status,
  content_id
)
VALUES
  (
    '00000000-0000-4000-8000-500000000002',
    'Public projection',
    'Visible public description.',
    'Institutional',
    DATE '2027-03-09',
    'published',
    '00000000-0000-4000-8000-500000000001'
  ),
  (
    '00000000-0000-4000-8000-500000000004',
    'Draft projection',
    'This draft must remain private.',
    'Institutional',
    DATE '2027-03-10',
    'draft',
    '00000000-0000-4000-8000-500000000003'
  ),
  (
    '00000000-0000-4000-8000-500000000006',
    'Deleted projection',
    'This deleted publication must remain private.',
    'Institutional',
    DATE '2027-03-11',
    'published',
    '00000000-0000-4000-8000-500000000005'
  ),
  (
    '00000000-0000-4000-8000-500000000010',
    'Same-date public projection',
    'Visible public description for ordering.',
    'Institutional',
    DATE '2027-03-09',
    'published',
    '00000000-0000-4000-8000-500000000009'
  ),
  (
    '00000000-0000-4000-8000-500000000012',
    'Older public projection',
    'Visible public description for cursor pagination.',
    'Institutional',
    DATE '2027-03-08',
    'published',
    '00000000-0000-4000-8000-500000000011'
  );

DELETE FROM public.publication
WHERE id = '00000000-0000-4000-8000-500000000006';

SELECT set_config('request.jwt.claims', '{}', true);
SET LOCAL ROLE anon;

SELECT is(
  (
    SELECT array_agg(id)
    FROM public.read_publications()
  ),
  ARRAY[
    '00000000-0000-4000-8000-500000000010'::uuid,
    '00000000-0000-4000-8000-500000000002'::uuid,
    '00000000-0000-4000-8000-500000000012'::uuid
  ],
  'anonymous listing returns public rows in publication date and id descending order'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM public.read_publications(
      p_id => '00000000-0000-4000-8000-500000000004'
    )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.read_publications(
      p_id => '00000000-0000-4000-8000-500000000006'
    )
  ),
  'known draft and deleted ids cannot bypass public detail filtering'
);

SELECT is(
  (
    SELECT ROW(
      id,
      title,
      description,
      category,
      publication_date,
      image_url
    )::text
    FROM public.read_publications(
      p_id => '00000000-0000-4000-8000-500000000002'
    )
  ),
  ROW(
    '00000000-0000-4000-8000-500000000002'::uuid,
    'Public projection',
    'Visible public description.',
    'Institutional',
    DATE '2027-03-09',
    'https://media.example.invalid/t5-public.webp'
  )::text,
  'anonymous detail returns only the approved public values for a known public id'
);

SELECT is(
  (
    SELECT count(*)
    FROM public.read_publications(
      p_id => '00000000-0000-4000-8000-500000000099'
    )
  ),
  0::bigint,
  'anonymous detail returns no row for an unknown publication id'
);

SELECT is(
  (
    SELECT array_agg(id)
    FROM public.read_publications(p_limit => 2)
  ),
  ARRAY[
    '00000000-0000-4000-8000-500000000010'::uuid,
    '00000000-0000-4000-8000-500000000002'::uuid
  ],
  'anonymous listing applies the requested bounded page size'
);

SELECT is(
  (
    SELECT array_agg(id)
    FROM public.read_publications(
      p_limit => 50,
      p_cursor_date => DATE '2027-03-09',
      p_cursor_id => '00000000-0000-4000-8000-500000000010'
    )
  ),
  ARRAY[
    '00000000-0000-4000-8000-500000000002'::uuid,
    '00000000-0000-4000-8000-500000000012'::uuid
  ],
  'anonymous listing applies the exclusive public cursor tuple'
);

SELECT throws_ok(
  $$ SELECT * FROM public.read_publications(p_limit => 0) $$,
  '22023',
  'p_limit must be between 1 and 51',
  'public listing rejects a page size below one'
);

SELECT lives_ok(
  $$ SELECT * FROM public.read_publications(p_limit => 51) $$,
  'public listing accepts limit 51 to support Edge Function limit + 1 pagination'
);

SELECT throws_ok(
  $$ SELECT * FROM public.read_publications(p_limit => 52) $$,
  '22023',
  'p_limit must be between 1 and 51',
  'public listing rejects a page size above fifty-one'
);

SELECT throws_ok(
  $$
    SELECT *
    FROM public.read_publications(p_cursor_date => DATE '2027-03-09')
  $$,
  '22023',
  'p_cursor_date and p_cursor_id must be provided together',
  'public listing rejects a cursor date without its id'
);

SELECT throws_ok(
  $$
    SELECT *
    FROM public.read_publications(
      p_cursor_id => '00000000-0000-4000-8000-500000000010'
    )
  $$,
  '22023',
  'p_cursor_date and p_cursor_id must be provided together',
  'public listing rejects a cursor id without its date'
);

RESET ROLE;

SELECT ok(
  (
    SELECT array_agg(
      argument.argument_name || ':' || pg_catalog.format_type(
        argument.argument_type,
        NULL
      )
      ORDER BY argument.ordinality
    )
    FROM pg_catalog.pg_proc AS procedure
    CROSS JOIN LATERAL unnest(
      procedure.proargnames,
      procedure.proargmodes,
      procedure.proallargtypes
    ) WITH ORDINALITY AS argument(
      argument_name,
      argument_mode,
      argument_type,
      ordinality
    )
    WHERE procedure.oid =
      'public.read_publications(uuid,integer,date,uuid)'::regprocedure
      AND argument.argument_mode = 't'
  ) = ARRAY[
    'id:uuid',
    'title:text',
    'description:text',
    'category:text',
    'publication_date:date',
    'image_url:text'
  ]
  AND NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname = 'public_publications'
      AND relation.relkind = 'v'
  ),
  'the public function exposes exactly six approved fields and replaces the product view'
);

INSERT INTO auth.users (id)
VALUES
  ('00000000-0000-4000-8000-50000000e001'),
  ('00000000-0000-4000-8000-50000000e002');

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-50000000e001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.publication)
  AND NOT EXISTS (SELECT 1 FROM public.content),
  'authenticated access fails closed while no editor subject is configured'
);

SELECT throws_ok(
  $$
    INSERT INTO public.publication (
      title,
      description,
      category,
      content_id
    )
    VALUES (
      'Null configuration insert',
      'No subject may write while configuration is null.',
      'Institutional',
      '00000000-0000-4000-8000-500000000007'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "publication"',
  'null editor configuration denies editorial writes'
);

RESET ROLE;

DELETE FROM app_private.editor_configuration
WHERE singleton;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-50000000e001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.publication)
  AND NOT EXISTS (SELECT 1 FROM public.content),
  'missing editor configuration also fails closed'
);

RESET ROLE;

INSERT INTO app_private.editor_configuration (singleton, editor_subject)
VALUES (true, NULL);

UPDATE app_private.editor_configuration
SET editor_subject = '00000000-0000-4000-8000-50000000e001'
WHERE singleton;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-50000000e001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT ok(
  (
    SELECT array_agg(id ORDER BY id)
    FROM public.publication
  ) = ARRAY[
    '00000000-0000-4000-8000-500000000002'::uuid,
    '00000000-0000-4000-8000-500000000004'::uuid,
    '00000000-0000-4000-8000-500000000010'::uuid,
    '00000000-0000-4000-8000-500000000012'::uuid
  ]
  AND (
    SELECT array_agg(id ORDER BY id)
    FROM public.content
  ) = ARRAY[
    '00000000-0000-4000-8000-500000000001'::uuid,
    '00000000-0000-4000-8000-500000000003'::uuid,
    '00000000-0000-4000-8000-500000000007'::uuid,
    '00000000-0000-4000-8000-500000000009'::uuid,
    '00000000-0000-4000-8000-500000000011'::uuid
  ],
  'the configured editor reads live publications plus unreferenced or live content only'
);

RESET ROLE;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-50000000e002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.publication)
  AND NOT EXISTS (SELECT 1 FROM public.content),
  'a different authenticated subject cannot read editorial storage'
);

RESET ROLE;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-50000000e002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*) FROM public.read_publications()),
  3::bigint,
  'the public function remains available to a non-editor authenticated subject'
);

RESET ROLE;

SELECT set_config('request.jwt.claims', '{}', true);
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$ SELECT * FROM public.publication $$,
  '42501',
  'permission denied for table publication',
  'anonymous callers cannot read raw publication storage'
);

RESET ROLE;

SELECT set_config('request.jwt.claims', '{}', true);
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$ SELECT * FROM public.content $$,
  '42501',
  'permission denied for table content',
  'anonymous callers cannot read raw content storage'
);

RESET ROLE;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-50000000e001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$
    UPDATE app_private.editor_configuration
    SET editor_subject = '00000000-0000-4000-8000-50000000e002'
    WHERE singleton
  $$,
  '42501',
  'permission denied for table editor_configuration',
  'the editor cannot assign or replace the configured editor subject'
);

RESET ROLE;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-50000000e001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

INSERT INTO public.publication (
  title,
  description,
  category,
  publication_date,
  status,
  content_id
)
VALUES (
  'Editor-created publication',
  'Created through authenticated column grants.',
  'Institutional',
  DATE '2027-04-01',
  'draft',
  '00000000-0000-4000-8000-500000000007'
)
RETURNING id, created_at
\gset access_write_

SELECT pg_sleep(0.01);

UPDATE public.publication
SET
  title = 'Editor-updated publication',
  status = 'published',
  publication_date = DATE '2027-04-02'
WHERE id = :'access_write_id';

SELECT ok(
  (
    SELECT
      title = 'Editor-updated publication'
      AND status = 'published'
      AND publication_date = DATE '2027-04-02'
      AND created_at = :'access_write_created_at'::timestamptz
      AND updated_at > created_at
      AND published_at = updated_at
      AND deleted_at IS NULL
    FROM public.publication
    WHERE id = :'access_write_id'
  ),
  'the exact configured editor can insert and update approved business columns with trusted timestamps'
);

RESET ROLE;

INSERT INTO public.content (id, image_url)
VALUES (
  '00000000-0000-4000-8000-500000000008',
  'https://media.example.invalid/t5-negative-write.webp'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-50000000e001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$
    INSERT INTO public.content (image_url)
    VALUES ('https://attacker.example.invalid/arbitrary.webp')
  $$,
  '42501',
  'permission denied for table content',
  'the configured editor cannot insert arbitrary content URLs'
);

RESET ROLE;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-50000000e002","role":"authenticated","app_metadata":{"role":"editor"}}',
  true
);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$
    INSERT INTO public.publication (
      title,
      description,
      category,
      content_id
    )
    VALUES (
      'Wrong subject insert',
      'A custom role claim cannot replace the configured subject.',
      'Institutional',
      '00000000-0000-4000-8000-500000000008'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "publication"',
  'a wrong subject cannot insert even with a hostile editor role claim'
);

UPDATE public.publication
SET title = 'Wrong subject update'
WHERE id = '00000000-0000-4000-8000-500000000002';

RESET ROLE;

SELECT is(
  (
    SELECT title
    FROM public.publication
    WHERE id = '00000000-0000-4000-8000-500000000002'
  ),
  'Public projection',
  'a wrong subject cannot update a publication hidden by editorial RLS'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-50000000e002","role":"authenticated","user_role":"editor"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$
    SELECT public.soft_delete_publication(
      '00000000-0000-4000-8000-500000000002'
    )
  $$,
  '42501',
  'editor subject required',
  'a wrong subject cannot soft-delete through the guarded definer function'
);

RESET ROLE;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-50000000e001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$
    INSERT INTO public.publication (
      id,
      title,
      description,
      category,
      content_id,
      created_at,
      deleted_at
    )
    VALUES (
      '00000000-0000-4000-8000-500000000009',
      'Spoofed technical fields',
      'Client ids and timestamps are not writable.',
      'Institutional',
      '00000000-0000-4000-8000-500000000008',
      TIMESTAMPTZ '2000-01-01 00:00:00+00',
      TIMESTAMPTZ '2001-01-01 00:00:00+00'
    )
  $$,
  '42501',
  'permission denied for table publication',
  'the editor cannot spoof publication ids or technical timestamps on insert'
);

SELECT throws_ok(
  $$
    UPDATE public.publication
    SET
      deleted_at = TIMESTAMPTZ '2000-01-01 00:00:00+00',
      updated_at = TIMESTAMPTZ '2000-01-01 00:00:00+00'
    WHERE id = '00000000-0000-4000-8000-500000000002'
  $$,
  '42501',
  'permission denied for table publication',
  'the editor cannot directly alter deletion or system timestamps'
);

SELECT throws_ok(
  $$
    INSERT INTO public.publication (
      title,
      description,
      category,
      content_id
    )
    VALUES (
      'Duplicate image attachment',
      'An existing publication already owns this content.',
      'Institutional',
      '00000000-0000-4000-8000-500000000001'
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "publication_content_id_key"',
  'the editor cannot attach one content row to multiple publications'
);

SELECT throws_ok(
  $$
    DELETE FROM public.publication
    WHERE id = '00000000-0000-4000-8000-500000000002'
  $$,
  '42501',
  'permission denied for table publication',
  'the editor has no direct physical delete privilege'
);

RESET ROLE;

SELECT ok(
  has_function_privilege(
    'anon',
    'public.read_publications(uuid,integer,date,uuid)',
    'EXECUTE'
  )
  AND has_function_privilege(
    'authenticated',
    'public.read_publications(uuid,integer,date,uuid)',
    'EXECUTE'
  )
  AND NOT has_table_privilege('anon', 'public.publication', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.content', 'SELECT')
  AND has_table_privilege(
    'authenticated',
    'public.publication',
    'SELECT'
  )
  AND NOT has_table_privilege(
    'authenticated',
    'public.publication',
    'DELETE'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM unnest(
      ARRAY['id', 'created_at', 'updated_at', 'published_at', 'deleted_at']
    ) AS technical(column_name)
    CROSS JOIN unnest(ARRAY['INSERT', 'UPDATE']) AS operation(privilege_name)
    WHERE has_column_privilege(
      'authenticated',
      'public.publication',
      technical.column_name,
      operation.privilege_name
    )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM unnest(
      ARRAY[
        'title',
        'description',
        'category',
        'status',
        'publication_date',
        'content_id'
      ]
    ) AS business(column_name)
    CROSS JOIN unnest(ARRAY['INSERT', 'UPDATE']) AS operation(privilege_name)
    WHERE NOT has_column_privilege(
      'authenticated',
      'public.publication',
      business.column_name,
      operation.privilege_name
    )
  )
  AND has_table_privilege('authenticated', 'public.content', 'SELECT')
  AND NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY['INSERT', 'UPDATE', 'DELETE']) AS privilege(name)
    WHERE has_table_privilege(
      'authenticated',
      'public.content',
      privilege.name
    )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY['anon', 'authenticated']) AS client(role_name)
    CROSS JOIN unnest(
      ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']
    ) AS privilege(name)
    WHERE has_table_privilege(
      client.role_name,
      'app_private.editor_configuration',
      privilege.name
    )
  ),
  'function, storage and private configuration grants match the least-privilege boundary'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS procedure
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE procedure.prosecdef
      AND namespace.nspname IN ('public', 'app_private')
      AND procedure.oid <>
        'public.read_publications(uuid,integer,date,uuid)'::regprocedure
      AND (
        has_function_privilege('anon', procedure.oid, 'EXECUTE')
        OR EXISTS (
          SELECT 1
          FROM aclexplode(
            coalesce(
              procedure.proacl,
              acldefault('f', procedure.proowner)
            )
          ) AS privilege
          WHERE privilege.grantee = 0
            AND privilege.privilege_type = 'EXECUTE'
        )
      )
  )
  AND (
    SELECT procedure.prosecdef
      AND 'search_path=""' = ANY (procedure.proconfig)
      AND NOT EXISTS (
        SELECT 1
        FROM aclexplode(
          coalesce(
            procedure.proacl,
            acldefault('f', procedure.proowner)
          )
        ) AS privilege
        WHERE privilege.grantee = 0
          AND privilege.privilege_type = 'EXECUTE'
      )
    FROM pg_catalog.pg_proc AS procedure
    WHERE procedure.oid =
      'public.read_publications(uuid,integer,date,uuid)'::regprocedure
  )
  AND has_function_privilege(
    'authenticated',
    'app_private.is_editor()',
    'EXECUTE'
  )
  AND has_function_privilege(
    'authenticated',
    'app_private.can_read_content(uuid)',
    'EXECUTE'
  )
  AND has_function_privilege(
    'authenticated',
    'public.soft_delete_publication(uuid)',
    'EXECUTE'
  ),
  'security-definer helpers expose only the public read seam and required authenticated gates'
);

SELECT * FROM finish();

ROLLBACK;
