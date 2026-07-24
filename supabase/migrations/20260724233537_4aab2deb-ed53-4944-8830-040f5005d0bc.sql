
-- 1) Move has_role() to a private (non-API-exposed) schema
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2) Recreate all policies that referenced public.has_role to use private.has_role
DROP POLICY IF EXISTS user_roles_self_select ON public.user_roles;
CREATE POLICY user_roles_self_select ON public.user_roles FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS participantes_self_select ON public.participantes;
CREATE POLICY participantes_self_select ON public.participantes FOR SELECT TO authenticated
  USING ((id = auth.uid()) OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS participantes_self_update ON public.participantes;
CREATE POLICY participantes_self_update ON public.participantes FOR UPDATE TO authenticated
  USING ((id = auth.uid()) OR private.has_role(auth.uid(), 'admin'))
  WITH CHECK ((id = auth.uid()) OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS participantes_admin_insert ON public.participantes;
CREATE POLICY participantes_admin_insert ON public.participantes FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS trilhas_admin_write ON public.trilhas;
CREATE POLICY trilhas_admin_write ON public.trilhas FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS livros_admin_write ON public.livros;
CREATE POLICY livros_admin_write ON public.livros FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS materiais_admin_write ON public.materiais;
CREATE POLICY materiais_admin_write ON public.materiais FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS eventos_admin_write ON public.eventos;
CREATE POLICY eventos_admin_write ON public.eventos FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS inscricoes_self_select ON public.inscricoes;
CREATE POLICY inscricoes_self_select ON public.inscricoes FOR SELECT TO authenticated
  USING ((participante_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS inscricoes_admin_update ON public.inscricoes;
CREATE POLICY inscricoes_admin_update ON public.inscricoes FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS inscricoes_admin_delete ON public.inscricoes;
CREATE POLICY inscricoes_admin_delete ON public.inscricoes FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR (participante_id = auth.uid()));

DROP POLICY IF EXISTS pagamentos_self_select ON public.pagamentos;
CREATE POLICY pagamentos_self_select ON public.pagamentos FOR SELECT TO authenticated
  USING ((participante_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS pagamentos_admin_update ON public.pagamentos;
CREATE POLICY pagamentos_admin_update ON public.pagamentos FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS presencas_self_select ON public.presencas;
CREATE POLICY presencas_self_select ON public.presencas FOR SELECT TO authenticated
  USING ((participante_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS presencas_admin_write ON public.presencas;
CREATE POLICY presencas_admin_write ON public.presencas FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS certificados_self_select ON public.certificados;
CREATE POLICY certificados_self_select ON public.certificados FOR SELECT TO authenticated
  USING ((participante_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS certificados_admin_write ON public.certificados;
CREATE POLICY certificados_admin_write ON public.certificados FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS observacoes_admin_all ON public.observacoes;
CREATE POLICY observacoes_admin_all ON public.observacoes FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS notificacoes_self_select ON public.notificacoes;
CREATE POLICY notificacoes_self_select ON public.notificacoes FOR SELECT TO authenticated
  USING ((participante_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS notificacoes_admin_write ON public.notificacoes;
CREATE POLICY notificacoes_admin_write ON public.notificacoes FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- Storage policies referencing has_role
DROP POLICY IF EXISTS comprovantes_owner_select ON storage.objects;
CREATE POLICY comprovantes_owner_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'comprovantes' AND (((storage.foldername(name))[1] = (auth.uid())::text) OR private.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS comprovantes_admin_all ON storage.objects;
CREATE POLICY comprovantes_admin_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'comprovantes' AND private.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'comprovantes' AND private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS certificados_owner_select ON storage.objects;
CREATE POLICY certificados_owner_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'certificados' AND (((storage.foldername(name))[1] = (auth.uid())::text) OR private.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS certificados_admin_write ON storage.objects;
CREATE POLICY certificados_admin_write ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'certificados' AND private.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'certificados' AND private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS materiais_admin_write ON storage.objects;
CREATE POLICY materiais_admin_write ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'materiais' AND private.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'materiais' AND private.has_role(auth.uid(), 'admin'));

-- 3) Drop the now-unused public.has_role (exposed via API)
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 4) Tighten "perfil" bucket SELECT: owner folder or admin
DROP POLICY IF EXISTS perfil_auth_select ON storage.objects;
CREATE POLICY perfil_owner_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'perfil'
    AND (
      ((storage.foldername(name))[1] = (auth.uid())::text)
      OR private.has_role(auth.uid(), 'admin')
    )
  );

-- 5) Tighten "materiais" bucket SELECT: admins only (content is admin-managed)
DROP POLICY IF EXISTS materiais_auth_select ON storage.objects;
CREATE POLICY materiais_admin_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'materiais'
    AND private.has_role(auth.uid(), 'admin')
  );

-- 6) Reinforce "observacoes" as admin-only with an explicit RESTRICTIVE policy
CREATE POLICY observacoes_admin_only_restrictive ON public.observacoes
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.observacoes IS 'Internal admin-only notes about participants. Never exposed to non-admin users.';
