-- Aplicar um balanceamento de rodízios: troca o responsável de ocorrências PENDENTES, de hoje em diante,
-- de tarefas em RODÍZIO, sempre para alguém que está na fila daquela tarefa.
-- O plano é calculado no app (src/lib/balance.ts); aqui só se valida e grava, tudo ou nada.
-- O "Desfazer" usa a mesma função com os responsáveis anteriores.
--
-- p_assignments: [{"occ": "<uuid da ocorrência>", "user_id": "<uuid de quem passa a fazer>"}, ...]
-- Qualquer item inválido (outra casa, já concluída, no passado, tarefa fixa, pessoa fora da fila,
-- repetido) cancela o lote inteiro.

create or replace function public.apply_balance(
  p_home uuid,
  p_assignments jsonb,
  p_today date
)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  expected int;
  changed int;
begin
  if not is_home_member(p_home) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_assignments is null or jsonb_typeof(p_assignments) <> 'array' then
    raise exception 'invalid_payload' using errcode = '22023';
  end if;

  expected := jsonb_array_length(p_assignments);
  if expected = 0 then
    return 0;
  end if;
  if expected > 2000 then
    raise exception 'too_many' using errcode = '22023';
  end if;

  with req as (
    select (x ->> 'occ')::uuid as occ, (x ->> 'user_id')::uuid as uid
      from jsonb_array_elements(p_assignments) x
  )
  update task_occurrences o
     set assigned_to = req.uid
    from req, tasks t, spaces s
   where o.id = req.occ
     and t.id = o.task_id
     and s.id = t.space_id
     and s.home_id = p_home
     and o.status = 'pending'
     and o.due_date >= p_today
     and t.assignment_type = 'rotation'
     and t.archived_at is null
     and exists (select 1 from task_rotation_queue q where q.task_id = t.id and q.user_id = req.uid);
  get diagnostics changed = row_count;

  -- todos os itens precisam ter sido aceitos (duplicados também reprovam)
  if changed <> expected then
    raise exception 'invalid_assignment' using errcode = '22023';
  end if;
  return changed;
end;
$$;

revoke execute on function public.apply_balance(uuid, jsonb, date) from public, anon;
grant execute on function public.apply_balance(uuid, jsonb, date) to authenticated;
