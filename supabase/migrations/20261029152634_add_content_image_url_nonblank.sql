ALTER TABLE public.content
ADD CONSTRAINT content_image_url_not_blank
CHECK (btrim(image_url) <> '');
