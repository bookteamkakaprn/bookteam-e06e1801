-- Criar tabela de presencas
CREATE TABLE IF NOT EXISTS presencas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id UUID NOT NULL UNIQUE REFERENCES inscricoes(id) ON DELETE CASCADE,
  presente BOOLEAN DEFAULT FALSE,
  horario_checkin TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_presencas_inscricao_id ON presencas(inscricao_id);
CREATE INDEX IF NOT EXISTS idx_presencas_presente ON presencas(presente);
