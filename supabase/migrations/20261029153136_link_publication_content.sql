ALTER TABLE public.publication
ADD CONSTRAINT publication_content_id_fkey
FOREIGN KEY (content_id)
REFERENCES public.content (id)
ON DELETE RESTRICT,
ADD CONSTRAINT publication_content_id_key
UNIQUE (content_id);
