-- Onboarding persistence hardening
-- 1) Prevent duplicate contacts when Google import + manual entry collide.
--    (Matches on user_id + case-insensitive full_name + relationship_type.)
CREATE UNIQUE INDEX IF NOT EXISTS contacts_user_name_rel_uidx
  ON public.contacts (user_id, lower(full_name), coalesce(relationship_type, ''));

-- 2) Signal-strength summary captured at onboarding. The engagement engine
--    reads this to tier prompts by how much context we actually learned
--    (has_birthday, has_hometown, has_why_here, counts for places/contacts/
--    interests/photos, why_here_word_count, captured_at).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_signals jsonb;

COMMENT ON COLUMN public.profiles.onboarding_signals IS
  'Summary of signals captured during onboarding; used to tier engagement prompts.';
