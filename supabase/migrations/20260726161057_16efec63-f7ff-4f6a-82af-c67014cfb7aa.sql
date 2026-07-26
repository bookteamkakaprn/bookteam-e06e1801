CREATE TABLE IF NOT EXISTS public.turmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livro_id uuid NOT NULL REFERENCES public.livros(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ano integer,
  temporada text,
  data_inicio date,
  data_fim date,
  horario text,
  professor text,
  coordenador text,
  staff text,
  sala text,
  valor numeric(10,2),
  vagas_max integer NOT NULL DEFAULT 0,
  inscritos integer NOT NULL DEFAULT 0,
  vagas_restantes integer GENERATED ALWAYS AS (GREATEST(vagas_max - inscritos, 0)) STORED,
  status text NOT NULL DEFAULT 'aberta',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS turmas_livro_idx ON public.turmas(livro_id);

GRANT SELECT ON public.turmas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.turmas TO authenticated;
GRANT ALL ON public.turmas TO service_role;

ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "turmas_public_read" ON public.turmas
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "turmas_admin_write" ON public.turmas
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_turmas_updated_at BEFORE UPDATE ON public.turmas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.inscricoes
  ADD COLUMN IF NOT EXISTS turma_id uuid REFERENCES public.turmas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS inscricoes_turma_idx ON public.inscricoes(turma_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname = 'inscricao_status' AND e.enumlabel = 'lista_espera'
  ) THEN
    ALTER TYPE public.inscricao_status ADD VALUE 'lista_espera';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_turma_inscritos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turma uuid;
BEGIN
  FOREACH v_turma IN ARRAY ARRAY[NEW.turma_id, OLD.turma_id] LOOP
    IF v_turma IS NOT NULL THEN
      UPDATE public.turmas t
         SET inscritos = (
               SELECT count(*) FROM public.inscricoes i
                WHERE i.turma_id = t.id AND i.status = 'confirmada'
             ),
             updated_at = now()
       WHERE t.id = v_turma;
    END IF;
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_turma_inscritos() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_turma_inscritos ON public.inscricoes;
CREATE TRIGGER trg_sync_turma_inscritos
AFTER INSERT OR UPDATE OF status, turma_id OR DELETE ON public.inscricoes
FOR EACH ROW EXECUTE FUNCTION public.sync_turma_inscritos();