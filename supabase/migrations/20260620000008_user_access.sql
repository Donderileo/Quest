-- Substitui a allowlist da migration 7 (já aplicada em produção) pela aprovação por admin.
-- Re-executável: uma versão anterior desta tabela já foi aplicada em produção (sem dados reais).
drop trigger if exists on_auth_user_created_access on auth.users;
drop table if exists public.user_access cascade;

drop trigger if exists trg_beta_allowlist on auth.users;
drop function if exists public.enforce_beta_allowlist();
drop table if exists public.beta_allowlist;

-- Rollout fechado: cadastro livre, acesso só após aprovação do admin do sistema.
--
-- Fluxo: cadastro -> código de 6 dígitos por e-mail -> status 'pending' -> admin aprova.
-- Enquanto não 'approved', o usuário não lê nem escreve NENHUM dado (nem pela API direta):
-- is_home_member()/home_role()/create_home()/join_home() passam a exigir is_approved().
--
-- status/is_admin ficam numa tabela SEPARADA de `profiles` de propósito: profiles tem
-- policy de update do próprio usuário (nome/avatar); se status vivesse lá, qualquer um
-- se aprovaria sozinho. Aqui o usuário só tem SELECT na própria linha.
--
-- Primeiro admin (uma vez, no SQL Editor do Supabase — nenhuma rota do app promove admin):
--   update public.user_access set status = 'approved', is_admin = true
--   where user_id = (select id from auth.users where email = 'voce@exemplo.com');

create table public.user_access (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'blocked')),
  is_admin     boolean not null default false,
  requested_at timestamptz not null default now(),
  decided_at   timestamptz,
  decided_by   uuid references auth.users (id) on delete set null,
  -- admin tem de estar aprovado
  constraint admin_must_be_approved check (not is_admin or status = 'approved')
);

alter table public.user_access enable row level security;

create policy user_access_select_own on public.user_access
  for select using (user_id = auth.uid());

-- authenticated: só leitura (da própria linha, via policy). Escrita: apenas service_role / SQL.
revoke all on public.user_access from anon, authenticated;
grant select on public.user_access to authenticated;
grant all on public.user_access to service_role;

-- toda conta nova nasce 'pending'
create or replace function public.handle_new_user_access()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.user_access (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created_access
  after insert on auth.users
  for each row execute function public.handle_new_user_access();

-- contas que já existiam entram como 'pending' (nunca aprovadas automaticamente);
-- o seed de dev aprova os usuários de teste, e em produção o admin aprova pelo painel.
insert into public.user_access (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.is_approved()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_access where user_id = auth.uid() and status = 'approved'
  );
$$;

create or replace function public.is_system_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_access
    where user_id = auth.uid() and status = 'approved' and is_admin
  );
$$;

-- gate: tudo que passa pelos helpers de membership exige usuário aprovado
create or replace function is_home_member(h uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_approved() and exists (
    select 1 from home_members where home_id = h and user_id = auth.uid()
  );
$$;

create or replace function home_role(h uuid)
returns member_role
language sql stable security definer set search_path = public
as $$
  select role from home_members
  where home_id = h and user_id = auth.uid() and public.is_approved();
$$;

create or replace function create_home(home_name text)
returns homes
language plpgsql security definer set search_path = public
as $$
declare
  new_home homes;
begin
  if not public.is_approved() then
    raise exception 'access_not_approved' using errcode = '42501';
  end if;

  insert into homes (name, owner_id, invite_code)
  values (home_name, auth.uid(), gen_invite_code())
  returning * into new_home;

  insert into home_members (home_id, user_id, role)
  values (new_home.id, auth.uid(), 'owner');

  return new_home;
end;
$$;

create or replace function join_home(code text)
returns homes
language plpgsql security definer set search_path = public
as $$
declare
  target homes;
begin
  if not public.is_approved() then
    raise exception 'access_not_approved' using errcode = '42501';
  end if;

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
