-- Migration: Fix historico_livros table structure
-- Date: 2026-09-09
-- Description: Garante que historico_livros tem as colunas necessárias

-- Ensure table exists with proper structure
CREATE TABLE IF NOT EXISTS public.historico_livros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participante_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  livro_id UUID NOT NULL REFERENCES public.livros(id) ON DELETE CASCADE,
  data_conclusao DATE NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participante_id, livro_id)
);

-- Add columns if they don't exist
ALTER TABLE public.historico_livros
ADD COLUMN IF NOT EXISTS data_conclusao DATE,
ADD COLUMN IF NOT EXISTS observacao TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_historico_livros_participante ON public.historico_livros(participante_id);
CREATE INDEX IF NOT EXISTS idx_historico_livros_livro ON public.historico_livros(livro_id);
CREATE INDEX IF NOT EXISTS idx_historico_livros_data_conclusao ON public.historico_livros(data_conclusao);

-- Enable RLS if not already enabled
ALTER TABLE public.historico_livros ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
CREATE POLICY IF NOT EXISTS "Users can view own history" ON public.historico_livros
  FOR SELECT USING (auth.uid() = participante_id);

CREATE POLICY IF NOT EXISTS "Users can insert own history" ON public.historico_livros
  FOR INSERT WITH CHECK (auth.uid() = participante_id);

CREATE POLICY IF NOT EXISTS "Users can delete own history" ON public.historico_livros
  FOR DELETE USING (auth.uid() = participante_id);

-- Comment columns
COMMENT ON COLUMN public.historico_livros.data_conclusao IS 'Data em que o aluno concluiu o livro (retroativa)';
COMMENT ON COLUMN public.historico_livros.observacao IS 'Notas do aluno sobre a conclusão (turma, professor, local, etc.)';
