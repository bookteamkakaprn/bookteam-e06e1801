CREATE OR REPLACE FUNCTION public.notificar_pagamento_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_participante_id uuid;
  v_livro text;
begin
  select i.participante_id, l.titulo
    into v_participante_id, v_livro
  from public.inscricoes i
  left join public.livros l on l.id = i.livro_id
  where i.id = new.inscricao_id;

  if v_participante_id is null then
    return new;
  end if;

  if new.status = 'aprovado' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    insert into public.notificacoes (participante_id, titulo, mensagem, lida)
    values (
      v_participante_id,
      'Pagamento aprovado',
      'Seu pagamento foi aprovado. Sua inscrição em ' || coalesce(v_livro, 'Book Team') || ' está confirmada e aguarda a liberação para iniciar.',
      false
    );
  elsif new.status = 'rejeitado' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    insert into public.notificacoes (participante_id, titulo, mensagem, lida)
    values (
      v_participante_id,
      'Pagamento não aprovado',
      'Seu pagamento não foi aprovado. Acesse sua área do aluno para verificar e regularizar o pagamento.',
      false
    );
  end if;
  return new;
end;
$function$;
