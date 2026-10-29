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
