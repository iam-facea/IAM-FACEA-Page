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
