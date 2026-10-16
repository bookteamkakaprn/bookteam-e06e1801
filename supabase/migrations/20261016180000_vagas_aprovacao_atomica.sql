-- Vagas: reserva ao enviar comprovante, prazos e lista de espera.
--
-- Regras:
--  * Comprovante enviado (pré-inscrito): a vaga fica reservada por 48h, enquanto o admin analisa.
--  * Turma já cheia no envio do comprovante: a inscrição vai direto para lista de espera.
--  * Pagamento rejeitado: a vaga segue reservada por 6h para o reenvio.
--  * Prazo vencido sem análise ou sem reenvio: a inscrição vai para lista de espera e a vaga é liberada.
--  * Pagamento aprovado e inscrição confirmada pelo admin: vaga definitiva.
--
-- Funções do admin travam a turma (FOR UPDATE) para que aprovações simultâneas
-- não passem do limite de vagas.

-- 1) Prazo da reserva da vaga
ALTER TABLE public.inscricoes
  ADD COLUMN IF NOT EXISTS reserva_ate timestamptz;

-- 2) Vagas ocupadas: confirmadas + reservas dentro do prazo
CREATE OR REPLACE FUNCTION public.vagas_ocupadas(p_turma_id uuid, p_excluir_inscricao uuid DEFAULT NULL)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
    FROM public.inscricoes i
   WHERE i.turma_id = p_turma_id
     AND (p_excluir_inscricao IS NULL OR i.id <> p_excluir_inscricao)
     AND (
       i.status = 'confirmada'
       OR (i.status = 'aguardando_pagamento' AND i.reserva_ate > now())
     );
$$;

REVOKE ALL ON FUNCTION public.vagas_ocupadas(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- 3) Contador de inscritos da turma passa a incluir as reservas válidas
CREATE OR REPLACE FUNCTION public.sync_turma_inscritos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turmas uuid[] := ARRAY[]::uuid[];
  v_turma uuid;
BEGIN
  IF TG_OP <> 'DELETE' AND NEW.turma_id IS NOT NULL THEN
    v_turmas := array_append(v_turmas, NEW.turma_id);
  END IF;
  IF TG_OP <> 'INSERT' AND OLD.turma_id IS NOT NULL THEN
    v_turmas := array_append(v_turmas, OLD.turma_id);
  END IF;

  FOREACH v_turma IN ARRAY v_turmas LOOP
    UPDATE public.turmas t
       SET inscritos = public.vagas_ocupadas(t.id, NULL),
           updated_at = now()
     WHERE t.id = v_turma;
  END LOOP;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_turma_inscritos() FROM PUBLIC, anon, authenticated;

-- O contador também precisa ser recalculado quando só o prazo da reserva muda.
DROP TRIGGER IF EXISTS trg_sync_turma_inscritos ON public.inscricoes;
CREATE TRIGGER trg_sync_turma_inscritos
AFTER INSERT OR UPDATE OF status, turma_id, reserva_ate OR DELETE ON public.inscricoes
FOR EACH ROW EXECUTE FUNCTION public.sync_turma_inscritos();

-- 4) Reserva conforme o comprovante e o status do pagamento
CREATE OR REPLACE FUNCTION public.reservar_vaga_por_pagamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turma uuid;
  v_status public.inscricao_status;
  v_vagas_max integer;
BEGIN
  IF NEW.status = 'aprovado' THEN
    UPDATE public.inscricoes SET reserva_ate = NULL WHERE id = NEW.inscricao_id;
    RETURN NEW;
  END IF;

  IF NEW.status = 'rejeitado' THEN
    UPDATE public.inscricoes
       SET reserva_ate = now() + interval '6 hours'
     WHERE id = NEW.inscricao_id AND status = 'aguardando_pagamento';
    RETURN NEW;
  END IF;

  -- Envio ou reenvio de comprovante (status 'aguardando')
  IF NEW.status = 'aguardando' AND NEW.comprovante_url IS NOT NULL
     AND (TG_OP = 'INSERT'
          OR NEW.comprovante_url IS DISTINCT FROM OLD.comprovante_url
          OR NEW.status IS DISTINCT FROM OLD.status) THEN

    SELECT i.turma_id, i.status INTO v_turma, v_status
      FROM public.inscricoes i
     WHERE i.id = NEW.inscricao_id
     FOR UPDATE;

    IF v_status = 'aguardando_pagamento' THEN
      IF v_turma IS NOT NULL THEN
        SELECT t.vagas_max INTO v_vagas_max
          FROM public.turmas t
         WHERE t.id = v_turma
         FOR UPDATE;

        IF COALESCE(v_vagas_max, 0) > 0
           AND public.vagas_ocupadas(v_turma, NEW.inscricao_id) >= v_vagas_max THEN
          UPDATE public.inscricoes
             SET status = 'lista_espera', reserva_ate = NULL
           WHERE id = NEW.inscricao_id;
          RETURN NEW;
        END IF;
      END IF;

      UPDATE public.inscricoes
         SET reserva_ate = now() + interval '48 hours'
       WHERE id = NEW.inscricao_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservar_vaga_por_pagamento ON public.pagamentos;
CREATE TRIGGER trg_reservar_vaga_por_pagamento
AFTER INSERT OR UPDATE ON public.pagamentos
FOR EACH ROW EXECUTE FUNCTION public.reservar_vaga_por_pagamento();

-- 5) Aprovação de pagamento pelo admin
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

-- 6) Confirmação manual da inscrição pelo admin
CREATE OR REPLACE FUNCTION public.admin_confirmar_inscricao(p_inscricao_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turma_id uuid;
  v_vagas_max integer;
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

    -- A própria reserva não conta: a vaga já é desta inscrição.
    IF COALESCE(v_vagas_max, 0) > 0
       AND public.vagas_ocupadas(v_turma_id, p_inscricao_id) >= v_vagas_max THEN
      RAISE EXCEPTION 'Não há vagas disponíveis nesta turma.';
    END IF;
  END IF;

  UPDATE public.inscricoes
     SET status = 'confirmada', reserva_ate = NULL
   WHERE id = p_inscricao_id;

  RETURN 'confirmada';
END;
$$;

-- 7) Expiração: prazo vencido sem análise ou reenvio vai para lista de espera
CREATE OR REPLACE FUNCTION public.expirar_reservas_vagas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
BEGIN
  WITH expiradas AS (
    UPDATE public.inscricoes
       SET status = 'lista_espera', reserva_ate = NULL
     WHERE status = 'aguardando_pagamento'
       AND reserva_ate IS NOT NULL
       AND reserva_ate <= now()
    RETURNING id
  )
  SELECT count(*) INTO v_total FROM expiradas;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.expirar_reservas_vagas() FROM PUBLIC, anon, authenticated;

-- Agendamento a cada 5 minutos (requer a extensão pg_cron no projeto)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expirar-reservas-vagas') THEN
    PERFORM cron.unschedule('expirar-reservas-vagas');
  END IF;
END $$;

SELECT cron.schedule(
  'expirar-reservas-vagas',
  '*/5 * * * *',
  'SELECT public.expirar_reservas_vagas();'
);

-- Permissões das funções chamadas pelo admin
REVOKE ALL ON FUNCTION public.admin_aprovar_pagamento(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_confirmar_inscricao(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_aprovar_pagamento(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_confirmar_inscricao(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
