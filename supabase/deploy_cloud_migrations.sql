-- ============================================================
-- IAM FACEA - Cadena de 22 migraciones para Supabase Cloud
-- Ejecutar en el SQL Editor de Supabase Cloud
-- ============================================================

BEGIN;

-- 1. Asegurar tabla de control de migraciones de Supabase
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version text NOT NULL PRIMARY KEY,
  statements text[],
  name text
);

-- >>> Migración: 20261029152547_create_content.sql <<<
CREATE TABLE public.content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON TABLE public.content
FROM anon, authenticated;

ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;

-- >>> Migración: 20261029152613_add_content_image_url_unique.sql <<<
ALTER TABLE public.content
ADD CONSTRAINT content_image_url_key UNIQUE (image_url);

-- >>> Migración: 20261029152634_add_content_image_url_nonblank.sql <<<
ALTER TABLE public.content
ADD CONSTRAINT content_image_url_not_blank
CHECK (btrim(image_url) <> '');

-- >>> Migración: 20261029153027_create_publication.sql <<<
CREATE TABLE public.publication (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(160) NOT NULL,
  description text NOT NULL,
  category varchar(80) NOT NULL,
  publication_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft',
  content_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  deleted_at timestamptz
);

-- >>> Migración: 20261029153105_validate_publication_text.sql <<<
ALTER TABLE public.publication
ADD CONSTRAINT publication_title_valid
CHECK (
  title = regexp_replace(title, '^[[:space:]]+|[[:space:]]+$', '', 'g')
  AND char_length(title) BETWEEN 1 AND 160
),
ADD CONSTRAINT publication_description_valid
CHECK (
  description = regexp_replace(description, '^[[:space:]]+|[[:space:]]+$', '', 'g')
  AND char_length(description) BETWEEN 1 AND 1000
),
ADD CONSTRAINT publication_category_valid
CHECK (
  category = regexp_replace(category, '^[[:space:]]+|[[:space:]]+$', '', 'g')
  AND char_length(category) BETWEEN 1 AND 80
),
ADD CONSTRAINT publication_status_valid
CHECK (status IN ('draft', 'published'));

-- >>> Migración: 20261029153136_link_publication_content.sql <<<
ALTER TABLE public.publication
ADD CONSTRAINT publication_content_id_fkey
FOREIGN KEY (content_id)
REFERENCES public.content (id)
ON DELETE RESTRICT,
ADD CONSTRAINT publication_content_id_key
UNIQUE (content_id);

-- >>> Migración: 20261029153201_default_publication_date_argentina.sql <<<
ALTER TABLE public.publication
ALTER COLUMN publication_date
SET DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date);

-- >>> Migración: 20261029153231_trust_publication_timestamps.sql <<<
CREATE FUNCTION public.trust_publication_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  trusted_now timestamptz := clock_timestamp();
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := trusted_now;
    NEW.updated_at := trusted_now;
    NEW.published_at := NULL;
    NEW.deleted_at := NULL;
  ELSE
    NEW.created_at := OLD.created_at;
    NEW.updated_at := trusted_now;
    NEW.published_at := OLD.published_at;
    NEW.deleted_at := OLD.deleted_at;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL
ON FUNCTION public.trust_publication_timestamps()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER publication_trust_timestamps
BEFORE INSERT OR UPDATE ON public.publication
FOR EACH ROW
EXECUTE FUNCTION public.trust_publication_timestamps();

ALTER TABLE public.publication
ADD CONSTRAINT publication_updated_at_not_before_created_at
CHECK (updated_at >= created_at);

-- >>> Migración: 20261029153308_manage_publication_lifecycle.sql <<<
CREATE OR REPLACE FUNCTION public.trust_publication_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  trusted_now timestamptz := clock_timestamp();
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := trusted_now;
    NEW.updated_at := trusted_now;
    NEW.deleted_at := NULL;

    IF NEW.status = 'published' THEN
      NEW.published_at := trusted_now;
    ELSE
      NEW.published_at := NULL;
    END IF;
  ELSE
    NEW.created_at := OLD.created_at;
    NEW.updated_at := trusted_now;
    NEW.deleted_at := OLD.deleted_at;

    IF NEW.status = 'draft' THEN
      NEW.published_at := NULL;
    ELSIF OLD.status = 'draft' THEN
      NEW.published_at := trusted_now;
    ELSE
      NEW.published_at := OLD.published_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

