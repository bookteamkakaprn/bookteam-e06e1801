-- ============================================================
-- Migração: registro de remoção de comprovantes (Book Team)
-- Arquivo: supabase/migrations/20261016150000_comprovante_removido_em.sql
--
-- Adiciona a data em que o admin removeu o arquivo do comprovante após o
-- backup manual. Os dados do pagamento (valor, status, datas, aluno) são
-- mantidos. Não altera dados existentes.
--
-- A permissão de admin para remover arquivos do bucket "comprovantes" já
-- existe na política comprovantes_admin_all.
-- ============================================================

ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS comprovante_removido_em timestamptz;

NOTIFY pgrst, 'reload schema';
