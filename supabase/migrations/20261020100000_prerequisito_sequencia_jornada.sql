-- Pré-requisito de sequência da Jornada e conclusão automática por presença.
--
-- Regras:
-- 1) O aluno só declara conclusões anteriores a 01/11/2026 (origem 'declarado').
-- 2) A partir de 01/11/2026 a conclusão vem da presença: 90% ou mais dos encontros
--    da turma marcados como presente gera o registro no histórico (origem 'presenca').
-- 3) Inscrição do aluno em livro da Jornada exige todos os livros anteriores (ordem menor)
--    da mesma trilha já concluídos. O admin (permissão 'inscricoes') não é bloqueado.
-- 4) Cursos fora da Jornada não têm pré-requisito.

-- ============================================================
-- 1) Histórico: origem e corte da declaração manual
-- ============================================================
ALTER TABLE public.historico_livros
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'declarado';

ALTER TABLE public.historico_livros
  DROP CONSTRAINT IF EXISTS historico_livros_origem_check;
ALTER TABLE public.historico_livros
  ADD CONSTRAINT historico_livros_origem_check CHECK (origem IN ('declarado', 'presenca'));

-- Declarações só para conclusões anteriores ao corte. NOT VALID evita falhar com dados antigos.
ALTER TABLE public.historico_livros
  DROP CONSTRAINT IF EXISTS historico_livros_declarado_antes_do_corte;
ALTER TABLE public.historico_livros
  ADD CONSTRAINT historico_livros_declarado_antes_do_corte
  CHECK (origem <> 'declarado' OR data_conclusao < DATE '2026-11-01') NOT VALID;

-- Aluno: só insere declaração (sem origem 'presenca'), dentro do corte e não futura.
DROP POLICY IF EXISTS "historico_self_insert" ON public.historico_livros;
CREATE POLICY "historico_self_insert" ON public.historico_livros
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = participante_id
    AND origem = 'declarado'
    AND data_conclusao <= current_date
    AND data_conclusao < DATE '2026-11-01'
  );

-- Aluno: só remove as próprias declarações; conclusões por presença são controladas pelo sistema.
DROP POLICY IF EXISTS "historico_self_delete" ON public.historico_livros;
CREATE POLICY "historico_self_delete" ON public.historico_livros
  FOR DELETE TO authenticated
  USING (auth.uid() = participante_id AND origem = 'declarado');

-- ============================================================
-- 2) Encontros da turma e percentual de presença
-- ============================================================
CREATE OR REPLACE FUNCTION public.total_encontros_turma(p_turma_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
           WHEN t.data_inicio IS NULL OR t.data_fim IS NULL
                OR t.dia_semana IS NULL OR btrim(t.dia_semana) = ''
           THEN 0
           ELSE (
             SELECT count(*)::integer
               FROM generate_series(t.data_inicio::timestamp, t.data_fim::timestamp, interval '1 day') AS g(d)
              WHERE extract(dow FROM g.d)::integer = btrim(t.dia_semana)::integer
           )
         END
    FROM public.turmas t
   WHERE t.id = p_turma_id;
$$;

REVOKE ALL ON FUNCTION public.total_encontros_turma(uuid) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 3) Pré-requisito: todos os livros anteriores da Jornada concluídos
-- ============================================================
CREATE OR REPLACE FUNCTION public.aluno_cumpriu_prerequisito(p_participante_id uuid, p_livro_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
      FROM public.livros atual
      JOIN public.trilhas tr ON tr.id = atual.trilha_id
      JOIN public.livros anterior
        ON anterior.trilha_id = atual.trilha_id
       AND anterior.ordem < atual.ordem
     WHERE atual.id = p_livro_id
       AND tr.nome ILIKE '%Jornada%'
       AND NOT EXISTS (
         SELECT 1
           FROM public.historico_livros h
          WHERE h.participante_id = p_participante_id
            AND h.livro_id = anterior.id
       )
  );
$$;

REVOKE ALL ON FUNCTION public.aluno_cumpriu_prerequisito(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aluno_cumpriu_prerequisito(uuid, uuid) TO authenticated;

-- Trigger: bloqueia a inscrição do próprio aluno quando o pré-requisito não foi cumprido.
CREATE OR REPLACE FUNCTION public.checar_prerequisito_inscricao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_livro_id uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> NEW.participante_id THEN
    RETURN NEW;
  END IF;
  IF public.admin_tem_permissao(auth.uid(), 'inscricoes') THEN
    RETURN NEW;
  END IF;
  IF NEW.turma_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(t.livro_id, NEW.livro_id) INTO v_livro_id
    FROM public.turmas t
   WHERE t.id = NEW.turma_id;

  IF v_livro_id IS NOT NULL AND NOT public.aluno_cumpriu_prerequisito(NEW.participante_id, v_livro_id) THEN
    RAISE EXCEPTION 'Você precisa concluir os cursos anteriores da Jornada antes de se inscrever neste curso. Registre a conclusão no seu histórico.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.checar_prerequisito_inscricao() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_checar_prerequisito_inscricao ON public.inscricoes;
CREATE TRIGGER trg_checar_prerequisito_inscricao
BEFORE INSERT ON public.inscricoes
FOR EACH ROW EXECUTE FUNCTION public.checar_prerequisito_inscricao();

-- ============================================================
-- 4) Conclusão automática por presença (>= 90% dos encontros)
-- ============================================================
CREATE OR REPLACE FUNCTION public.marcar_conclusao_por_presenca()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inscricao_id uuid;
  v_participante_id uuid;
  v_turma_id uuid;
  v_livro_id uuid;
  v_total integer;
  v_presentes integer;
BEGIN
  v_inscricao_id := COALESCE(NEW.inscricao_id, OLD.inscricao_id);

  SELECT i.participante_id, i.turma_id, COALESCE(t.livro_id, i.livro_id)
    INTO v_participante_id, v_turma_id, v_livro_id
    FROM public.inscricoes i
    LEFT JOIN public.turmas t ON t.id = i.turma_id
   WHERE i.id = v_inscricao_id;

  IF v_turma_id IS NULL OR v_livro_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_total := public.total_encontros_turma(v_turma_id);
  IF v_total <= 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT count(*)::integer INTO v_presentes
    FROM public.presencas p
   WHERE p.inscricao_id = v_inscricao_id
     AND p.presente = true;

  IF v_presentes * 100 >= v_total * 90 THEN
    INSERT INTO public.historico_livros (participante_id, livro_id, data_conclusao, origem, observacao)
    VALUES (v_participante_id, v_livro_id, current_date, 'presenca', 'Concluído automaticamente por presença (90% ou mais).')
    ON CONFLICT (participante_id, livro_id) DO NOTHING;
  ELSE
    -- Se a presença caiu abaixo de 90%, remove a conclusão gerada por presença.
    DELETE FROM public.historico_livros
     WHERE participante_id = v_participante_id
       AND livro_id = v_livro_id
       AND origem = 'presenca';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.marcar_conclusao_por_presenca() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_marcar_conclusao_por_presenca ON public.presencas;
CREATE TRIGGER trg_marcar_conclusao_por_presenca
AFTER INSERT OR UPDATE OF presente OR DELETE ON public.presencas
FOR EACH ROW EXECUTE FUNCTION public.marcar_conclusao_por_presenca();

NOTIFY pgrst, 'reload schema';
