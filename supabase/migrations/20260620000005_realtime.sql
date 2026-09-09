-- Tend — Realtime
-- Adiciona as tabelas que alimentam as telas ao vivo na publication do Realtime.
-- O RLS continua valendo: cada cliente só recebe eventos das linhas que pode ver.

alter publication supabase_realtime add table task_occurrences;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table space_member_points;
