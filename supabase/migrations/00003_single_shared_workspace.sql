-- ============================================================
-- Simplify to a single shared workspace for all users
-- ============================================================

-- 1. Create the shared workspace (if not already present)
-- Use the first existing user as owner (auth.uid() is null in migration context)
insert into public.workspaces (name, owner_id)
select 'Team Dashboard', (select id from auth.users order by created_at limit 1)
where not exists (
  select 1 from public.workspaces where name = 'Team Dashboard'
);

-- 2. Move all existing users into the shared workspace
insert into public.workspace_members (workspace_id, user_id, role)
select w.id, u.id, 'member'
from public.workspaces w
cross join auth.users u
where w.name = 'Team Dashboard'
  and not exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = w.id and wm.user_id = u.id
  );

-- 3. Reassign all tasks and tags to the shared workspace
update public.tasks
set workspace_id = (select id from public.workspaces where name = 'Team Dashboard' limit 1)
where workspace_id != (select id from public.workspaces where name = 'Team Dashboard' limit 1)
   or workspace_id is null;

update public.tags
set workspace_id = (select id from public.workspaces where name = 'Team Dashboard' limit 1)
where workspace_id != (select id from public.workspaces where name = 'Team Dashboard' limit 1)
   or workspace_id is null;

-- 4. Replace the new-user trigger to auto-join the shared workspace
create or replace function public.handle_new_user()
returns trigger as $$
declare
  ws_id uuid;
begin
  -- Get the shared workspace
  select id into ws_id from public.workspaces where name = 'Team Dashboard' limit 1;

  -- If it doesn't exist yet, create it
  if ws_id is null then
    insert into public.workspaces (name, owner_id)
    values ('Team Dashboard', new.id)
    returning id into ws_id;
  end if;

  -- Add user as member
  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, new.id, 'member');

  return new;
end;
$$ language plpgsql security definer;
