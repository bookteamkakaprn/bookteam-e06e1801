-- MIGRATION: Adicionar campo comprovante_enviado_em em pagamentos
-- Data: 09/09/2026
-- Descrição: Registrar timestamp de quando o aluno enviou o comprovante

-- Se coluna não existe, adicionar
ALTER TABLE public.pagamentos
ADD COLUMN IF NOT EXISTS comprovante_enviado_em TIMESTAMPTZ;

-- Comentário
COMMENT ON COLUMN public.pagamentos.comprovante_enviado_em IS 'Data/hora de quando o aluno enviou o comprovante de pagamento';

-- Criar bucket de armazenamento se não existir
-- (Este comando será executado no painel da aplicação)

-- Criar índice para queries rápidas
CREATE INDEX IF NOT EXISTS idx_pagamentos_comprovante_enviado_em 
ON public.pagamentos(comprovante_enviado_em DESC);

-- Garantir que RLS policy existe para alunos
-- Aluno só pode ver seus próprios pagamentos
DROP POLICY IF EXISTS "alunos_ver_pagamentos" ON public.pagamentos;
CREATE POLICY "alunos_ver_pagamentos"
ON public.pagamentos
FOR SELECT
TO authenticated
USING (
  inscricao_id IN (
    SELECT id FROM public.inscricoes 
    WHERE participante_id = auth.uid()
  )
);

-- Aluno só pode atualizar comprovante_url e comprovante_enviado_em
DROP POLICY IF EXISTS "alunos_atualizar_comprovante" ON public.pagamentos;
CREATE POLICY "alunos_atualizar_comprovante"
ON public.pagamentos
FOR UPDATE
TO authenticated
USING (
  inscricao_id IN (
    SELECT id FROM public.inscricoes 
    WHERE participante_id = auth.uid()
  )
  AND status = 'aguardando'
)
WITH CHECK (
  inscricao_id IN (
    SELECT id FROM public.inscricoes 
    WHERE participante_id = auth.uid()
  )
);

