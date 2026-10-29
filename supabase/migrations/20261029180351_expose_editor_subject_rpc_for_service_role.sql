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
