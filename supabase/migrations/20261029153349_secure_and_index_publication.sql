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
