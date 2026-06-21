-- Tend — funções e triggers

-- ---------------------------------------------------------------------------
-- Criação automática de profile ao registrar (auth.users -> profiles)
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Geração de invite_code curto e único (8 chars, sem caracteres ambíguos)
-- ---------------------------------------------------------------------------
create or replace function gen_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
  ok boolean;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    select not exists (select 1 from homes where invite_code = code) into ok;
    exit when ok;
  end loop;
  return code;
end;
$$;

-- ---------------------------------------------------------------------------
-- Helpers de membership (SECURITY DEFINER para evitar recursão de RLS)
-- ---------------------------------------------------------------------------
create or replace function is_home_member(h uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from home_members
    where home_id = h and user_id = auth.uid()
  );
$$;

create or replace function home_role(h uuid)
returns member_role
language sql stable security definer set search_path = public
as $$
  select role from home_members
  where home_id = h and user_id = auth.uid();
$$;

-- home_id de um space (para policies de spaces/tasks)
create or replace function space_home(s uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select home_id from spaces where id = s;
$$;

-- space_id de uma task (para policies de occurrences)
create or replace function task_space(t uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select space_id from tasks where id = t;
$$;

-- ---------------------------------------------------------------------------
-- Criar Home já com o criador como owner + membro
-- ---------------------------------------------------------------------------
create or replace function create_home(home_name text)
returns homes
language plpgsql security definer set search_path = public
as $$
declare
  new_home homes;
begin
  insert into homes (name, owner_id, invite_code)
  values (home_name, auth.uid(), gen_invite_code())
  returning * into new_home;

  insert into home_members (home_id, user_id, role)
  values (new_home.id, auth.uid(), 'owner');

  return new_home;
end;
$$;

-- ---------------------------------------------------------------------------
-- Entrar numa Home via invite_code
-- ---------------------------------------------------------------------------
create or replace function join_home(code text)
returns homes
language plpgsql security definer set search_path = public
as $$
declare
  target homes;
begin
  select * into target from homes where invite_code = code;
  if target.id is null then
    raise exception 'invite_code inválido' using errcode = 'no_data_found';
  end if;

  insert into home_members (home_id, user_id, role)
  values (target.id, auth.uid(), 'member')
  on conflict (home_id, user_id) do nothing;

  return target;
end;
$$;

-- ---------------------------------------------------------------------------
-- Crédito de pontos ao concluir ocorrência em space gamificado
-- ---------------------------------------------------------------------------
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
  end if;
  return new;
end;
$$;

create trigger trg_credit_points
  before update on task_occurrences
  for each row execute function credit_points_on_done();
