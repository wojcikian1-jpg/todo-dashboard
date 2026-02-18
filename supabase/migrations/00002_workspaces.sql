-- ============================================================
-- Workspaces: shared team boards
-- 3 new tables, alter 2 existing tables, new RLS policies
-- ============================================================

-- Enable pgcrypto for gen_random_bytes (used in invite token generation)
create extension if not exists pgcrypto with schema extensions;

-- Workspaces table
create table public.workspaces (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  owner_id uuid references auth.users(id) on delete restrict not null,
  created_at timestamptz default now() not null,

  constraint chk_workspace_name_not_empty check (length(trim(name)) > 0)
);

alter table public.workspaces enable row level security;

-- Workspace members (join table)
create table public.workspace_members (
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'member'
    check (role in ('owner', 'member')),
  joined_at timestamptz default now() not null,

  primary key (workspace_id, user_id)
);

alter table public.workspace_members enable row level security;

-- Workspace invite links
create table public.workspace_invites (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  token text unique not null default encode(extensions.gen_random_bytes(24), 'hex'),
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz default (now() + interval '7 days') not null,
  created_at timestamptz default now() not null
);

alter table public.workspace_invites enable row level security;

-- ============================================================
-- Helper: check workspace membership (security definer to avoid circular RLS)
-- ============================================================
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
  );
$$ language sql security definer stable;

-- ============================================================
-- Alter existing tables: add workspace_id
-- ============================================================
alter table public.tasks
  add column workspace_id uuid references public.workspaces(id) on delete cascade;

alter table public.tags
  add column workspace_id uuid references public.workspaces(id) on delete cascade;

-- ============================================================
-- Data migration: create personal workspaces for existing users
-- ============================================================

-- Create a personal workspace for every user who has data
insert into public.workspaces (id, name, owner_id)
select gen_random_uuid(), 'Personal', u.id
from (
  select distinct user_id as id from public.tasks
  union
  select distinct user_id as id from public.tags
) u;

-- Add each user as owner-member
insert into public.workspace_members (workspace_id, user_id, role)
select w.id, w.owner_id, 'owner'
from public.workspaces w;

-- Backfill workspace_id on tasks
update public.tasks t
set workspace_id = w.id
from public.workspaces w
where w.owner_id = t.user_id;

-- Backfill workspace_id on tags
update public.tags tg
set workspace_id = w.id
from public.workspaces w
where w.owner_id = tg.user_id;

-- Now make workspace_id NOT NULL
alter table public.tasks alter column workspace_id set not null;
alter table public.tags alter column workspace_id set not null;

-- Replace unique constraint on tags
alter table public.tags drop constraint uq_tags_user_name;
alter table public.tags add constraint uq_tags_workspace_name unique (workspace_id, name);

-- ============================================================
-- Replace indexes: user_id -> workspace_id
-- ============================================================
drop index idx_tasks_user_id;
drop index idx_tasks_user_status_archived;
drop index idx_tasks_user_due_date;
drop index idx_tags_user_id;

create index idx_tasks_workspace_id on public.tasks (workspace_id);
create index idx_tasks_workspace_status_archived
  on public.tasks (workspace_id, status, archived);
create index idx_tasks_workspace_due_date
  on public.tasks (workspace_id, due_date)
  where due_date is not null;
create index idx_tags_workspace_id on public.tags (workspace_id);
create index idx_workspace_members_user_id on public.workspace_members (user_id);
create index idx_workspace_invites_token on public.workspace_invites (token);

-- ============================================================
-- Drop old RLS policies
-- ============================================================
drop policy "Users manage own tasks" on public.tasks;
drop policy "Users manage own tags" on public.tags;

-- ============================================================
-- New RLS policies: workspace-scoped (all members have full edit access)
-- ============================================================

-- Tasks: all members can CRUD
create policy "Members can read workspace tasks" on public.tasks
  for select using (public.is_workspace_member(workspace_id));
create policy "Members can insert workspace tasks" on public.tasks
  for insert with check (public.is_workspace_member(workspace_id));
create policy "Members can update workspace tasks" on public.tasks
  for update using (public.is_workspace_member(workspace_id));
create policy "Members can delete workspace tasks" on public.tasks
  for delete using (public.is_workspace_member(workspace_id));

-- Tags: all members can CRUD
create policy "Members can read workspace tags" on public.tags
  for select using (public.is_workspace_member(workspace_id));
create policy "Members can insert workspace tags" on public.tags
  for insert with check (public.is_workspace_member(workspace_id));
create policy "Members can update workspace tags" on public.tags
  for update using (public.is_workspace_member(workspace_id));
create policy "Members can delete workspace tags" on public.tags
  for delete using (public.is_workspace_member(workspace_id));

-- Workspaces: members can read, owners can update/delete, any auth user can create
create policy "Members can read their workspaces" on public.workspaces
  for select using (public.is_workspace_member(id));
create policy "Authenticated users can create workspaces" on public.workspaces
  for insert with check (auth.uid() = owner_id);
create policy "Owners can update their workspaces" on public.workspaces
  for update using (auth.uid() = owner_id);
create policy "Owners can delete their workspaces" on public.workspaces
  for delete using (auth.uid() = owner_id);

-- Workspace members: members can read, owners can add, owners/self can remove
create policy "Members can read workspace members" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));
create policy "Owners can add members" on public.workspace_members
  for insert with check (
    exists (
      select 1 from public.workspaces
      where id = workspace_id and owner_id = auth.uid()
    )
  );
create policy "Remove members" on public.workspace_members
  for delete using (
    user_id = auth.uid()
    or exists (
      select 1 from public.workspaces
      where id = workspace_id and owner_id = auth.uid()
    )
  );

-- Workspace invites: members can read, owners can create/delete
create policy "Members can read workspace invites" on public.workspace_invites
  for select using (public.is_workspace_member(workspace_id));
create policy "Owners can create invites" on public.workspace_invites
  for insert with check (
    exists (
      select 1 from public.workspaces
      where id = workspace_id and owner_id = auth.uid()
    )
  );
create policy "Owners can delete invites" on public.workspace_invites
  for delete using (
    exists (
      select 1 from public.workspaces
      where id = workspace_id and owner_id = auth.uid()
    )
  );

-- ============================================================
-- RPC: join workspace via invite token (security definer)
-- ============================================================
create or replace function public.join_workspace_via_invite(invite_token text)
returns uuid as $$
declare
  v_workspace_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select workspace_id into v_workspace_id
  from public.workspace_invites
  where token = invite_token
    and expires_at > now();

  if v_workspace_id is null then
    raise exception 'Invalid or expired invite link';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'member')
  on conflict (workspace_id, user_id) do nothing;

  return v_workspace_id;
end;
$$ language plpgsql security definer;

-- ============================================================
-- Trigger: auto-create personal workspace on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  ws_id uuid;
begin
  insert into public.workspaces (name, owner_id)
  values ('Personal', new.id)
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, new.id, 'owner');

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
