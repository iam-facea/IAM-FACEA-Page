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
