CREATE OR REPLACE FUNCTION public.sync_livro_inscritos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_livro uuid;
begin
  v_livro := coalesce(new.livro_id, old.livro_id);
  if v_livro is null then
    return coalesce(new, old);
  end if;

  update public.livros l
     set inscritos = (
       select count(*)
       from public.inscricoes i
       where i.livro_id = v_livro
         and i.status = 'confirmada'
     ),
     updated_at = now()
   where l.id = v_livro;

  return coalesce(new, old);
end;
$function$;
