-- Redistribuir tarefas: passar tudo de uma pessoa para outra (ou dividir entre as duas).
-- Caso típico: uma pessoa monta a casa toda sozinha e depois convida a outra.
--
-- Qualquer membro da casa pode redistribuir (mesma regra de criar/editar tarefas).
-- p_from = null  -> tarefas sem responsável (ex.: quem saiu do ambiente)
-- p_space_ids    -> null/vazio = a casa toda; senão só esses ambientes
-- p_mode         -> 'move' (passa tudo) | 'split' (metade fica, metade vai; rodízios ganham a pessoa)
-- Rodízios: o app regenera as ocorrências futuras (a atribuição do rodízio é calculada lá).

create or replace function public.redistribute_tasks(
  p_home uuid,
  p_from uuid,
  p_to uuid,
  p_mode text,
  p_space_ids uuid[],
  p_today date
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  moved_ids uuid[] := '{}';
  rot_ids uuid[] := '{}';
  occ_moved int := 0;
  spaces_added int := 0;
begin
  if not is_home_member(p_home) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_mode not in ('move', 'split') then
    raise exception 'invalid_mode' using errcode = '22023';
  end if;
  if p_to is null or not exists (select 1 from home_members where home_id = p_home and user_id = p_to) then
    raise exception 'invalid_target' using errcode = '22023';
  end if;
  if p_from is not null and not exists (select 1 from home_members where home_id = p_home and user_id = p_from) then
    raise exception 'invalid_source' using errcode = '22023';
  end if;
  if p_from is not distinct from p_to then
    raise exception 'same_user' using errcode = '22023';
  end if;

  -- a pessoa que recebe passa a participar dos ambientes afetados
  insert into space_members (space_id, user_id)
  select s.id, p_to
    from spaces s
   where s.home_id = p_home
     and (p_space_ids is null or cardinality(p_space_ids) = 0 or s.id = any (p_space_ids))
  on conflict do nothing;
  get diagnostics spaces_added = row_count;

  -- tarefas de responsável fixo
  with cand as (
    select t.id,
           row_number() over (order by t.space_id, t.created_at, t.id) as rn
      from tasks t
      join spaces s on s.id = t.space_id
     where s.home_id = p_home
       and (p_space_ids is null or cardinality(p_space_ids) = 0 or s.id = any (p_space_ids))
       and t.archived_at is null
       and t.assignment_type = 'fixed'
       and t.assignee_id is not distinct from p_from
  ),
  upd as (
    update tasks set assignee_id = p_to
     where id in (select id from cand where p_mode = 'move' or rn % 2 = 0)
    returning id
  )
  select coalesce(array_agg(id), '{}') into moved_ids from upd;

  -- ocorrências futuras pendentes dessas tarefas acompanham o novo responsável
  update task_occurrences
     set assigned_to = p_to
   where task_id = any (moved_ids)
     and status = 'pending'
     and due_date >= p_today
     and assigned_to is not distinct from p_from;
  get diagnostics occ_moved = row_count;

  -- rodízios que incluem quem está saindo da frente
  if p_from is not null then
    select coalesce(array_agg(distinct t.id), '{}') into rot_ids
      from tasks t
      join spaces s on s.id = t.space_id
      join task_rotation_queue q on q.task_id = t.id and q.user_id = p_from
     where s.home_id = p_home
       and (p_space_ids is null or cardinality(p_space_ids) = 0 or s.id = any (p_space_ids))
       and t.archived_at is null
       and t.assignment_type = 'rotation';

    if p_mode = 'move' then
      -- se o destino já está na fila, só tira quem saiu; senão ele ocupa a mesma posição
      delete from task_rotation_queue q
       where q.task_id = any (rot_ids) and q.user_id = p_from
         and exists (select 1 from task_rotation_queue q2 where q2.task_id = q.task_id and q2.user_id = p_to);
      update task_rotation_queue
         set user_id = p_to
       where task_id = any (rot_ids) and user_id = p_from;
    else
      insert into task_rotation_queue (task_id, user_id, position)
      select r, p_to, coalesce((select max(position) + 1 from task_rotation_queue where task_id = r), 0)
        from unnest(rot_ids) r
       where not exists (select 1 from task_rotation_queue where task_id = r and user_id = p_to);
    end if;
  end if;

  return jsonb_build_object(
    'tasks_moved', cardinality(moved_ids),
    'occurrences_moved', occ_moved,
    'rotation_task_ids', to_jsonb(rot_ids),
    'spaces_joined', spaces_added
  );
end;
$$;

revoke execute on function public.redistribute_tasks(uuid, uuid, uuid, text, uuid[], date) from public, anon;
grant execute on function public.redistribute_tasks(uuid, uuid, uuid, text, uuid[], date) to authenticated;
