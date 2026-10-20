-- Tarefas com data de término (opcional). A data de início já existia (start_date).
-- Ex.: remédio diário por 10 dias; ou a cada 30 dias começando numa data escolhida.
alter table tasks add column end_date date;
alter table tasks add constraint tasks_end_after_start check (end_date is null or end_date >= start_date);
