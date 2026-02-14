-- ============================================================
-- Todo Dashboard: Initial Schema
-- 2 tables: tags, tasks (subtasks/notes as JSONB)
-- ============================================================

-- Tags table
create table public.tags (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete restrict not null,
  name text not null,
  color text not null default '#4a90d9',
  created_at timestamptz default now() not null,

  constraint chk_tags_name_not_empty check (length(trim(name)) > 0),
  constraint chk_tags_valid_color check (color ~ '^#[0-9a-fA-F]{6}$'),
  constraint uq_tags_user_name unique (user_id, name)
);

-- Tasks table (subtasks, notes, and tag references embedded)
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete restrict not null,
  text text not null,
  description text default '',
  status text not null default 'not-started'
    check (status in ('not-started', 'in-progress', 'at-risk', 'completed')),
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  due_date date,
  archived boolean default false not null,
  tag_ids uuid[] default '{}',
  subtasks jsonb default '[]'::jsonb,
  notes jsonb default '[]'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  constraint chk_tasks_text_not_empty check (length(trim(text)) > 0)
);

-- Indexes
create index idx_tasks_user_id on public.tasks (user_id);
create index idx_tasks_user_status_archived on public.tasks (user_id, status, archived);
create index idx_tasks_user_due_date on public.tasks (user_id, due_date) where due_date is not null;
create index idx_tags_user_id on public.tags (user_id);

-- Auto-update updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function update_updated_at_column();

-- Row Level Security
alter table public.tasks enable row level security;
alter table public.tags enable row level security;

create policy "Users manage own tasks" on public.tasks
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own tags" on public.tags
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
