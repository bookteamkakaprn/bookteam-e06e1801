-- Adiciona a permissão de Tarefas aos perfis administrativos pedagógicos existentes.
UPDATE public.admin_perfis
SET permissoes = CASE
  WHEN 'tarefas' = ANY(permissoes) THEN permissoes
  ELSE array_append(permissoes, 'tarefas')
END,
updated_at = now()
WHERE nome IN ('Coordenadora', 'Pedagoga');