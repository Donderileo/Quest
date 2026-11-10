-- Tarefa avulsa: acontece uma única vez, no dia escolhido (sem repetição).
-- Ex.: "pagar a taxa do condomínio hoje", algo que surgiu fora do planejado.
alter type recurrence_type add value if not exists 'once';
