ALTER TABLE public.participantes
  ADD COLUMN IF NOT EXISTS nascimento date,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS igreja text,
  ADD COLUMN IF NOT EXISTS como_conheceu text;

ALTER TABLE public.inscricoes
  ADD COLUMN IF NOT EXISTS codigo text;

CREATE OR REPLACE FUNCTION public.set_inscricao_codigo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.codigo IS NULL THEN
    NEW.codigo := 'BT-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 6));
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_inscricao_codigo() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_set_inscricao_codigo ON public.inscricoes;
CREATE TRIGGER trg_set_inscricao_codigo BEFORE INSERT ON public.inscricoes
FOR EACH ROW EXECUTE FUNCTION public.set_inscricao_codigo();

CREATE UNIQUE INDEX IF NOT EXISTS inscricoes_codigo_key ON public.inscricoes(codigo);