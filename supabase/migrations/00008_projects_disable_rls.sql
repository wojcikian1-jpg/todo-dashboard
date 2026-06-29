-- ============================================================
-- Disable RLS on projects tables to match the existing pattern
-- on tasks/tags/recurring_tasks (the dashboard runs without auth).
--
-- This is a security-setting change only. No data is modified.
-- ============================================================

alter table public.projects disable row level security;
alter table public.sub_workflows disable row level security;
alter table public.issues disable row level security;
alter table public.project_notes disable row level security;
