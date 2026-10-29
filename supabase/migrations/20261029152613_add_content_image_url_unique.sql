ALTER TABLE public.content
ADD CONSTRAINT content_image_url_key UNIQUE (image_url);
