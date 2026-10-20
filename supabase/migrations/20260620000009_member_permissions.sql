-- Quem entra por convite passa a poder organizar a casa; só ações destrutivas/administrativas
-- continuam com owner/admin.
--
-- Qualquer MEMBRO: criar e editar ambientes, gerenciar quem participa de cada ambiente,
--                  criar/editar/excluir tarefas e a fila de rodízio.
-- Só OWNER/ADMIN: excluir ambiente, renomear a casa, gerar novo código de convite, papéis.
-- Só OWNER:       excluir a casa. O dono não "sai": exclui a casa (ou transfere no futuro).

-- ---------------------------------------------------------------------------
-- spaces
-- ---------------------------------------------------------------------------
drop policy if exists spaces_manage on spaces;

create policy spaces_insert on spaces
  for insert with check (is_home_member(home_id));
create policy spaces_update on spaces
  for update using (is_home_member(home_id)) with check (is_home_member(home_id));
create policy spaces_delete on spaces
  for delete using (home_role(home_id) in ('owner', 'admin'));

-- ---------------------------------------------------------------------------
-- space_members: só dá para colocar no ambiente quem é membro da MESMA casa
-- ---------------------------------------------------------------------------
drop policy if exists space_members_manage on space_members;

create policy space_members_insert on space_members
  for insert with check (
    is_home_member(space_home(space_id))
    and exists (
      select 1 from home_members hm
      where hm.home_id = space_home(space_id) and hm.user_id = space_members.user_id
    )
  );
create policy space_members_delete on space_members
  for delete using (is_home_member(space_home(space_id)));

-- ---------------------------------------------------------------------------
-- tasks + fila de rodízio
-- ---------------------------------------------------------------------------
drop policy if exists tasks_manage on tasks;

create policy tasks_insert on tasks
  for insert with check (is_home_member(space_home(space_id)));
create policy tasks_update on tasks
  for update using (is_home_member(space_home(space_id)))
  with check (is_home_member(space_home(space_id)));
create policy tasks_delete on tasks
  for delete using (is_home_member(space_home(space_id)));

drop policy if exists rotation_manage on task_rotation_queue;

create policy rotation_manage on task_rotation_queue
  for all using (is_home_member(space_home(task_space(task_id))))
  with check (is_home_member(space_home(task_space(task_id))));

-- ---------------------------------------------------------------------------
-- homes: renomear (owner/admin). Só a coluna `name` é atualizável pelo usuário —
-- sem isso um admin poderia trocar owner_id e virar dono.
-- ---------------------------------------------------------------------------
drop policy if exists homes_update_owner on homes;

create policy homes_update_admin on homes
  for update using (home_role(id) in ('owner', 'admin'))
  with check (home_role(id) in ('owner', 'admin'));

revoke update on homes from authenticated;
grant update (name) on homes to authenticated;

-- novo código de convite (invalida o antigo)
create or replace function public.regenerate_invite_code(h uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  code text;
begin
  if home_role(h) is distinct from 'owner' and home_role(h) is distinct from 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  code := gen_invite_code();
  update homes set invite_code = code where id = h;
  return code;
end;
$$;
revoke execute on function public.regenerate_invite_code(uuid) from public, anon;
grant execute on function public.regenerate_invite_code(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Sair da casa (não-dono): tira a pessoa de ambientes, tarefas e rodízios da casa
-- ---------------------------------------------------------------------------
create or replace function public.leave_home(h uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  my_role member_role;
begin
  select role into my_role from home_members where home_id = h and user_id = me;
  if my_role is null then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  if my_role = 'owner' then
    raise exception 'owner_cannot_leave' using errcode = '42501';
  end if;

  delete from space_members
   where user_id = me and space_id in (select id from spaces where home_id = h);
  update tasks set assignee_id = null
   where assignee_id = me and space_id in (select id from spaces where home_id = h);
  delete from task_rotation_queue
   where user_id = me
     and task_id in (select t.id from tasks t join spaces s on s.id = t.space_id where s.home_id = h);
  update task_occurrences set assigned_to = null
   where assigned_to = me and status = 'pending'
     and task_id in (select t.id from tasks t join spaces s on s.id = t.space_id where s.home_id = h);
  delete from home_members where home_id = h and user_id = me;
end;
$$;
revoke execute on function public.leave_home(uuid) from public, anon;
grant execute on function public.leave_home(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Ícone de ambiente agora é um emoji livre: converte as chaves antigas
-- ---------------------------------------------------------------------------
update spaces set icon = case icon
  when 'kitchen' then '🍳' when 'bathroom' then '🚿' when 'living' then '🛋️'
  when 'bedroom' then '🛏️' when 'garden' then '🌿' when 'garage' then '🚗'
  else icon end
where icon in ('kitchen', 'bathroom', 'living', 'bedroom', 'garden', 'garage');
