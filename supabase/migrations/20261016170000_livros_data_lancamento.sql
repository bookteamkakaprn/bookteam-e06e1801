-- Data de lançamento do curso (livro). Usada no calendário do aluno (cor verde).
ALTER TABLE public.livros
  ADD COLUMN IF NOT EXISTS data_lancamento DATE;

NOTIFY pgrst, 'reload schema';
