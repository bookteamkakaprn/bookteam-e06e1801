-- Adicionar campos para resposta do aluno a recusa de pagamento
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS comprovante_resubmissao_url TEXT;
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS resposta_aluno TEXT;
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS data_resubmissao TIMESTAMP;
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS status_resubmissao VARCHAR(50); -- 'aguardando', 'aprovada', 'rejeitada'

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pagamentos_status_resubmissao ON pagamentos(status_resubmissao);
