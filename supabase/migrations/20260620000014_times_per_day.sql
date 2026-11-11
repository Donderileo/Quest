-- Tarefas que se repetem mais de uma vez no mesmo dia (ex.: dar comida ao cachorro 2x por dia).
--   tasks.times_per_day      quantas vezes por dia (1 a 6)
--   task_occurrences.slot    qual das vezes do dia (1ª, 2ª…)
-- A unicidade passa de (tarefa, dia) para (tarefa, dia, vez).

alter table tasks
  add column times_per_day int not null default 1,
  add constraint tasks_times_per_day_range check (times_per_day between 1 and 6);

alter table task_occurrences
  add column slot int not null default 1,
  add constraint task_occurrences_slot_positive check (slot >= 1);

alter table task_occurrences drop constraint task_occurrences_task_id_due_date_key;
alter table task_occurrences
  add constraint task_occurrences_task_id_due_date_slot_key unique (task_id, due_date, slot);
