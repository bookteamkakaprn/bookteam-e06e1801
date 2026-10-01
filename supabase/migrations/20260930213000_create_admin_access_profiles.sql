-- Perfis de acesso configuráveis do painel administrativo
CREATE TABLE IF NOT EXISTS public.admin_perfis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  permissoes text[] NOT NULL DEFAULT '{}',
  ativo boolean NOT NULL DEFAULT true,
  sistema boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_usuario_perfis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_id uuid NOT NULL REFERENCES public.admin_perfis(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_usuario_perfis_user_id
  ON public.admin_usuario_perfis(user_id);

CREATE OR REPLACE FUNCTION public.admin_tem_permissao(_user_id uuid, _permissao text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_usuario_perfis up
    JOIN public.admin_perfis p ON p.id = up.perfil_id
    WHERE up.user_id = _user_id
      AND p.ativo = true
      AND _permissao = ANY(p.permissoes)
  );
$$;

ALTER TABLE public.admin_perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_usuario_perfis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_perfis_select ON public.admin_perfis;
CREATE POLICY admin_perfis_select ON public.admin_perfis FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.admin_usuario_perfis up
      WHERE up.user_id = auth.uid() AND up.perfil_id = admin_perfis.id
    )
  );

DROP POLICY IF EXISTS admin_perfis_admin_all ON public.admin_perfis;
CREATE POLICY admin_perfis_admin_all ON public.admin_perfis FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS admin_usuario_perfis_self_select ON public.admin_usuario_perfis;
CREATE POLICY admin_usuario_perfis_self_select ON public.admin_usuario_perfis FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS admin_usuario_perfis_admin_all ON public.admin_usuario_perfis;
CREATE POLICY admin_usuario_perfis_admin_all ON public.admin_usuario_perfis FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.admin_perfis TO authenticated;
GRANT SELECT ON public.admin_usuario_perfis TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_tem_permissao(uuid, text) TO authenticated;

INSERT INTO public.admin_perfis (nome, descricao, permissoes, sistema)
VALUES
  ('Administrador', 'Acesso completo ao painel administrativo.', ARRAY[
    'visao_geral','participantes','inscricoes','cursos','turmas','materiais',
    'pedido_materiais','presencas','eventos','calendario','pagamentos',
    'configuracoes','fale_com_adm','tutorial','perfis'
  ], true),
  ('Coordenadora', 'Gestão de alunos, turmas, materiais e rotina acadêmica.', ARRAY[
    'visao_geral','participantes','turmas','materiais','presencas','eventos',
    'calendario','pedido_materiais','fale_com_adm'
  ], true),
  ('Pedagoga', 'Acesso pedagógico para acompanhar alunos, turmas, materiais e presença.', ARRAY[
    'visao_geral','participantes','turmas','materiais','presencas','calendario',
    'fale_com_adm'
  ], true),
  ('Aluno', 'Perfil de aluno. Não possui acesso administrativo por padrão.', ARRAY[]::text[], true)
ON CONFLICT (nome) DO NOTHING;