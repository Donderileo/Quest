-- Desfazer conclusão: reverter ocorrência 'done' -> 'pending' estorna os pontos.
create or replace function credit_points_on_done()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  task_points int;
  task_space_id uuid;
  space_is_gamified boolean;
begin
  if new.status = 'done' and (old.status is distinct from 'done') then
    select t.points, t.space_id, (s.mode = 'gamified')
      into task_points, task_space_id, space_is_gamified
      from tasks t join spaces s on s.id = t.space_id
      where t.id = new.task_id;

    if space_is_gamified and new.completed_by is not null then
      new.points_awarded := task_points;
      insert into space_member_points (space_id, user_id, total_points)
      values (task_space_id, new.completed_by, task_points)
      on conflict (space_id, user_id)
      do update set total_points = space_member_points.total_points + excluded.total_points;
    end if;

  elsif old.status = 'done' and new.status = 'pending' then
    if old.points_awarded > 0 and old.completed_by is not null then
      update space_member_points p
         set total_points = greatest(p.total_points - old.points_awarded, 0)
        from tasks t
       where t.id = new.task_id
         and p.space_id = t.space_id
         and p.user_id = old.completed_by;
    end if;
    new.points_awarded := 0;
    new.completed_at := null;
    new.completed_by := null;
  end if;
  return new;
end;
$$;