ALTER TABLE public.publication
ADD CONSTRAINT publication_status_published_at_consistent
CHECK (
  (status = 'draft' AND published_at IS NULL)
  OR
  (status = 'published' AND published_at IS NOT NULL)
);

-- >>> Migración: 20261029153349_secure_and_index_publication.sql <<<
REVOKE ALL
ON TABLE public.publication
FROM anon, authenticated;

ALTER TABLE public.publication ENABLE ROW LEVEL SECURITY;

CREATE INDEX publication_public_listing_idx
ON public.publication (publication_date DESC, id DESC)
WHERE status = 'published' AND deleted_at IS NULL;

CREATE INDEX publication_editor_listing_idx
ON public.publication (updated_at DESC, id DESC)
WHERE deleted_at IS NULL;

-- >>> Migración: 20261029154041_add_soft_delete_function.sql <<<
CREATE OR REPLACE FUNCTION public.trust_publication_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  trusted_now timestamptz := clock_timestamp();
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := trusted_now;
    NEW.updated_at := trusted_now;
    NEW.deleted_at := NULL;

    IF NEW.status = 'published' THEN
      NEW.published_at := trusted_now;
    ELSE
      NEW.published_at := NULL;
    END IF;
  ELSE
    NEW.created_at := OLD.created_at;

    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      NEW.updated_at := trusted_now;
      NEW.deleted_at := trusted_now;
    ELSE
      NEW.updated_at := trusted_now;
      NEW.deleted_at := OLD.deleted_at;
    END IF;

    IF NEW.status = 'draft' THEN
      NEW.published_at := NULL;
    ELSIF OLD.status = 'draft' THEN
      NEW.published_at := trusted_now;
    ELSE
      NEW.published_at := OLD.published_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.soft_delete_publication(publication_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  UPDATE public.publication
  SET deleted_at = clock_timestamp()
  WHERE id = publication_id;
$$;

REVOKE ALL
ON FUNCTION public.soft_delete_publication(uuid)
FROM PUBLIC, anon, authenticated;

-- >>> Migración: 20261029154105_coordinate_soft_delete_trigger.sql <<<
CREATE OR REPLACE FUNCTION public.trust_publication_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  trusted_now timestamptz := clock_timestamp();
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := trusted_now;
    NEW.updated_at := trusted_now;
    NEW.deleted_at := NULL;

    IF NEW.status = 'published' THEN
      NEW.published_at := trusted_now;
    ELSE
      NEW.published_at := NULL;
    END IF;
  ELSE
    NEW.created_at := OLD.created_at;

    IF pg_trigger_depth() > 1 AND NEW.deleted_at IS NOT NULL THEN
      NEW.updated_at := trusted_now;
      NEW.deleted_at := trusted_now;
    ELSE
      NEW.updated_at := trusted_now;
      NEW.deleted_at := OLD.deleted_at;
    END IF;

    IF NEW.status = 'draft' THEN
      NEW.published_at := NULL;
    ELSIF OLD.status = 'draft' THEN
      NEW.published_at := trusted_now;
    ELSE
      NEW.published_at := OLD.published_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.soft_delete_publication_row()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.publication
  SET deleted_at = clock_timestamp()
  WHERE id = OLD.id;

  RETURN NULL;
END;
$$;

REVOKE ALL
ON FUNCTION public.soft_delete_publication_row()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER publication_soft_delete_row
BEFORE DELETE ON public.publication
FOR EACH ROW
EXECUTE FUNCTION public.soft_delete_publication_row();

CREATE OR REPLACE FUNCTION public.soft_delete_publication(publication_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  DELETE FROM public.publication
  WHERE id = publication_id;
$$;

-- >>> Migración: 20261029154135_make_soft_delete_idempotent.sql <<<
CREATE OR REPLACE FUNCTION public.soft_delete_publication(publication_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  DELETE FROM public.publication
  WHERE id = publication_id
    AND deleted_at IS NULL;
$$;

-- >>> Migración: 20261029154209_block_deleted_publication_updates.sql <<<
CREATE OR REPLACE FUNCTION public.trust_publication_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  trusted_now timestamptz := clock_timestamp();
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := trusted_now;
    NEW.updated_at := trusted_now;
    NEW.deleted_at := NULL;

    IF NEW.status = 'published' THEN
      NEW.published_at := trusted_now;
    ELSE
      NEW.published_at := NULL;
    END IF;
  ELSE
    IF OLD.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'deleted publications cannot be updated'
        USING ERRCODE = '55000';
    END IF;

    NEW.created_at := OLD.created_at;

    IF pg_trigger_depth() > 1 AND NEW.deleted_at IS NOT NULL THEN
      NEW.updated_at := trusted_now;
      NEW.deleted_at := trusted_now;
    ELSE
      NEW.updated_at := trusted_now;
      NEW.deleted_at := OLD.deleted_at;
    END IF;

    IF NEW.status = 'draft' THEN
      NEW.published_at := NULL;
    ELSIF OLD.status = 'draft' THEN
      NEW.published_at := trusted_now;
    ELSE
      NEW.published_at := OLD.published_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- >>> Migración: 20261029154847_public_access_projection.sql <<<
CREATE VIEW public.public_publications
WITH (security_barrier = true, security_invoker = false)
AS
SELECT
  publication.id,
  publication.title,
  publication.description,
  publication.category,
  publication.publication_date,
  content.image_url
FROM public.publication AS publication
JOIN public.content AS content
  ON content.id = publication.content_id
WHERE publication.status = 'published'
  AND publication.deleted_at IS NULL;

REVOKE ALL
ON TABLE public.public_publications
FROM PUBLIC, anon, authenticated;

GRANT SELECT
ON TABLE public.public_publications
TO anon, authenticated;

-- >>> Migración: 20261029155003_editorial_read_access.sql <<<
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

-- >>> Migración: 20261029155033_raw_content_access_revoke.sql <<<
REVOKE SELECT
ON TABLE public.content
FROM PUBLIC, anon;

-- >>> Migración: 20261029155130_editorial_write_access.sql <<<
CREATE POLICY publication_editor_insert
ON public.publication
FOR INSERT
TO authenticated
WITH CHECK (
  app_private.is_editor()
  AND deleted_at IS NULL
);

CREATE POLICY publication_editor_update
ON public.publication
FOR UPDATE
TO authenticated
USING (
  app_private.is_editor()
  AND deleted_at IS NULL
)
WITH CHECK (
  app_private.is_editor()
  AND deleted_at IS NULL
);

GRANT INSERT (
  title,
  description,
  category,
  status,
  publication_date,
  content_id
)
ON TABLE public.publication
TO authenticated;

GRANT UPDATE (
  title,
  description,
  category,
  status,
  publication_date,
  content_id
)
ON TABLE public.publication
TO authenticated;

-- >>> Migración: 20261029155212_soft_delete_access_gate.sql <<<
CREATE OR REPLACE FUNCTION public.soft_delete_publication(publication_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT app_private.is_editor() THEN
    RAISE EXCEPTION 'editor subject required'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.publication
  WHERE id = publication_id
    AND deleted_at IS NULL;
END;
$$;

REVOKE ALL
ON FUNCTION public.soft_delete_publication(uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.soft_delete_publication(uuid)
TO authenticated;

-- >>> Migración: 20261029161826_replace_public_view_with_read_access_function.sql <<<
DROP VIEW public.public_publications;

CREATE FUNCTION public.read_publications(
  p_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_cursor_date date DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  category text,
  publication_date date,
  image_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 50'
      USING ERRCODE = '22023';
  END IF;

  IF (p_cursor_date IS NULL) <> (p_cursor_id IS NULL) THEN
    RAISE EXCEPTION 'p_cursor_date and p_cursor_id must be provided together'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT
    publication.id,
    publication.title::text,
    publication.description,
    publication.category::text,
    publication.publication_date,
    content.image_url
  FROM public.publication AS publication
  JOIN public.content AS content
    ON content.id = publication.content_id
  WHERE publication.status = 'published'
    AND publication.deleted_at IS NULL
    AND (p_id IS NULL OR publication.id = p_id)
    AND (
      p_id IS NOT NULL
      OR p_cursor_date IS NULL
      OR publication.publication_date < p_cursor_date
      OR (
        publication.publication_date = p_cursor_date
        AND publication.id < p_cursor_id
      )
    )
  ORDER BY publication.publication_date DESC, publication.id DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL
ON FUNCTION public.read_publications(uuid, integer, date, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.read_publications(uuid, integer, date, uuid)
TO anon, authenticated;

-- >>> Migración: 20261029171628_audit_fixes_limit_and_soft_delete_idempotence.sql <<<
CREATE OR REPLACE FUNCTION public.soft_delete_publication_row()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.deleted_at IS NULL THEN
    UPDATE public.publication
    SET deleted_at = clock_timestamp()
    WHERE id = OLD.id;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.read_publications(
  p_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_cursor_date date DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  category text,
  publication_date date,
  image_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 51 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 51'
      USING ERRCODE = '22023';
  END IF;

  IF (p_cursor_date IS NULL) <> (p_cursor_id IS NULL) THEN
    RAISE EXCEPTION 'p_cursor_date and p_cursor_id must be provided together'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT
    publication.id,
    publication.title::text,
    publication.description,
    publication.category::text,
    publication.publication_date,
    content.image_url
  FROM public.publication AS publication
  JOIN public.content AS content
    ON content.id = publication.content_id
  WHERE publication.status = 'published'
    AND publication.deleted_at IS NULL
    AND (p_id IS NULL OR publication.id = p_id)
    AND (
      p_id IS NOT NULL
      OR p_cursor_date IS NULL
      OR publication.publication_date < p_cursor_date
      OR (
        publication.publication_date = p_cursor_date
        AND publication.id < p_cursor_id
      )
    )
  ORDER BY publication.publication_date DESC, publication.id DESC
  LIMIT p_limit;
END;
$$;

-- >>> Migración: 20261029180351_expose_editor_subject_rpc_for_service_role.sql <<<
CREATE FUNCTION public.get_editor_subject()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT configuration.editor_subject
  FROM app_private.editor_configuration AS configuration
  WHERE configuration.singleton;
$$;

REVOKE ALL
ON FUNCTION public.get_editor_subject()
FROM PUBLIC, anon, authenticated;

-- Only service_role needs to check or fetch the editor subject from Edge Functions
GRANT EXECUTE
ON FUNCTION public.get_editor_subject()
TO service_role;

-- 2. Registrar las 22 versiones en el historial de migraciones
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES
  ('20261029152547', 'create_content'),
  ('20261029152613', 'add_content_image_url_unique'),
  ('20261029152634', 'add_content_image_url_nonblank'),
  ('20261029153027', 'create_publication'),
  ('20261029153105', 'validate_publication_text'),
  ('20261029153136', 'link_publication_content'),
  ('20261029153201', 'default_publication_date_argentina'),
  ('20261029153231', 'trust_publication_timestamps'),
  ('20261029153308', 'manage_publication_lifecycle'),
  ('20261029153349', 'secure_and_index_publication'),
  ('20261029154041', 'add_soft_delete_function'),
  ('20261029154105', 'coordinate_soft_delete_trigger'),
  ('20261029154135', 'make_soft_delete_idempotent'),
  ('20261029154209', 'block_deleted_publication_updates'),
  ('20261029154847', 'public_access_projection'),
  ('20261029155003', 'editorial_read_access'),
  ('20261029155033', 'raw_content_access_revoke'),
  ('20261029155130', 'editorial_write_access'),
  ('20261029155212', 'soft_delete_access_gate'),
  ('20261029161826', 'replace_public_view_with_read_access_function'),
  ('20261029171628', 'audit_fixes_limit_and_soft_delete_idempotence'),
  ('20261029180351', 'expose_editor_subject_rpc_for_service_role');

COMMIT;