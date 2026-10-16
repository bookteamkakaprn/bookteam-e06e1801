-- Arquivar eventos sem excluí-los. Eventos arquivados saem das telas do aluno e do calendário.
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS arquivado_em timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_eventos_arquivado_em ON public.eventos(arquivado_em);

NOTIFY pgrst, 'reload schema';
