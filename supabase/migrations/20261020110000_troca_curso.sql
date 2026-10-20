-- Troca de curso (somente ADM cria; aluno confirma pelo site/e-mail).
--
-- Regras:
-- - Só inscrição confirmada, sem livro entregue e sem nenhuma presença registrada.
-- - Turma de destino precisa estar ativa, ter vaga e respeitar o pré-requisito da Jornada.
-- - Solicitação expira em 7 dias sem confirmação do aluno.
-- - Diferença positiva: cria pagamento da diferença; a troca é concluída quando for aprovado.
-- - Diferença negativa: a troca é concluída na confirmação; o ADM é avisado para devolver.
-- - Diferença zero: a troca é concluída na confirmação.

-- ============================================================
-- 0) Tipo do pagamento: a diferença da troca não substitui o pagamento da inscrição
-- ============================================================
ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'inscricao';

ALTER TABLE public.pagamentos
  DROP CONSTRAINT IF EXISTS pagamentos_tipo_check;
ALTER TABLE public.pagamentos
  ADD CONSTRAINT pagamentos_tipo_check CHECK (tipo IN ('inscricao', 'diferenca_troca'));

-- ============================================================
-- 1) Tabela de solicitações
-- ============================================================
CREATE TABLE IF NOT EXISTS public.solicitacoes_troca_curso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id uuid NOT NULL REFERENCES public.inscricoes(id) ON DELETE CASCADE,
  participante_id uuid NOT NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
  turma_origem_id uuid NOT NULL REFERENCES public.turmas(id),
  turma_destino_id uuid NOT NULL REFERENCES public.turmas(id),
  status text NOT NULL DEFAULT 'pendente_aluno'
    CHECK (status IN ('pendente_aluno', 'aguardando_diferenca', 'concluida', 'cancelada', 'expirada')),
  diferenca numeric(10,2) NOT NULL DEFAULT 0,
  pagamento_diferenca_id uuid NULL REFERENCES public.pagamentos(id) ON DELETE SET NULL,
  solicitado_por uuid NOT NULL,
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  confirmado_em timestamptz NULL,
  concluido_em timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Uma solicitação ativa por inscrição.
CREATE UNIQUE INDEX IF NOT EXISTS solicitacoes_troca_ativa_key
  ON public.solicitacoes_troca_curso(inscricao_id)
  WHERE status IN ('pendente_aluno', 'aguardando_diferenca');

CREATE INDEX IF NOT EXISTS solicitacoes_troca_participante_idx
  ON public.solicitacoes_troca_curso(participante_id);

ALTER TABLE public.solicitacoes_troca_curso ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.solicitacoes_troca_curso TO authenticated;
GRANT ALL ON public.solicitacoes_troca_curso TO service_role;

DROP POLICY IF EXISTS "troca_admin_select" ON public.solicitacoes_troca_curso;
CREATE POLICY "troca_admin_select" ON public.solicitacoes_troca_curso
  FOR SELECT TO authenticated
  USING (public.admin_tem_permissao((SELECT auth.uid()), 'inscricoes'));

DROP POLICY IF EXISTS "troca_aluno_select" ON public.solicitacoes_troca_curso;
CREATE POLICY "troca_aluno_select" ON public.solicitacoes_troca_curso
  FOR SELECT TO authenticated
  USING (participante_id = (SELECT auth.uid()));

-- Sem políticas de escrita para o cliente: tudo passa pelas funções abaixo.

