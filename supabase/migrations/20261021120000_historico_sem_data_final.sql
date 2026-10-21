-- Histórico declarado sem data final: o aluno pode declarar a conclusão de qualquer curso
-- já feito antes de se inscrever na plataforma, em qualquer data passada (não futura).
-- A conclusão de cursos feitos pela plataforma continua vindo da presença (origem 'presenca').
-- A regra de sequência (pré-requisito na inscrição e na troca) não muda.

-- Remove o limite de corte da declaração manual.
ALTER TABLE public.historico_livros
  DROP CONSTRAINT IF EXISTS historico_livros_declarado_antes_do_corte;

-- Aluno: só insere declaração própria, com data não futura.
DROP POLICY IF EXISTS "historico_self_insert" ON public.historico_livros;
CREATE POLICY "historico_self_insert" ON public.historico_livros
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = participante_id
    AND origem = 'declarado'
    AND data_conclusao <= current_date
  );

NOTIFY pgrst, 'reload schema';
