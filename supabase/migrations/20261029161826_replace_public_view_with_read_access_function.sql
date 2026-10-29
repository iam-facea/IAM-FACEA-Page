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
