-- Synthetic local fixtures only. These identifiers and .example.invalid URLs
-- do not represent people, credentials, accounts, or external resources.
INSERT INTO public.content (id, image_url)
VALUES
  (
    '00000000-0000-4000-8000-600000000001',
    'https://media.example.invalid/seed-published.webp'
  ),
  (
    '00000000-0000-4000-8000-600000000003',
    'https://media.example.invalid/seed-draft.webp'
  ),
  (
    '00000000-0000-4000-8000-600000000005',
    'https://media.example.invalid/seed-soft-deleted.webp'
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.publication (
  id,
  title,
  description,
  category,
  publication_date,
  status,
  content_id
)
VALUES
  (
    '00000000-0000-4000-8000-600000000002',
    'Synthetic published fixture',
    'Synthetic published content for local development.',
    'Institutional',
    DATE '2027-03-09',
    'published',
    '00000000-0000-4000-8000-600000000001'
  ),
  (
    '00000000-0000-4000-8000-600000000004',
    'Synthetic draft fixture',
    'Synthetic draft content for local development.',
    'Institutional',
    DATE '2027-03-10',
    'draft',
    '00000000-0000-4000-8000-600000000003'
  ),
  (
    '00000000-0000-4000-8000-600000000006',
    'Synthetic soft-deleted fixture',
    'Synthetic retained content for local development.',
    'Institutional',
    DATE '2027-03-11',
    'published',
    '00000000-0000-4000-8000-600000000005'
  )
ON CONFLICT DO NOTHING;

-- Exercise the production soft-delete trigger; never physically purge this fixture.
DELETE FROM public.publication
WHERE id = '00000000-0000-4000-8000-600000000006'
  AND deleted_at IS NULL;
