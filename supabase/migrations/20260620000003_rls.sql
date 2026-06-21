-- Tend — Row Level Security
-- RLS é a fronteira primária de segurança (app multi-tenant).

alter table profiles            enable row level security;
alter table homes               enable row level security;
alter table home_members        enable row level security;
alter table spaces              enable row level security;
alter table space_members       enable row level security;
alter table tasks               enable row level security;
alter table task_rotation_queue enable row level security;
alter table task_occurrences    enable row level security;
alter table space_member_points enable row level security;
alter table push_subscriptions  enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: o próprio usuário lê/edita o seu; membros da mesma home se enxergam
-- ---------------------------------------------------------------------------
create policy profiles_select_self on profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from home_members hm
      where hm.user_id = profiles.id
        and is_home_member(hm.home_id)
    )
  );

create policy profiles_update_self on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- homes: membros leem; owner edita/apaga. (criação via função create_home)
-- ---------------------------------------------------------------------------
create policy homes_select_member on homes
  for select using (is_home_member(id));

create policy homes_update_owner on homes
  for update using (home_role(id) = 'owner') with check (home_role(id) = 'owner');

create policy homes_delete_owner on homes
  for delete using (home_role(id) = 'owner');

-- ---------------------------------------------------------------------------
-- home_members: membros da home leem; owner/admin gerenciam; o próprio sai
-- ---------------------------------------------------------------------------
create policy home_members_select on home_members
  for select using (is_home_member(home_id));

create policy home_members_manage on home_members
  for all using (home_role(home_id) in ('owner', 'admin'))
  with check (home_role(home_id) in ('owner', 'admin'));

create policy home_members_leave on home_members
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- spaces: membros da home leem; owner/admin mutam
-- ---------------------------------------------------------------------------
create policy spaces_select on spaces
  for select using (is_home_member(home_id));

create policy spaces_manage on spaces
  for all using (home_role(home_id) in ('owner', 'admin'))
  with check (home_role(home_id) in ('owner', 'admin'));

-- ---------------------------------------------------------------------------
-- space_members: membros da home leem; owner/admin gerenciam
-- ---------------------------------------------------------------------------
create policy space_members_select on space_members
  for select using (is_home_member(space_home(space_id)));

create policy space_members_manage on space_members
  for all using (home_role(space_home(space_id)) in ('owner', 'admin'))
  with check (home_role(space_home(space_id)) in ('owner', 'admin'));

-- ---------------------------------------------------------------------------
-- tasks: membros da home leem; owner/admin mutam
-- ---------------------------------------------------------------------------
create policy tasks_select on tasks
  for select using (is_home_member(space_home(space_id)));

create policy tasks_manage on tasks
  for all using (home_role(space_home(space_id)) in ('owner', 'admin'))
  with check (home_role(space_home(space_id)) in ('owner', 'admin'));

-- ---------------------------------------------------------------------------
-- task_rotation_queue: leitura por membros; mutação por owner/admin
-- ---------------------------------------------------------------------------
create policy rotation_select on task_rotation_queue
  for select using (is_home_member(space_home(task_space(task_id))));

create policy rotation_manage on task_rotation_queue
  for all using (home_role(space_home(task_space(task_id))) in ('owner', 'admin'))
  with check (home_role(space_home(task_space(task_id))) in ('owner', 'admin'));

-- ---------------------------------------------------------------------------
-- task_occurrences: membros da home leem; qualquer membro pode concluir (update)
-- ---------------------------------------------------------------------------
create policy occurrences_select on task_occurrences
  for select using (is_home_member(space_home(task_space(task_id))));

create policy occurrences_update on task_occurrences
  for update using (is_home_member(space_home(task_space(task_id))))
  with check (is_home_member(space_home(task_space(task_id))));

-- ---------------------------------------------------------------------------
-- space_member_points: membros da home leem (leaderboard). Escrita via trigger.
-- ---------------------------------------------------------------------------
create policy points_select on space_member_points
  for select using (is_home_member(space_home(space_id)));

-- ---------------------------------------------------------------------------
-- push_subscriptions: cada usuário gerencia as suas
-- ---------------------------------------------------------------------------
create policy push_own on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
