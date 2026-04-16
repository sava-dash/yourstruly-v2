-- Force PostgREST to reload its schema cache.
-- PostgREST caches the DB schema on startup and won't see new columns until
-- it's told to reload. Supabase sometimes misses the auto-reload after a
-- migration, causing PGRST204 "Could not find the 'X' column" errors even
-- after `supabase db push` adds the column.
--
-- Safe to run anytime. No DDL changes.

NOTIFY pgrst, 'reload schema';
