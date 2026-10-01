create or replace function public.admin_visualizacao_inscritos_turma(p_turma_id uuid)
returns table (
  id uuid,
  status text,
  livro_disponibilizado boolean,
  participante_id uuid,
  nome text,
  email text,
  telefone text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.admin_tem_permissao(auth.uid(), 'visualizacao_turmas') then
    raise exception 'Sem permissão para visualizar inscritos.';
  end if;

  return query
  select i.id, i.status::text, i.livro_disponibilizado, i.participante_id,
         p.nome, p.email, p.telefone
  from public.inscricoes i
  left join public.participantes p on p.id = i.participante_id
  where i.turma_id = p_turma_id
  order by i.created_at;
end;
$$;

grant execute on function public.admin_visualizacao_inscritos_turma(uuid) to authenticated;
