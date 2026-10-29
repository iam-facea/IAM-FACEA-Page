CREATE POLICY publication_editor_insert
ON public.publication
FOR INSERT
TO authenticated
WITH CHECK (
  app_private.is_editor()
  AND deleted_at IS NULL
);

CREATE POLICY publication_editor_update
ON public.publication
FOR UPDATE
TO authenticated
USING (
  app_private.is_editor()
  AND deleted_at IS NULL
)
WITH CHECK (
  app_private.is_editor()
  AND deleted_at IS NULL
);

GRANT INSERT (
  title,
  description,
  category,
  status,
  publication_date,
  content_id
)
ON TABLE public.publication
TO authenticated;

GRANT UPDATE (
  title,
  description,
  category,
  status,
  publication_date,
  content_id
)
ON TABLE public.publication
TO authenticated;
