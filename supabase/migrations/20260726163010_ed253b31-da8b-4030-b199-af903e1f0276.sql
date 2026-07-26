CREATE TABLE public.configuracoes_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario text,
  banco text,
  tipo_chave text,
  pix_chave text,
  pix_copia_cola text,
  pix_qrcode_url text,
  instrucoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.configuracoes_pagamento TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_pagamento TO authenticated;
GRANT ALL ON public.configuracoes_pagamento TO service_role;

ALTER TABLE public.configuracoes_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_pag_public_read" ON public.configuracoes_pagamento
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "config_pag_admin_write" ON public.configuracoes_pagamento
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_config_pag_updated_at BEFORE UPDATE ON public.configuracoes_pagamento
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.configuracoes_pagamento (beneficiario) VALUES (NULL);