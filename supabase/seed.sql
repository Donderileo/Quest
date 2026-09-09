-- ===========================================================================
-- Tend — seed de desenvolvimento
-- Roda automaticamente em `supabase db reset`.
--
-- Cria 3 usuários fake na mesma casa, com 3 ambientes e tarefas.
-- Login (todos com a MESMA senha):  senha = tend1234
--   leo@tend.app      (dono)   <-- use esta para acessar
--   ana@tend.app      (admin)
--   pedro@tend.app    (membro)
-- ===========================================================================

-- UUIDs fixos para referência cruzada
-- usuários
--   Leo   11111111-1111-1111-1111-111111111111
--   Ana   22222222-2222-2222-2222-222222222222
--   Pedro 33333333-3333-3333-3333-333333333333

-- ---------------------------------------------------------------------------
-- 1) Usuários de auth (o trigger on_auth_user_created cria os profiles)
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'leo@tend.app',
   extensions.crypt('tend1234', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Leo"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'ana@tend.app',
   extensions.crypt('tend1234', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Ana"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333',
   'authenticated', 'authenticated', 'pedro@tend.app',
   extensions.crypt('tend1234', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Pedro"}',
   now(), now(), '', '', '', '')
on conflict (id) do nothing;

-- identidades (necessárias para login por email/senha)
insert into auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
values
  ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   '{"sub":"11111111-1111-1111-1111-111111111111","email":"leo@tend.app"}',
   'email', 'leo@tend.app', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
   '{"sub":"22222222-2222-2222-2222-222222222222","email":"ana@tend.app"}',
   'email', 'ana@tend.app', now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
   '{"sub":"33333333-3333-3333-3333-333333333333","email":"pedro@tend.app"}',
   'email', 'pedro@tend.app', now(), now(), now())
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2) Casa + membros
-- ---------------------------------------------------------------------------
insert into homes (id, name, owner_id, invite_code)
values ('a0000000-0000-0000-0000-000000000001', 'Casa de Teste',
        '11111111-1111-1111-1111-111111111111', 'TESTE123')
on conflict (id) do nothing;

insert into home_members (home_id, user_id, role)
values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('a0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'admin'),
  ('a0000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'member')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 3) Ambientes (Cozinha gamificada, Banheiro simples, Quintal gamificado)
-- ---------------------------------------------------------------------------
insert into spaces (id, home_id, name, icon, mode)
values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Cozinha',  'kitchen',  'gamified'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Banheiro', 'bathroom', 'simple'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Quintal',  'garden',   'gamified')
on conflict (id) do nothing;

-- todos participam de todos os ambientes
insert into space_members (space_id, user_id)
select s.id, hm.user_id
from spaces s
join home_members hm on hm.home_id = s.home_id
where s.home_id = 'a0000000-0000-0000-0000-000000000001'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 4) Tarefas
-- ---------------------------------------------------------------------------
insert into tasks (
  id, space_id, title, recurrence_type, recurrence_days, recurrence_interval_days,
  assignment_type, assignee_id, points, start_date, created_by
)
values
  -- Cozinha
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'Lavar a louça', 'daily', '{}', null, 'rotation', null, 10, current_date,
   '11111111-1111-1111-1111-111111111111'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   'Tirar o lixo', 'weekly', '{1,3,5}', null, 'fixed',
   '33333333-3333-3333-3333-333333333333', 5, current_date,
   '11111111-1111-1111-1111-111111111111'),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
   'Limpar a geladeira', 'custom', '{}', 14, 'fixed',
   '22222222-2222-2222-2222-222222222222', 20, current_date,
   '11111111-1111-1111-1111-111111111111'),

  -- Banheiro
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002',
   'Limpar o vaso', 'daily', '{}', null, 'rotation', null, 0, current_date,
   '11111111-1111-1111-1111-111111111111'),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002',
   'Trocar as toalhas', 'weekly', '{0}', null, 'fixed',
   '11111111-1111-1111-1111-111111111111', 0, current_date,
   '11111111-1111-1111-1111-111111111111'),

  -- Quintal
  ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003',
   'Regar as plantas', 'daily', '{}', null, 'fixed',
   '22222222-2222-2222-2222-222222222222', 10, current_date,
   '11111111-1111-1111-1111-111111111111'),
  ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003',
   'Cortar a grama', 'custom', '{}', 7, 'rotation', null, 25, current_date,
   '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

-- filas de rodízio
insert into task_rotation_queue (task_id, user_id, position)
values
  -- Lavar a louça: Leo, Ana, Pedro
  ('c0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 0),
  ('c0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 1),
  ('c0000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 2),
  -- Limpar o vaso: Ana, Leo
  ('c0000000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 0),
  ('c0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 1),
  -- Cortar a grama: Leo, Pedro
  ('c0000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 0),
  ('c0000000-0000-0000-0000-000000000007', '33333333-3333-3333-3333-333333333333', 1)
on conflict do nothing;
