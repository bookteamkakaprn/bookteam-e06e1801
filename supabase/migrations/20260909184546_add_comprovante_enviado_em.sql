-- Adicionar coluna comprovante_enviado_em na tabela pagamentos
-- Rastreia quando o aluno enviou o comprovante de pagamento

ALTER TABLE public.pagamentos
  ADD COLUMN comprovante_enviado_em timestamptz;

-- Criar índice para melhor performance em queries
CREATE INDEX IF NOT EXISTS pagamentos_comprovante_enviado_em_idx
  ON public.pagamentos(comprovante_enviado_em);
