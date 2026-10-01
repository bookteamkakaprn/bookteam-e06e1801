create or replace function public.entregar_livro_inscricao(
  p_inscricao_id uuid,
  p_observacao text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_livro_id uuid;
  v_turma_id uuid;
  v_entregue boolean;
  v_quantidade integer;
  v_user uuid;
begin
  v_user := auth.uid();

  if v_user is null or not public.admin_tem_permissao(v_user, 'estoque') then
    raise exception 'Sem permissão para entregar livro.';
  end if;

  select livro_id, turma_id, coalesce(livro_disponibilizado, false)
    into v_livro_id, v_turma_id, v_entregue
  from public.inscricoes
  where id = p_inscricao_id
    and status = 'confirmada'
  for update;

  if v_livro_id is null then
    raise exception 'Inscrição confirmada não encontrada.';
  end if;

  if v_entregue then
    return 0;
  end if;

  select coalesce(quantidade, 0)
    into v_quantidade
  from public.estoque_livraria
  where livro_id = v_livro_id
  for update;

  if coalesce(v_quantidade, 0) < 1 then
    raise exception 'Estoque insuficiente para este livro.';
  end if;

  update public.estoque_livraria
  set quantidade = quantidade - 1, updated_at = now()
  where livro_id = v_livro_id;

  update public.inscricoes
  set livro_disponibilizado = true
  where id = p_inscricao_id;

  insert into public.movimentos_estoque_livraria
    (livro_id, turma_id, quantidade, tipo, observacao, created_by)
  values
    (v_livro_id, v_turma_id, 1, 'saida', coalesce(p_observacao, 'Entrega manual de livro ao aluno'), v_user);

  return 1;
end;
$$;

grant execute on function public.entregar_livro_inscricao(uuid, text) to authenticated;
