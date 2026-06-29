-- ============================================================
-- Disable RLS on all dashboard tables to match the existing
-- production configuration (where the dashboard runs without
-- auth and RLS was manually disabled via the Supabase UI).
--
-- Codifying it as a migration so dev/preview matches prod.
--
-- This is a security-setting change only. NO DATA IS MODIFIED.
-- Re-runnable: ALTER TABLE ... DISABLE RLS is a no-op if RLS
-- is already disabled, so safe to apply on prod even though
-- prod already has RLS disabled on these tables.
-- ============================================================

alter table public.workspaces disable row level security;
alter table public.workspace_members disable row level security;
alter table public.workspace_invites disable row level security;
alter table public.tasks disable row level security;
alter table public.tags disable row level security;
alter table public.recurring_tasks disable row level security;
alter table public.recurring_completions disable row level security;
