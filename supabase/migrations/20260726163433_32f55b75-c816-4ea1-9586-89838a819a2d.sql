UPDATE public.livros SET imagem_url = '/__l5e/assets-v1/2cc39dec-438d-4e47-9a1d-33ba6347a4c2/mantenha.jpg' WHERE ordem = 1;
UPDATE public.livros SET imagem_url = '/__l5e/assets-v1/0bef4e7c-7867-4afb-ac90-b53237f93761/cultura.jpg' WHERE ordem = 2;
UPDATE public.livros SET imagem_url = '/__l5e/assets-v1/83714858-3437-4892-9e44-6fbfc6546a05/seu-perfeito.jpg' WHERE ordem = 3;
UPDATE public.livros SET imagem_url = '/__l5e/assets-v1/c2537257-364b-49e5-9215-2483791a8372/ative.jpg' WHERE ordem = 4;

CREATE TABLE public.historico_livros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participante_id uuid NOT NULL,
  livro_id uuid NOT NULL REFERENCES public.livros(id) ON DELETE CASCADE,
  data_conclusao date NOT NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participante_id, livro_id)
);
CREATE INDEX idx_historico_livros_participante ON public.historico_livros(participante_id);
CREATE INDEX idx_historico_livros_livro ON public.historico_livros(livro_id);

GRANT SELECT, INSERT, DELETE ON public.historico_livros TO authenticated;
GRANT ALL ON public.historico_livros TO service_role;

ALTER TABLE public.historico_livros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "historico_self_select" ON public.historico_livros FOR SELECT TO authenticated USING (auth.uid() = participante_id OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "historico_self_insert" ON public.historico_livros FOR INSERT TO authenticated WITH CHECK (auth.uid() = participante_id AND data_conclusao <= current_date);
CREATE POLICY "historico_self_delete" ON public.historico_livros FOR DELETE TO authenticated USING (auth.uid() = participante_id);