-- Turmas: arquivar e excluir de forma reversível.
-- Nada é apagado do banco. Arquivada = sai da lista de ativas. Excluída = some da lista
-- e pode ser restaurada. Turmas arquivadas ou excluídas não aparecem para o aluno.

ALTER TABLE public.turmas
  ADD COLUMN IF NOT EXISTS arquivada_em timestamptz NULL,
  ADD COLUMN IF NOT EXISTS excluida_em timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_turmas_arquivada_em ON public.turmas(arquivada_em);
CREATE INDEX IF NOT EXISTS idx_turmas_excluida_em ON public.turmas(excluida_em);

NOTIFY pgrst, 'reload schema';
