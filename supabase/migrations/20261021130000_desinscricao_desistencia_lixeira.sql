-- Desinscrição e desistência pelo aluno, lixeira e arquivo para o admin.
--
-- Regras:
-- - Sem pagamento aprovado: o aluno desinscreve (aguardando_pagamento ou confirmada).
-- - Com pagamento aprovado: o aluno desiste em até 5 dias após a aprovação do pagamento.
--   O admin é avisado para devolver o valor. Depois de 5 dias, fala com a ADM.
-- - Inscrições canceladas pelo aluno podem ir para a lixeira e depois para o arquivo.
--   Lixeira e arquivo saem das listas principais, e a restauração é possível.

ALTER TABLE public.inscricoes
  ADD COLUMN IF NOT EXISTS excluida_em timestamptz,
  ADD COLUMN IF NOT EXISTS arquivada_em timestamptz;

CREATE INDEX IF NOT EXISTS inscricoes_excluida_em_idx ON public.inscricoes(excluida_em);
CREATE INDEX IF NOT EXISTS inscricoes_arquivada_em_idx ON public.inscricoes(arquivada_em);

-- ============================================================
-- 1) Aluno cancela a própria inscrição (desinscrição ou desistência)
-- ============================================================
CREATE OR REPLACE FUNCTION public.aluno_cancelar_inscricao(p_inscricao_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i public.inscricoes%ROWTYPE;
  v_pago_em timestamptz;
BEGIN
  SELECT * INTO i FROM public.inscricoes WHERE id = p_inscricao_id FOR UPDATE;
  IF NOT FOUND OR i.participante_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Inscrição não encontrada.';
  END IF;

  IF i.status IN ('aguardando_pagamento', 'lista_espera') THEN
    UPDATE public.inscricoes
       SET status = 'cancelada', cancelado_em = now(), updated_at = now(),
           motivo_cancelamento = 'Desinscrição solicitada pelo aluno'
     WHERE id = i.id;
    RETURN 'desinscricao';
  END IF;

  IF i.status <> 'confirmada' THEN
    RAISE EXCEPTION 'Esta inscrição não pode ser cancelada.';
  END IF;

  SELECT max(p.pago_em) INTO v_pago_em
    FROM public.pagamentos p
   WHERE p.inscricao_id = i.id
     AND p.status = 'aprovado'
     AND COALESCE(p.tipo, 'inscricao') = 'inscricao';

  -- Sem pagamento aprovado: desinscrição.
  IF v_pago_em IS NULL THEN
    UPDATE public.inscricoes
       SET status = 'cancelada', cancelado_em = now(), updated_at = now(),
           motivo_cancelamento = 'Desinscrição solicitada pelo aluno'
     WHERE id = i.id;
    RETURN 'desinscricao';
  END IF;

  -- Com pagamento aprovado: desistência só nos 5 dias após a aprovação.
  IF v_pago_em < now() - interval '5 days' THEN
    RAISE EXCEPTION 'O prazo de 5 dias para desistência encerrou. Fale com a ADM pelo Fale com ADM.';
  END IF;

  UPDATE public.inscricoes
     SET status = 'cancelada', cancelado_em = now(), updated_at = now(),
         motivo_cancelamento = 'Desistência solicitada pelo aluno (pagamento aprovado)'
   WHERE id = i.id;

  UPDATE public.pagamentos
     SET cancelamento_motivo = 'Desistência do aluno. Devolver o valor pago.'
   WHERE inscricao_id = i.id AND status = 'aprovado';

  INSERT INTO public.notificacoes_app (destinatario, titulo, mensagem, link)
  VALUES ('admin', 'Desistência com pagamento aprovado',
          'Um aluno desistiu de uma inscrição paga. Devolver o valor pago.',
          '/admin/inscricoes');

  RETURN 'desistencia';
END;
$$;

REVOKE ALL ON FUNCTION public.aluno_cancelar_inscricao(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aluno_cancelar_inscricao(uuid) TO authenticated;

-- ============================================================
-- 2) Admin: lixeira e arquivo de inscrições canceladas pelo aluno
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_gerenciar_inscricao_lixeira(p_inscricao_id uuid, p_acao text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i public.inscricoes%ROWTYPE;
BEGIN
  IF NOT public.admin_tem_permissao(auth.uid(), 'inscricoes') THEN
    RAISE EXCEPTION 'Sem permissão para esta ação.';
  END IF;

  SELECT * INTO i FROM public.inscricoes WHERE id = p_inscricao_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inscrição não encontrada.';
  END IF;

  CASE p_acao
    WHEN 'lixeira' THEN
      IF i.status <> 'cancelada'
         OR NOT (COALESCE(i.motivo_cancelamento, '') LIKE 'Desinscrição solicitada pelo aluno%'
                 OR COALESCE(i.motivo_cancelamento, '') LIKE 'Desistência solicitada pelo aluno%') THEN
        RAISE EXCEPTION 'Só vão para a lixeira as inscrições canceladas pelo aluno.';
      END IF;
      UPDATE public.inscricoes SET excluida_em = now() WHERE id = i.id;

    WHEN 'restaurar' THEN
      UPDATE public.inscricoes SET excluida_em = NULL, arquivada_em = NULL WHERE id = i.id;

    WHEN 'arquivar' THEN
      IF i.excluida_em IS NULL THEN
        RAISE EXCEPTION 'Envie a inscrição para a lixeira antes de arquivar.';
      END IF;
      UPDATE public.inscricoes SET arquivada_em = now() WHERE id = i.id;

    WHEN 'desarquivar' THEN
      UPDATE public.inscricoes SET arquivada_em = NULL WHERE id = i.id;

    ELSE
      RAISE EXCEPTION 'Ação inválida.';
  END CASE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_gerenciar_inscricao_lixeira(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_gerenciar_inscricao_lixeira(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
