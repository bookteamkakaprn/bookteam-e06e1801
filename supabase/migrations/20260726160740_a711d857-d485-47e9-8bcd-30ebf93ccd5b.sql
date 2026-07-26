ALTER TABLE public.livros
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS objetivo text,
  ADD COLUMN IF NOT EXISTS publico_alvo text,
  ADD COLUMN IF NOT EXISTS conteudo_programatico text,
  ADD COLUMN IF NOT EXISTS competencias text,
  ADD COLUMN IF NOT EXISTS qtd_encontros integer,
  ADD COLUMN IF NOT EXISTS duracao text,
  ADD COLUMN IF NOT EXISTS material_necessario text,
  ADD COLUMN IF NOT EXISTS professor text,
  ADD COLUMN IF NOT EXISTS coordenador text,
  ADD COLUMN IF NOT EXISTS ano integer,
  ADD COLUMN IF NOT EXISTS turma text,
  ADD COLUMN IF NOT EXISTS datas_curso text,
  ADD COLUMN IF NOT EXISTS horario text,
  ADD COLUMN IF NOT EXISTS sala text,
  ADD COLUMN IF NOT EXISTS valor numeric(10,2),
  ADD COLUMN IF NOT EXISTS vagas_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inscritos integer NOT NULL DEFAULT 0;

ALTER TABLE public.livros
  ADD COLUMN IF NOT EXISTS vagas_restantes integer
  GENERATED ALWAYS AS (GREATEST(vagas_total - inscritos, 0)) STORED;

CREATE OR REPLACE FUNCTION public.sync_livro_inscritos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_livro uuid;
BEGIN
  SELECT e.livro_id INTO v_livro
    FROM public.eventos e
   WHERE e.id = COALESCE(NEW.evento_id, OLD.evento_id);

  IF v_livro IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.livros l
     SET inscritos = (
       SELECT count(*)
         FROM public.inscricoes i
         JOIN public.eventos e2 ON e2.id = i.evento_id
        WHERE e2.livro_id = v_livro
          AND i.status = 'confirmada'
     ),
     updated_at = now()
   WHERE l.id = v_livro;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_livro_inscritos ON public.inscricoes;
CREATE TRIGGER trg_sync_livro_inscritos
AFTER INSERT OR UPDATE OF status OR DELETE ON public.inscricoes
FOR EACH ROW EXECUTE FUNCTION public.sync_livro_inscritos();

INSERT INTO public.trilhas (nome, descricao)
SELECT 'Trilha Book Team', 'Trilha oficial de livros do Book Team Amor'
WHERE NOT EXISTS (SELECT 1 FROM public.trilhas);

INSERT INTO public.livros (trilha_id, titulo, ordem)
SELECT t.id, v.titulo, v.ordem
  FROM public.trilhas t
  CROSS JOIN (VALUES
    ('Mantenha Seu Amor Aceso', 1),
    ('Cultura da Honra', 2),
    ('Seu Perfeito Você', 3),
    ('Ative Seu Cérebro', 4),
    ('Organize Sua Desordem Mental', 5),
    ('O Despertar da Leoa', 6),
    ('Mulheres com Espadas', 7),
    ('Os Caminhos Sobrenaturais da Realeza', 8),
    ('O Poder Sobrenatural de uma Mente Transformada', 9),
    ('Livro Top 10', 10)
  ) AS v(titulo, ordem)
 WHERE t.nome = 'Trilha Book Team'
   AND NOT EXISTS (SELECT 1 FROM public.livros l WHERE l.titulo = v.titulo);