-- ============================================================
-- 2) Validação da troca (usada na criação, na confirmação e na execução)
-- ============================================================
CREATE OR REPLACE FUNCTION public.validar_troca_curso(p_inscricao_id uuid, p_turma_destino_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_insc public.inscricoes%ROWTYPE;
  v_dest public.turmas%ROWTYPE;
BEGIN
  SELECT * INTO v_insc FROM public.inscricoes WHERE id = p_inscricao_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inscrição não encontrada.';
  END IF;
  IF v_insc.status <> 'confirmada' THEN
    RAISE EXCEPTION 'Só é possível trocar o curso de uma inscrição confirmada.';
  END IF;
  IF v_insc.turma_id IS NULL THEN
    RAISE EXCEPTION 'Esta inscrição não é de turma.';
  END IF;
  IF v_insc.turma_id = p_turma_destino_id THEN
    RAISE EXCEPTION 'A turma de destino é a mesma da inscrição.';
  END IF;
  IF COALESCE(v_insc.livro_disponibilizado, false) THEN
    RAISE EXCEPTION 'O livro já foi entregue. A troca de curso não é permitida.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.presencas p WHERE p.inscricao_id = p_inscricao_id) THEN
    RAISE EXCEPTION 'Já há presença registrada nesta inscrição. A troca de curso não é permitida.';
  END IF;

  SELECT * INTO v_dest FROM public.turmas WHERE id = p_turma_destino_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Turma de destino não encontrada.';
  END IF;
  IF v_dest.arquivada_em IS NOT NULL OR v_dest.excluida_em IS NOT NULL THEN
    RAISE EXCEPTION 'A turma de destino não está disponível.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.inscricoes i
     WHERE i.participante_id = v_insc.participante_id
       AND i.turma_id = p_turma_destino_id
       AND i.id <> p_inscricao_id
  ) THEN
    RAISE EXCEPTION 'O aluno já está inscrito na turma de destino.';
  END IF;
  IF COALESCE(v_dest.vagas_max, 0) > 0
     AND public.vagas_ocupadas(p_turma_destino_id, p_inscricao_id) >= v_dest.vagas_max THEN
    RAISE EXCEPTION 'Não há vaga na turma de destino.';
  END IF;
  IF NOT public.aluno_cumpriu_prerequisito(v_insc.participante_id, v_dest.livro_id) THEN
    RAISE EXCEPTION 'O aluno ainda não concluiu os cursos anteriores da Jornada exigidos pelo curso de destino.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_troca_curso(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 3) Execução: troca a turma e o livro da inscrição
-- ============================================================
CREATE OR REPLACE FUNCTION public.executar_troca_curso(p_solicitacao_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.solicitacoes_troca_curso%ROWTYPE;
  v_dest public.turmas%ROWTYPE;
  v_origem public.turmas%ROWTYPE;
  v_origem_livro uuid;
BEGIN
  SELECT * INTO s FROM public.solicitacoes_troca_curso WHERE id = p_solicitacao_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada.';
  END IF;

  PERFORM public.validar_troca_curso(s.inscricao_id, s.turma_destino_id);

  SELECT * INTO v_dest FROM public.turmas WHERE id = s.turma_destino_id;
  SELECT * INTO v_origem FROM public.turmas WHERE id = s.turma_origem_id;
  SELECT livro_id INTO v_origem_livro FROM public.inscricoes WHERE id = s.inscricao_id;

  UPDATE public.inscricoes
     SET turma_id = s.turma_destino_id,
         livro_id = v_dest.livro_id,
         updated_at = now()
   WHERE id = s.inscricao_id;

  UPDATE public.solicitacoes_troca_curso
     SET status = 'concluida', concluido_em = now()
   WHERE id = s.id;

  INSERT INTO public.audit_log (tabela, registro_id, usuario_id, status_anterior, status_novo, motivo, dados_anteriores, dados_novos)
  VALUES (
    'inscricoes', s.inscricao_id, COALESCE(auth.uid(), s.solicitado_por),
    'turma ' || s.turma_origem_id, 'turma ' || s.turma_destino_id,
    'Troca de curso',
    jsonb_build_object('turma_id', s.turma_origem_id, 'livro_id', v_origem_livro),
    jsonb_build_object('turma_id', s.turma_destino_id, 'livro_id', v_dest.livro_id)
  );

  INSERT INTO public.notificacoes_app (destinatario, participante_id, titulo, mensagem, link)
  VALUES ('aluno', s.participante_id, 'Troca de curso concluída',
          'Sua inscrição foi trocada para ' || v_dest.nome || '.', '/minhas-inscricoes');

  IF s.diferenca < 0 THEN
    INSERT INTO public.notificacoes_app (destinatario, titulo, mensagem, link)
    VALUES ('admin', 'Devolver diferença de troca de curso',
            'Devolver R$ ' || to_char(abs(s.diferenca), 'FM999G999D00') || ' ao aluno (troca para ' || v_dest.nome || ').',
            '/admin/inscricoes');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.executar_troca_curso(uuid) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 4) ADM cria a solicitação
