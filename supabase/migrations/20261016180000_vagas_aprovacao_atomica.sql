-- Aprovação de pagamento e de inscrição com checagem de vagas no banco.
-- A turma é travada (FOR UPDATE) durante a operação, então duas aprovações
-- ao mesmo tempo não ultrapassam o limite de vagas.
--
-- admin_aprovar_pagamento: marca o pagamento como aprovado. Se ainda houver
--   vaga, a inscrição vira "confirmada"; se a turma já lotou, vira "lista_espera".
--   Retorna o status final da inscrição.
-- admin_confirmar_inscricao: confirma a inscrição (pagamento já aprovado).
--   Se a turma lotou, recusa com erro.

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
  v_confirmadas integer;
  v_novo_status public.inscricao_status;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Sem permissão para aprovar pagamentos.';
  END IF;

  UPDATE public.pagamentos
     SET status = 'aprovado',
         pago_em = now(),
         observacao = NULL
   WHERE id = p_pagamento_id
  RETURNING inscricao_id INTO v_inscricao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado.';
  END IF;

  SELECT i.turma_id, i.status
    INTO v_turma_id, v_status_atual
    FROM public.inscricoes i
   WHERE i.id = v_inscricao_id
   FOR UPDATE;

  -- Já confirmada: o pagamento aprovado não muda a vaga.
  IF v_status_atual = 'confirmada' THEN
    RETURN 'confirmada';
  END IF;

  -- Inscrição sem turma (ex.: encontro): não há vaga para checar.
  IF v_turma_id IS NULL THEN
    UPDATE public.inscricoes SET status = 'confirmada' WHERE id = v_inscricao_id;
    RETURN 'confirmada';
  END IF;

  SELECT t.vagas_max INTO v_vagas_max
    FROM public.turmas t
   WHERE t.id = v_turma_id
   FOR UPDATE;

  SELECT count(*) INTO v_confirmadas
    FROM public.inscricoes i
   WHERE i.turma_id = v_turma_id
     AND i.status = 'confirmada'
     AND i.id <> v_inscricao_id;

  IF COALESCE(v_vagas_max, 0) > 0 AND v_confirmadas >= v_vagas_max THEN
    v_novo_status := 'lista_espera';
  ELSE
    v_novo_status := 'confirmada';
  END IF;

  UPDATE public.inscricoes SET status = v_novo_status WHERE id = v_inscricao_id;
  RETURN v_novo_status::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_confirmar_inscricao(p_inscricao_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turma_id uuid;
  v_vagas_max integer;
  v_confirmadas integer;
  v_pago boolean;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Sem permissão para confirmar inscrições.';
  END IF;

  SELECT i.turma_id INTO v_turma_id
    FROM public.inscricoes i
   WHERE i.id = p_inscricao_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inscrição não encontrada.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.pagamentos p
     WHERE p.inscricao_id = p_inscricao_id AND p.status = 'aprovado'
  ) INTO v_pago;

  IF NOT v_pago THEN
    RAISE EXCEPTION 'O pagamento ainda não foi aprovado.';
  END IF;

  IF v_turma_id IS NOT NULL THEN
    SELECT t.vagas_max INTO v_vagas_max
      FROM public.turmas t
     WHERE t.id = v_turma_id
     FOR UPDATE;

    SELECT count(*) INTO v_confirmadas
      FROM public.inscricoes i
     WHERE i.turma_id = v_turma_id
       AND i.status = 'confirmada'
       AND i.id <> p_inscricao_id;

    IF COALESCE(v_vagas_max, 0) > 0 AND v_confirmadas >= v_vagas_max THEN
      RAISE EXCEPTION 'Não há vagas disponíveis nesta turma.';
    END IF;
  END IF;

  UPDATE public.inscricoes SET status = 'confirmada' WHERE id = p_inscricao_id;
  RETURN 'confirmada';
END;
$$;

REVOKE ALL ON FUNCTION public.admin_aprovar_pagamento(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_confirmar_inscricao(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_aprovar_pagamento(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_confirmar_inscricao(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
