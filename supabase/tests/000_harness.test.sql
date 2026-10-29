BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(1);

SELECT is(
  (
    TIMESTAMPTZ '2027-03-10 01:30:00+00'
    AT TIME ZONE 'America/Argentina/Buenos_Aires'
  )::date,
  DATE '2027-03-09',
  'UTC instant converts to the previous Argentina calendar date'
);

SELECT * FROM finish();

ROLLBACK;
