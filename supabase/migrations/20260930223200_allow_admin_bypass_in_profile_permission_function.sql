CREATE OR REPLACE FUNCTION public.admin_tem_permissao(_user_id uuid, _permissao text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM public.admin_usuario_perfis up
    JOIN public.admin_perfis p ON p.id = up.perfil_id
    WHERE up.user_id = _user_id
      AND p.ativo = true
      AND _permissao = ANY(p.permissoes)
  );
$$;
GRANT EXECUTE ON FUNCTION public.admin_tem_permissao(uuid, text) TO authenticated;