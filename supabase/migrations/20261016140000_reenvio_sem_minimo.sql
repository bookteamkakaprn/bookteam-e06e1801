-- ============================================================
-- Migração: reenvio de comprovante sem comentário mínimo (Book Team)
-- Arquivo: supabase/migrations/20261016140000_reenvio_sem_minimo.sql
--
-- Remove a exigência de pelo menos 10 caracteres no reenvio.
-- Recria aluno_enviar_comprovante() com a mesma segurança da versão anterior
-- (dono do pagamento, caminho na pasta do usuário, bloqueio de pagamento aprovado).
-- ============================================================

-- ============================================================
-- Migração: envio/reenvio de comprovante pelo aluno (Book Team)
-- Arquivo sugerido: supabase/migrations/20261015190000_aluno_enviar_comprovante.sql
--
-- NÃO aplicar em produção sem revisão. Testar antes em branch do Supabase.
--
-- O que faz:
--   1. Adiciona data_resubmissao em pagamentos (ausente em produção).
--   2. Cria a função aluno_enviar_comprovante(), que é a única forma de o
--      aluno alterar um pagamento. Ela:
--        - confere se o pagamento pertence a uma inscrição do usuário logado;
--        - confere se o caminho do arquivo está dentro da pasta do usuário;
--        - trata envio inicial (status 'aguardando') e reenvio (status 'rejeitado');
--        - bloqueia alteração de pagamento já aprovado;
--        - altera apenas comprovante_url, status, resposta_aluno,
--          data_resubmissao e comprovante_enviado_em.
--
-- Por que não uma policy de UPDATE para o aluno em pagamentos:
--   RLS não restringe colunas. Uma policy de UPDATE permitiria ao aluno
--   alterar valor ou status (ex.: marcar como 'aprovado').
-- ============================================================

-- 1) Coluna ausente em produção
ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS data_resubmissao timestamptz;

-- 2) Função de envio/reenvio pelo aluno
CREATE OR REPLACE FUNCTION public.aluno_enviar_comprovante(
  p_pagamento_id uuid,
  p_caminho      text,
  p_resposta     text DEFAULT NULL
)
RETURNS public.pagamentos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pag public.pagamentos;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sua sessão expirou. Entre novamente.';
  END IF;

  -- O arquivo precisa estar na pasta do próprio usuário: "{uid}/..."
  IF p_caminho IS NULL OR left(p_caminho, length(v_uid::text) + 1) <> v_uid::text || '/' THEN
    RAISE EXCEPTION 'Caminho do comprovante inválido.';
  END IF;

  -- Pagamento precisa pertencer a uma inscrição do usuário
  SELECT p.*
    INTO v_pag
    FROM public.pagamentos p
    JOIN public.inscricoes i ON i.id = p.inscricao_id
   WHERE p.id = p_pagamento_id
     AND i.participante_id = v_uid
   FOR UPDATE OF p;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado ou sem permissão.';
  END IF;

  IF v_pag.status = 'aprovado' THEN
    RAISE EXCEPTION 'Este pagamento já foi aprovado e não pode ser alterado.';
  END IF;

  IF v_pag.status = 'rejeitado' THEN
    -- Reenvio após recusa: exige justificativa
    UPDATE public.pagamentos
       SET comprovante_url        = p_caminho,
           comprovante_enviado_em = now(),
           resposta_aluno         = NULLIF(trim(p_resposta), ''),
           data_resubmissao       = now(),
           status                 = 'aguardando',
           observacao             = NULL
     WHERE id = p_pagamento_id
    RETURNING * INTO v_pag;
  ELSE
    -- Envio inicial (status 'aguardando')
    UPDATE public.pagamentos
       SET comprovante_url        = p_caminho,
           comprovante_enviado_em = now(),
           status                 = 'aguardando'
     WHERE id = p_pagamento_id
    RETURNING * INTO v_pag;
  END IF;

  RETURN v_pag;
END;
$$;

REVOKE ALL ON FUNCTION public.aluno_enviar_comprovante(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aluno_enviar_comprovante(uuid, text, text) TO authenticated;

-- 3) Recarregar o cache do PostgREST para a função e a coluna novas
NOTIFY pgrst, 'reload schema';
