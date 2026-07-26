ALTER TABLE public.inscricoes ALTER COLUMN evento_id DROP NOT NULL;
ALTER TABLE public.pagamentos ALTER COLUMN evento_id DROP NOT NULL;

ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS turma_id uuid REFERENCES public.turmas(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS inscricoes_participante_turma_key
  ON public.inscricoes(participante_id, turma_id) WHERE turma_id IS NOT NULL;