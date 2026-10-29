CREATE SCHEMA app_private;

REVOKE ALL
ON SCHEMA app_private
FROM PUBLIC, anon, authenticated;

CREATE TABLE app_private.editor_configuration (
  singleton boolean PRIMARY KEY DEFAULT true
    CONSTRAINT editor_configuration_singleton CHECK (singleton),
  editor_subject uuid
    CONSTRAINT editor_configuration_editor_subject_fkey
    REFERENCES auth.users (id)
    ON DELETE RESTRICT
);

INSERT INTO app_private.editor_configuration (singleton, editor_subject)
VALUES (true, NULL);

REVOKE ALL
ON TABLE app_private.editor_configuration
FROM PUBLIC, anon, authenticated;

CREATE FUNCTION app_private.is_editor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    (
      SELECT configuration.editor_subject = auth.uid()
      FROM app_private.editor_configuration AS configuration
      WHERE configuration.singleton
    ),
    false
  );
$$;

REVOKE ALL
ON FUNCTION app_private.is_editor()
FROM PUBLIC, anon, authenticated;

CREATE FUNCTION app_private.can_read_content(candidate_content_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT app_private.is_editor()
    AND (
      NOT EXISTS (
        SELECT 1
        FROM public.publication AS publication
        WHERE publication.content_id = candidate_content_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.publication AS publication
        WHERE publication.content_id = candidate_content_id
          AND publication.deleted_at IS NULL
      )
    );
$$;

REVOKE ALL
ON FUNCTION app_private.can_read_content(uuid)
FROM PUBLIC, anon, authenticated;

GRANT USAGE
ON SCHEMA app_private
TO authenticated;

GRANT EXECUTE
ON FUNCTION app_private.is_editor()
TO authenticated;

GRANT EXECUTE
ON FUNCTION app_private.can_read_content(uuid)
TO authenticated;

ALTER TABLE public.publication FORCE ROW LEVEL SECURITY;
ALTER TABLE public.content FORCE ROW LEVEL SECURITY;

CREATE POLICY publication_editor_select
ON public.publication
FOR SELECT
TO authenticated
USING (
  app_private.is_editor()
  AND deleted_at IS NULL
);

CREATE POLICY content_editor_select
ON public.content
FOR SELECT
TO authenticated
USING (app_private.can_read_content(id));

GRANT SELECT
ON TABLE public.publication
TO authenticated;

GRANT SELECT
ON TABLE public.content
TO authenticated;
