CREATE OR REPLACE FUNCTION public.sync_turma_inscritos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turmas uuid[] := ARRAY[]::uuid[];
  v_turma uuid;
BEGIN
  IF TG_OP <> 'DELETE' AND NEW.turma_id IS NOT NULL THEN
    v_turmas := array_append(v_turmas, NEW.turma_id);
  END IF;
  IF TG_OP <> 'INSERT' AND OLD.turma_id IS NOT NULL THEN
    v_turmas := array_append(v_turmas, OLD.turma_id);
  END IF;

  FOREACH v_turma IN ARRAY v_turmas LOOP
    UPDATE public.turmas t
       SET inscritos = (
             SELECT count(*) FROM public.inscricoes i
              WHERE i.turma_id = t.id AND i.status = 'confirmada'
           ),
           updated_at = now()
     WHERE t.id = v_turma;
  END LOOP;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_turma_inscritos() FROM PUBLIC, anon, authenticated;