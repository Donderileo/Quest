-- Tend — grants de acesso
-- RLS filtra as linhas; os GRANTs permitem que os roles cheguem às tabelas.
-- authenticated: usuários logados (anon key + JWT válido)
-- service_role: backend confiável — já tem BYPASSRLS como atributo de role

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete
  on table profiles, homes, home_members,
         spaces, space_members,
         tasks, task_rotation_queue,
         task_occurrences, space_member_points,
         push_subscriptions
  to authenticated;

-- service_role precisa de grant explícito (o BYPASSRLS é atributo do role,
-- não dispensa o grant de acesso à tabela)
grant all
  on table profiles, homes, home_members,
         spaces, space_members,
         tasks, task_rotation_queue,
         task_occurrences, space_member_points,
         push_subscriptions
  to service_role;
