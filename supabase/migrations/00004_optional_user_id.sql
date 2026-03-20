-- ============================================================
-- Make user_id optional on tasks and tags
-- Allows unauthenticated access when RLS is disabled
-- ============================================================

ALTER TABLE public.tasks ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.tags ALTER COLUMN user_id DROP NOT NULL;