-- ============================================================
CREATE OR REPLACE FUNCTION public.criar_solicitacao_troca_curso(p_inscricao_id uuid, p_turma_destino_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_insc public.inscricoes%ROWTYPE;
  v_origem public.turmas%ROWTYPE;
  v_dest public.turmas%ROWTYPE;
  v_id uuid;
BEGIN
  IF NOT public.admin_tem_permissao(auth.uid(), 'inscricoes') THEN
    RAISE EXCEPTION 'Sem permissão para trocar curso.';
  END IF;

  PERFORM public.validar_troca_curso(p_inscricao_id, p_turma_destino_id);

  SELECT * INTO v_insc FROM public.inscricoes WHERE id = p_inscricao_id;
  SELECT * INTO v_origem FROM public.turmas WHERE id = v_insc.turma_id;
  SELECT * INTO v_dest FROM public.turmas WHERE id = p_turma_destino_id;

  INSERT INTO public.solicitacoes_troca_curso (
    inscricao_id, participante_id, turma_origem_id, turma_destino_id, diferenca, solicitado_por
  ) VALUES (
    p_inscricao_id, v_insc.participante_id, v_insc.turma_id, p_turma_destino_id,
    COALESCE(v_dest.valor, 0) - COALESCE(v_origem.valor, 0), auth.uid()
  )
  RETURNING id INTO v_id;

  INSERT INTO public.notificacoes_app (destinatario, participante_id, titulo, mensagem, link)
  VALUES ('aluno', v_insc.participante_id, 'Troca de curso para confirmar',
          'A equipe solicitou a troca para ' || v_dest.nome || '. Confirme em Minhas inscrições.',
          '/minhas-inscricoes');

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.criar_solicitacao_troca_curso(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_solicitacao_troca_curso(uuid, uuid) TO authenticated;

-- ============================================================
-- 5) ADM cancela enquanto o aluno não confirmou
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancelar_solicitacao_troca_curso(p_solicitacao_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.solicitacoes_troca_curso%ROWTYPE;
BEGIN
  IF NOT public.admin_tem_permissao(auth.uid(), 'inscricoes') THEN
    RAISE EXCEPTION 'Sem permissão para cancelar a troca.';
  END IF;

  SELECT * INTO s FROM public.solicitacoes_troca_curso WHERE id = p_solicitacao_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada.';
  END IF;
  IF s.status <> 'pendente_aluno' THEN
    RAISE EXCEPTION 'Só é possível cancelar antes da confirmação do aluno.';
  END IF;

  UPDATE public.solicitacoes_troca_curso SET status = 'cancelada' WHERE id = s.id;

  INSERT INTO public.notificacoes_app (destinatario, participante_id, titulo, mensagem, link)
  VALUES ('aluno', s.participante_id, 'Troca de curso cancelada',
          'A solicitação de troca de curso foi cancelada. Sua inscrição continua na turma atual.',
          '/minhas-inscricoes');
END;
$$;

REVOKE ALL ON FUNCTION public.cancelar_solicitacao_troca_curso(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancelar_solicitacao_troca_curso(uuid) TO authenticated;

-- ============================================================
-- 6) Aluno confirma
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirmar_troca_curso(p_solicitacao_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.solicitacoes_troca_curso%ROWTYPE;
  v_pagamento uuid;
  v_dest_nome text;
BEGIN
  SELECT * INTO s FROM public.solicitacoes_troca_curso WHERE id = p_solicitacao_id FOR UPDATE;
  IF NOT FOUND OR s.participante_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Solicitação não encontrada.';
  END IF;
  IF s.status <> 'pendente_aluno' THEN
    RAISE EXCEPTION 'Esta solicitação não está aguardando sua confirmação.';
  END IF;

  IF s.expira_em < now() THEN
    -- Retorna em vez de lançar erro, para que a expiração seja gravada.
    UPDATE public.solicitacoes_troca_curso SET status = 'expirada' WHERE id = s.id;
    RETURN 'expirada';
  END IF;

  PERFORM public.validar_troca_curso(s.inscricao_id, s.turma_destino_id);

  UPDATE public.solicitacoes_troca_curso SET confirmado_em = now() WHERE id = s.id;

  IF s.diferenca > 0 THEN
    INSERT INTO public.pagamentos (inscricao_id, participante_id, turma_id, valor, status, observacao, tipo)
    VALUES (s.inscricao_id, s.participante_id, s.turma_destino_id, s.diferenca, 'aguardando',
            'Diferença da troca de curso', 'diferenca_troca')
    RETURNING id INTO v_pagamento;

    UPDATE public.solicitacoes_troca_curso
       SET status = 'aguardando_diferenca', pagamento_diferenca_id = v_pagamento
     WHERE id = s.id;

    SELECT nome INTO v_dest_nome FROM public.turmas WHERE id = s.turma_destino_id;
    INSERT INTO public.notificacoes_app (destinatario, titulo, mensagem, link)
    VALUES ('admin', 'Troca aguardando pagamento da diferença',
            'Aluno confirmou a troca para ' || v_dest_nome || '. Diferença a receber: R$ ' || to_char(s.diferenca, 'FM999G999D00') || '.',
            '/admin/pagamentos');

    RETURN 'aguardando_diferenca';
  END IF;

  PERFORM public.executar_troca_curso(s.id);
  RETURN 'concluida';
END;
$$;

REVOKE ALL ON FUNCTION public.confirmar_troca_curso(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirmar_troca_curso(uuid) TO authenticated;

-- ============================================================
-- 7) Pagamento da diferença aprovado: conclui a troca
--    Se a troca não puder ser concluída (ex.: vaga esgotada), a aprovação do
--    pagamento não é desfeita; o ADM é avisado para resolver manualmente.
-- ============================================================
CREATE OR REPLACE FUNCTION public.aplicar_troca_pagamento_aprovado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_solicitacao uuid;
  v_erro text;
BEGIN
  SELECT id INTO v_solicitacao
    FROM public.solicitacoes_troca_curso
   WHERE pagamento_diferenca_id = NEW.id
     AND status = 'aguardando_diferenca';

  IF v_solicitacao IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM public.executar_troca_curso(v_solicitacao);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_erro = MESSAGE_TEXT;
    INSERT INTO public.notificacoes_app (destinatario, titulo, mensagem, link)
    VALUES ('admin', 'Diferença paga, troca não concluída',
            'Resolva manualmente: ' || v_erro,
            '/admin/inscricoes');
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.aplicar_troca_pagamento_aprovado() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_aplicar_troca_pagamento_aprovado ON public.pagamentos;
CREATE TRIGGER trg_aplicar_troca_pagamento_aprovado
AFTER UPDATE OF status ON public.pagamentos
FOR EACH ROW
WHEN (NEW.status = 'aprovado' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.aplicar_troca_pagamento_aprovado();

-- ============================================================
-- 8) Expiração das solicitações sem confirmação
-- ============================================================
CREATE OR REPLACE FUNCTION public.expirar_trocas_vencidas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
BEGIN
  UPDATE public.solicitacoes_troca_curso
     SET status = 'expirada'
   WHERE status = 'pendente_aluno'
     AND expira_em < now();
  GET DIAGNOSTICS v_total = ROW_COUNT;
  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.expirar_trocas_vencidas() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('expirar-trocas-curso')
      FROM cron.job WHERE jobname = 'expirar-trocas-curso';
    PERFORM cron.schedule('expirar-trocas-curso', '0 * * * *', 'SELECT public.expirar_trocas_vencidas()');
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
