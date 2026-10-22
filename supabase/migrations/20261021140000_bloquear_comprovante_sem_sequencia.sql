-- Impede o aluno de enviar (ou reenviar) comprovante de um curso da Jornada
-- sem ter concluído os livros anteriores no histórico.
-- Cobre inscrições criadas antes da regra de sequência, que o gatilho de criação não verifica.
-- O admin continua podendo aprovar (liberação fora de ordem).

CREATE OR REPLACE FUNCTION public.checar_prerequisito_comprovante()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participante_id uuid;
  v_livro_id uuid;
BEGIN
  IF NEW.comprovante_url IS NOT DISTINCT FROM OLD.comprovante_url THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.admin_tem_permissao(auth.uid(), 'inscricoes') THEN
    RETURN NEW;
  END IF;

  SELECT i.participante_id, COALESCE(t.livro_id, i.livro_id)
    INTO v_participante_id, v_livro_id
    FROM public.inscricoes i
    LEFT JOIN public.turmas t ON t.id = i.turma_id
   WHERE i.id = NEW.inscricao_id;

  -- Só bloqueia o próprio aluno enviando.
  IF v_participante_id IS DISTINCT FROM auth.uid() THEN
    RETURN NEW;
  END IF;

  IF v_livro_id IS NOT NULL AND NOT public.aluno_cumpriu_prerequisito(v_participante_id, v_livro_id) THEN
    RAISE EXCEPTION 'Você ainda não concluiu os cursos anteriores da Jornada exigidos por este curso. Registre-os no seu histórico antes de enviar o comprovante.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.checar_prerequisito_comprovante() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_checar_prerequisito_comprovante ON public.pagamentos;
CREATE TRIGGER trg_checar_prerequisito_comprovante
BEFORE UPDATE OF comprovante_url ON public.pagamentos
FOR EACH ROW EXECUTE FUNCTION public.checar_prerequisito_comprovante();

NOTIFY pgrst, 'reload schema';
