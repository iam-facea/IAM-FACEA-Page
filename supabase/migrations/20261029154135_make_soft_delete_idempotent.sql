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
