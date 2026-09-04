-- Permite que um administrador altere o perfil de acesso de outros usuários.
-- O cadastro normal continua criando automaticamente a role participante.

CREATE POLICY "user_roles_admin_insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_admin_delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND NOT (user_id = auth.uid() AND role = 'admin')
    AND (
      role <> 'admin'
      OR (SELECT count(*) FROM public.user_roles WHERE role = 'admin') > 1
    )
  );
