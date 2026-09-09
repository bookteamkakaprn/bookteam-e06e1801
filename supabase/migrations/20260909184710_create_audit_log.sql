-- Tabela de auditoria para registrar edições de pagamentos e inscrições
-- Preserva histórico de todas as alterações feitas pelos admins

CREATE TABLE public.audit_log (
  id              uuid primary key default gen_random_uuid(),
  tabela          text not null,  -- 'pagamentos' ou 'inscricoes'
  registro_id     uuid not null,
  usuario_id      uuid not null references auth.users(id) on delete set null,
  status_anterior text,
  status_novo     text not null,
  motivo          text,           -- motivo da recusa/rejeição/cancelamento
  dados_anteriores jsonb,         -- snapshot dos dados antes
  dados_novos     jsonb,          -- snapshot dos dados depois
  criado_em       timestamptz not null default now(),
  
  -- Índices para performance
  constraint audit_log_tabela_check check (tabela in ('pagamentos', 'inscricoes'))
);

CREATE INDEX IF NOT EXISTS audit_log_registro_idx
  ON public.audit_log(tabela, registro_id);
CREATE INDEX IF NOT EXISTS audit_log_usuario_idx
  ON public.audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS audit_log_criado_em_idx
  ON public.audit_log(criado_em);

-- Permissões
GRANT SELECT ON public.audit_log TO authenticated;
GRANT INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

-- RLS para audit_log (admin consegue ver, aluno consegue ver seus próprios históricos)
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_admin_view ON public.audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
