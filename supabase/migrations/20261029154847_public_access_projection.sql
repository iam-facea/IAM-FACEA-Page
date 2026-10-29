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
