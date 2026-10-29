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
