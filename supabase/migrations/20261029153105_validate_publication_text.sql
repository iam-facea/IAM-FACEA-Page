ALTER TABLE public.publication
ADD CONSTRAINT publication_title_valid
CHECK (
  title = regexp_replace(title, '^[[:space:]]+|[[:space:]]+$', '', 'g')
  AND char_length(title) BETWEEN 1 AND 160
),
ADD CONSTRAINT publication_description_valid
CHECK (
  description = regexp_replace(description, '^[[:space:]]+|[[:space:]]+$', '', 'g')
  AND char_length(description) BETWEEN 1 AND 1000
),
ADD CONSTRAINT publication_category_valid
CHECK (
  category = regexp_replace(category, '^[[:space:]]+|[[:space:]]+$', '', 'g')
  AND char_length(category) BETWEEN 1 AND 80
),
ADD CONSTRAINT publication_status_valid
CHECK (status IN ('draft', 'published'));
