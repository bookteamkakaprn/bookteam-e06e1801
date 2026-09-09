-- Adicionar campos para rastrear rejeição e cancelamento de inscrições

ALTER TABLE public.inscricoes
  ADD COLUMN motivo_rejeicao text,
  ADD COLUMN motivo_cancelamento text,
  ADD COLUMN cancelado_em timestamptz;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS inscricoes_cancelado_em_idx
  ON public.inscricoes(cancelado_em);
