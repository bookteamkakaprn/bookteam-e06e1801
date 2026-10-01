create or replace function public.admin_controle_pagamentos()
returns table (
  id uuid,
  status text,
  valor numeric,
  created_at timestamptz,
  evento_id uuid,
  inscricao_id uuid,
  inscricao_status text,
  livro_id uuid,
  curso text,
  participante_id uuid,
  nome text,
  email text,
  data_nascimento date
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_tem_permissao(auth.uid(), 'pagamentos') then
    raise exception 'Sem permissão para visualizar pagamentos';
  end if;

  return query
  select
    p.id,
    p.status::text,
    p.valor,
    p.created_at,
    i.evento_id,
    p.inscricao_id,
    i.status::text as inscricao_status,
    i.livro_id,
    l.titulo as curso,
    i.participante_id,
    pa.nome,
    pa.email,
    pa.data_nascimento
  from public.pagamentos p
  left join public.inscricoes i on i.id = p.inscricao_id
  left join public.livros l on l.id = i.livro_id
  left join public.participantes pa on pa.id = i.participante_id
  order by p.created_at desc;
end;
$$;

grant execute on function public.admin_controle_pagamentos() to authenticated;
