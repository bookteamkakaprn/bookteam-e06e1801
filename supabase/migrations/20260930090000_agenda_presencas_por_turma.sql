-- Agenda de aulas e presença por encontro
-- A turma passa a informar o dia da semana e cada presença fica vinculada à data da aula.

ALTER TABLE public.turmas
  ADD COLUMN IF NOT EXISTS dia_semana TEXT;

ALTER TABLE public.presencas
  ALTER COLUMN evento_id DROP NOT NULL;

ALTER TABLE public.presencas
  ADD COLUMN IF NOT EXISTS data_aula DATE;

-- Presenças antigas ficam associadas à data em que foram registradas.
UPDATE public.presencas
SET data_aula = COALESCE(data_aula, (horario_checkin AT TIME ZONE 'America/Sao_Paulo')::date, created_at::date)
WHERE data_aula IS NULL;

ALTER TABLE public.presencas
  ALTER COLUMN data_aula SET NOT NULL;

-- Permite uma presença por aluno em cada encontro, em vez de apenas uma presença por inscrição.
ALTER TABLE public.presencas
  DROP CONSTRAINT IF EXISTS presencas_inscricao_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS presencas_inscricao_data_aula_key
  ON public.presencas(inscricao_id, data_aula);

CREATE INDEX IF NOT EXISTS presencas_data_aula_idx
  ON public.presencas(data_aula);
