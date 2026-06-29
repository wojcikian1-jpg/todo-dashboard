-- ============================================================
-- Projects MVP: containers for larger initiatives with
-- sub-workflows, issues, and a notes/decision log.
--
-- ADDITIVE ONLY:
--   - 4 new tables (projects, sub_workflows, issues, notes)
--   - 2 new NULLABLE columns on tasks (project_id, subworkflow_id)
--   - No changes to existing columns, constraints, or data
-- ============================================================

-- ============================================================
-- Projects
-- ============================================================
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name text not null,
  description text default '',
  goal text default '',
  status text not null default 'planning'
    check (status in ('planning', 'active', 'blocked', 'on-hold', 'done', 'archived')),
  start_date date,
  target_date date,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  constraint chk_projects_name_not_empty check (length(trim(name)) > 0)
);

create index idx_projects_workspace_id on public.projects (workspace_id);
create index idx_projects_workspace_status on public.projects (workspace_id, status);

create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function update_updated_at_column();

alter table public.projects enable row level security;

create policy "Members can read workspace projects" on public.projects
  for select using (public.is_workspace_member(workspace_id));
create policy "Members can insert workspace projects" on public.projects
  for insert with check (public.is_workspace_member(workspace_id));
create policy "Members can update workspace projects" on public.projects
  for update using (public.is_workspace_member(workspace_id));
create policy "Members can delete workspace projects" on public.projects
  for delete using (public.is_workspace_member(workspace_id));

-- ============================================================
-- Sub-workflows (named tracks of work inside a project)
-- ============================================================
create table public.sub_workflows (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  position integer not null default 0,
  created_at timestamptz default now() not null,

  constraint chk_subworkflow_name_not_empty check (length(trim(name)) > 0)
);

create index idx_sub_workflows_project_id on public.sub_workflows (project_id);

alter table public.sub_workflows enable row level security;

create policy "Members can read workspace sub_workflows" on public.sub_workflows
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = sub_workflows.project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );
create policy "Members can insert workspace sub_workflows" on public.sub_workflows
  for insert with check (
    exists (
      select 1 from public.projects p
      where p.id = sub_workflows.project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );
create policy "Members can update workspace sub_workflows" on public.sub_workflows
  for update using (
    exists (
      select 1 from public.projects p
      where p.id = sub_workflows.project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );
create policy "Members can delete workspace sub_workflows" on public.sub_workflows
  for delete using (
    exists (
      select 1 from public.projects p
      where p.id = sub_workflows.project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );

-- ============================================================
-- Issues (blockers and problems tracked separately from tasks)
-- ============================================================
create table public.issues (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  description text default '',
  status text not null default 'open'
    check (status in ('open', 'resolved')),
  opened_at timestamptz default now() not null,
  resolved_at timestamptz,

  constraint chk_issue_title_not_empty check (length(trim(title)) > 0)
);

create index idx_issues_project_id on public.issues (project_id);
create index idx_issues_project_status on public.issues (project_id, status);

alter table public.issues enable row level security;

create policy "Members can read workspace issues" on public.issues
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = issues.project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );
create policy "Members can insert workspace issues" on public.issues
  for insert with check (
    exists (
      select 1 from public.projects p
      where p.id = issues.project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );
create policy "Members can update workspace issues" on public.issues
  for update using (
    exists (
      select 1 from public.projects p
      where p.id = issues.project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );
create policy "Members can delete workspace issues" on public.issues
  for delete using (
    exists (
      select 1 from public.projects p
      where p.id = issues.project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );

-- ============================================================
-- Notes (timestamped feed of updates, decisions, retros)
-- ============================================================
create table public.project_notes (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  body text not null,
  created_at timestamptz default now() not null,

  constraint chk_note_body_not_empty check (length(trim(body)) > 0)
);

create index idx_project_notes_project_id on public.project_notes (project_id);
create index idx_project_notes_created_at on public.project_notes (project_id, created_at desc);

alter table public.project_notes enable row level security;

create policy "Members can read workspace project_notes" on public.project_notes
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_notes.project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );
create policy "Members can insert workspace project_notes" on public.project_notes
  for insert with check (
    exists (
      select 1 from public.projects p
      where p.id = project_notes.project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );
create policy "Members can update workspace project_notes" on public.project_notes
  for update using (
    exists (
      select 1 from public.projects p
      where p.id = project_notes.project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );
create policy "Members can delete workspace project_notes" on public.project_notes
  for delete using (
    exists (
      select 1 from public.projects p
      where p.id = project_notes.project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );

-- ============================================================
-- Link tasks to projects/sub-workflows (NULLABLE, additive)
-- Existing tasks remain unaffected — both columns will be NULL.
-- ============================================================
alter table public.tasks
  add column project_id uuid references public.projects(id) on delete set null;

alter table public.tasks
  add column subworkflow_id uuid references public.sub_workflows(id) on delete set null;

create index idx_tasks_project_id on public.tasks (project_id) where project_id is not null;
create index idx_tasks_subworkflow_id on public.tasks (subworkflow_id) where subworkflow_id is not null;
