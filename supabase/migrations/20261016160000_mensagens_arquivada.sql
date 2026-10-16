-- ============================================================
-- Migração: arquivar conversas do Fale com ADM (Book Team)
-- Arquivo: supabase/migrations/20261016160000_mensagens_arquivada.sql
--
-- Adiciona a marcação "arquivada" em cada mensagem. Uma conversa é
-- considerada arquivada quando todas as suas mensagens estão arquivadas.
-- Não remove nem altera mensagens existentes.
-- ============================================================

ALTER TABLE public.mensagens_admin
  ADD COLUMN IF NOT EXISTS arquivada boolean NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
