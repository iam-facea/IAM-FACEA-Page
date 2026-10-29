ALTER TABLE public.publication
ALTER COLUMN publication_date
SET DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date);
