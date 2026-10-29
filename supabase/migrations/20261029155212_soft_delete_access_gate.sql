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
