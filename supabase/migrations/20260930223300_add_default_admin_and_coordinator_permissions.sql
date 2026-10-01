UPDATE public.admin_perfis
SET permissoes = ARRAY(
  SELECT DISTINCT x
  FROM unnest(permissoes || ARRAY['estoque','visualizacao_turmas']) AS x
),
updated_at = now()
WHERE nome = 'Administrador';

UPDATE public.admin_perfis
SET permissoes = ARRAY(
  SELECT DISTINCT x
  FROM unnest(permissoes || ARRAY['visualizacao_turmas']) AS x
),
updated_at = now()
WHERE nome = 'Coordenadora';