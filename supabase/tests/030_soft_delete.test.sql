BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(6);

INSERT INTO auth.users (id)
VALUES ('00000000-0000-4000-8000-40000000e001');

UPDATE app_private.editor_configuration
SET editor_subject = '00000000-0000-4000-8000-40000000e001'
WHERE singleton;

INSERT INTO public.content (id, image_url)
VALUES (
  '00000000-0000-4000-8000-400000000001',
  'https://media.example.invalid/t4-first-delete.webp'
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
VALUES (
  '00000000-0000-4000-8000-400000000002',
  'Soft delete first call',
  'The publication and its image must be retained.',
  'Institutional',
  DATE '2027-03-09',
  'published',
  '00000000-0000-4000-8000-400000000001'
);

CREATE TEMP TABLE soft_delete_first_observation AS
SELECT created_at, published_at
FROM public.publication
WHERE id = '00000000-0000-4000-8000-400000000002';

CREATE TEMP TABLE soft_delete_test_results (
  invariant text PRIMARY KEY,
  enforced boolean NOT NULL
) ON COMMIT DROP;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-40000000e001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT public.soft_delete_publication(
  '00000000-0000-4000-8000-400000000002'::uuid
);

RESET ROLE;

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.publication AS stored
    CROSS JOIN soft_delete_first_observation AS observed
    WHERE stored.id = '00000000-0000-4000-8000-400000000002'
      AND stored.content_id = '00000000-0000-4000-8000-400000000001'
      AND stored.created_at = observed.created_at
      AND stored.published_at = observed.published_at
      AND stored.deleted_at IS NOT NULL
      AND stored.updated_at = stored.deleted_at
      AND stored.deleted_at > TIMESTAMPTZ '2020-01-01 00:00:00+00'
  )
  AND EXISTS (
    SELECT 1
    FROM public.content
    WHERE id = '00000000-0000-4000-8000-400000000001'
      AND image_url = 'https://media.example.invalid/t4-first-delete.webp'
  ),
  'the first soft deletion uses one trusted instant and retains the publication and content'
);

CREATE TEMP TABLE soft_delete_repeat_observation AS
SELECT updated_at, deleted_at
FROM public.publication
WHERE id = '00000000-0000-4000-8000-400000000002';

SELECT pg_sleep(0.01);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-40000000e001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT public.soft_delete_publication(
  '00000000-0000-4000-8000-400000000002'
);

RESET ROLE;

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.publication AS stored
    CROSS JOIN soft_delete_repeat_observation AS observed
    WHERE stored.id = '00000000-0000-4000-8000-400000000002'
      AND stored.updated_at = observed.updated_at
      AND stored.deleted_at = observed.deleted_at
  ),
  'repeating soft deletion leaves its trusted timestamps unchanged'
);

DO $$
BEGIN
  BEGIN
    UPDATE public.publication
    SET title = 'Deleted publication changed directly'
    WHERE id = '00000000-0000-4000-8000-400000000002';
    INSERT INTO soft_delete_test_results VALUES ('deleted_title_update_blocked', false);
  EXCEPTION
    WHEN object_not_in_prerequisite_state THEN
      INSERT INTO soft_delete_test_results VALUES ('deleted_title_update_blocked', true);
  END;

  BEGIN
    UPDATE public.publication
    SET deleted_at = NULL
    WHERE id = '00000000-0000-4000-8000-400000000002';
    INSERT INTO soft_delete_test_results VALUES ('deleted_restore_blocked', false);
  EXCEPTION
    WHEN object_not_in_prerequisite_state THEN
      INSERT INTO soft_delete_test_results VALUES ('deleted_restore_blocked', true);
  END;
END;
$$;

SELECT is(
  (
    SELECT count(*)
    FROM soft_delete_test_results
    WHERE invariant IN (
      'deleted_title_update_blocked',
      'deleted_restore_blocked'
    )
      AND enforced
  ),
  2::bigint,
  'direct changes and restoration of an already-deleted publication are rejected'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS procedure
    CROSS JOIN LATERAL aclexplode(
      coalesce(
        procedure.proacl,
        acldefault('f', procedure.proowner)
      )
    ) AS privilege
    WHERE procedure.oid = 'public.soft_delete_publication(uuid)'::regprocedure
      AND privilege.grantee = 0
      AND privilege.privilege_type = 'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.soft_delete_publication(uuid)',
    'EXECUTE'
  )
  AND has_function_privilege(
    'authenticated',
    'public.soft_delete_publication(uuid)',
    'EXECUTE'
  )
  AND (
    SELECT procedure.prosecdef
      AND 'search_path=""' = ANY (procedure.proconfig)
    FROM pg_catalog.pg_proc AS procedure
    WHERE procedure.oid = 'public.soft_delete_publication(uuid)'::regprocedure
  )
  AND NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY['anon', 'authenticated']) AS client(role_name)
    CROSS JOIN unnest(
      ARRAY['public.publication', 'public.content']
    ) AS storage(table_name)
    WHERE has_table_privilege(
      client.role_name,
      storage.table_name,
      'DELETE'
    )
  ),
  'the guarded definer soft-delete seam is authenticated while physical table deletion remains closed'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-40000000e001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$
    SELECT public.soft_delete_publication(
      '00000000-0000-4000-8000-400000000099'::uuid
    )
  $$,
  'soft deletion of an unknown publication completes without changing storage'
);

RESET ROLE;

-- Direct physical DELETE on an already soft-deleted row should be an idempotent no-op, not throw 55000.
SELECT lives_ok(
  $$
    DELETE FROM public.publication
    WHERE id = '00000000-0000-4000-8000-400000000002';
  $$,
  'direct physical delete on an already soft-deleted publication is an idempotent no-op'
);

SELECT * FROM finish();

ROLLBACK;
