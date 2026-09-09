-- Migration: Add arquivado column to pagamentos table
-- Date: 2026-09-09
-- Description: Permite que alunos arquivem comprovantes de pagamento

-- Check if column exists, if not add it
ALTER TABLE public.pagamentos
ADD COLUMN IF NOT EXISTS arquivado BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN public.pagamentos.arquivado IS 'Indica se o comprovante foi arquivado pelo aluno (view-only)';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_pagamentos_arquivado ON public.pagamentos(arquivado);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status_arquivado ON public.pagamentos(status, arquivado);
