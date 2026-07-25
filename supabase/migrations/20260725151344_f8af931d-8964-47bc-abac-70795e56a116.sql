-- 1) Trigger de sincronização pagamento -> inscrição
CREATE OR REPLACE FUNCTION public.sync_inscricao_from_pagamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'aprovado' THEN
    UPDATE public.inscricoes
       SET status = 'confirmada', updated_at = now()
     WHERE id = NEW.inscricao_id;
  ELSIF NEW.status = 'rejeitado' THEN
    UPDATE public.inscricoes
       SET status = 'aguardando_pagamento', updated_at = now()
     WHERE id = NEW.inscricao_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_inscricao_from_pagamento ON public.pagamentos;
CREATE TRIGGER trg_sync_inscricao_from_pagamento
AFTER INSERT OR UPDATE OF status ON public.pagamentos
FOR EACH ROW EXECUTE FUNCTION public.sync_inscricao_from_pagamento();

-- 2) Triggers updated_at nas tabelas usadas neste fluxo
DROP TRIGGER IF EXISTS trg_inscricoes_updated_at ON public.inscricoes;
CREATE TRIGGER trg_inscricoes_updated_at
BEFORE UPDATE ON public.inscricoes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_pagamentos_updated_at ON public.pagamentos;
CREATE TRIGGER trg_pagamentos_updated_at
BEFORE UPDATE ON public.pagamentos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_eventos_updated_at ON public.eventos;
CREATE TRIGGER trg_eventos_updated_at
BEFORE UPDATE ON public.eventos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_trilhas_updated_at ON public.trilhas;
CREATE TRIGGER trg_trilhas_updated_at
BEFORE UPDATE ON public.trilhas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_livros_updated_at ON public.livros;
CREATE TRIGGER trg_livros_updated_at
BEFORE UPDATE ON public.livros
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_participantes_updated_at ON public.participantes;
CREATE TRIGGER trg_participantes_updated_at
BEFORE UPDATE ON public.participantes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Políticas de storage para o bucket "comprovantes"
DROP POLICY IF EXISTS "comprovantes_owner_read" ON storage.objects;
DROP POLICY IF EXISTS "comprovantes_owner_write" ON storage.objects;
DROP POLICY IF EXISTS "comprovantes_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "comprovantes_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "comprovantes_admin_read" ON storage.objects;

CREATE POLICY "comprovantes_owner_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'comprovantes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "comprovantes_owner_write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'comprovantes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "comprovantes_owner_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'comprovantes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "comprovantes_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'comprovantes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "comprovantes_admin_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'comprovantes'
  AND private.has_role(auth.uid(), 'admin'::app_role)
);
