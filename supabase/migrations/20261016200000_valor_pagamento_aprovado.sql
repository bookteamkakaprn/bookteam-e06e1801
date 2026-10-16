-- Valor do pagamento aprovado.
-- Pagamentos criados quando a turma ainda não tinha valor ficaram com R$ 0,00.
-- 1) Preenche os pagamentos zerados com o valor atual da turma.
-- 2) A aprovação pelo admin também grava o valor da turma se o pagamento estiver zerado.

UPDATE public.pagamentos p
   SET valor = t.valor
  FROM public.inscricoes i
  JOIN public.turmas t ON t.id = i.turma_id
 WHERE p.inscricao_id = i.id
   AND COALESCE(p.valor, 0) = 0
   AND COALESCE(t.valor, 0) > 0;

CREATE OR REPLACE FUNCTION public.admin_aprovar_pagamento(p_pagamento_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inscricao_id uuid;
  v_turma_id uuid;
  v_status_atual public.inscricao_status;
  v_vagas_max integer;
  v_novo_status public.inscricao_status;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Sem permissão para aprovar pagamentos.';
  END IF;

  UPDATE public.pagamentos
     SET status = 'aprovado', pago_em = now(), observacao = NULL
   WHERE id = p_pagamento_id
  RETURNING inscricao_id INTO v_inscricao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado.';
  END IF;

  -- Grava o valor do curso se o pagamento foi criado zerado.
  UPDATE public.pagamentos p
     SET valor = t.valor
    FROM public.inscricoes i
    JOIN public.turmas t ON t.id = i.turma_id
   WHERE p.id = p_pagamento_id
     AND i.id = p.inscricao_id
     AND COALESCE(p.valor, 0) = 0
     AND COALESCE(t.valor, 0) > 0;

  SELECT i.turma_id, i.status INTO v_turma_id, v_status_atual
    FROM public.inscricoes i
   WHERE i.id = v_inscricao_id
   FOR UPDATE;

  IF v_status_atual = 'confirmada' THEN
    RETURN 'confirmada';
  END IF;

  IF v_turma_id IS NULL THEN
    UPDATE public.inscricoes SET status = 'confirmada' WHERE id = v_inscricao_id;
    RETURN 'confirmada';
  END IF;

  SELECT t.vagas_max INTO v_vagas_max
    FROM public.turmas t
   WHERE t.id = v_turma_id
   FOR UPDATE;

  IF COALESCE(v_vagas_max, 0) > 0
     AND public.vagas_ocupadas(v_turma_id, v_inscricao_id) >= v_vagas_max THEN
    v_novo_status := 'lista_espera';
  ELSE
    v_novo_status := 'confirmada';
  END IF;

  UPDATE public.inscricoes
     SET status = v_novo_status, reserva_ate = NULL
   WHERE id = v_inscricao_id;

  RETURN v_novo_status::text;
END;
$$;

NOTIFY pgrst, 'reload schema';
