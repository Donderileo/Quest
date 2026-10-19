-- Rollout fechado: só e-mails da lista conseguem criar conta.
-- O bloqueio fica no banco (trigger em auth.users), então vale também para quem
-- chamar a API de signup do Supabase direto, sem passar pelo app.
--
-- Liberar:  insert into public.beta_allowlist (email) values ('pessoa@exemplo.com');
-- Abrir ao público no futuro: drop trigger trg_beta_allowlist on auth.users;

create table if not exists public.beta_allowlist (
  email      text primary key check (email = lower(email)),
  note       text,
  created_at timestamptz not null default now()
);

-- RLS ligado e sem policies + sem grants: só o dono do banco (SQL Editor / service role) enxerga.
alter table public.beta_allowlist enable row level security;
revoke all on public.beta_allowlist from anon, authenticated;

create or replace function public.enforce_beta_allowlist()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.beta_allowlist where email = lower(new.email)) then
    raise exception 'signup_not_allowed' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger trg_beta_allowlist
  before insert on auth.users
  for each row execute function public.enforce_beta_allowlist();
