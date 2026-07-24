
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin','participante');
CREATE TYPE public.trilha_status AS ENUM ('ativa','arquivada');
CREATE TYPE public.livro_status AS ENUM ('ativo','arquivado');
CREATE TYPE public.evento_status AS ENUM ('aberto','fechado','cancelado','realizado');
CREATE TYPE public.inscricao_status AS ENUM ('aguardando_pagamento','confirmada','cancelada');
CREATE TYPE public.pagamento_status AS ENUM ('aguardando','aprovado','rejeitado');
CREATE TYPE public.participante_crm_status AS ENUM ('lead','inscrito','pago','participando','concluido','inativo');
CREATE TYPE public.material_tipo AS ENUM ('pdf','video','link');

-- ============ TRIGGER HELPER ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ USER_ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "user_roles_self_select" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- ============ PARTICIPANTES (profiles) ============
CREATE TABLE public.participantes (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT,
  email TEXT NOT NULL,
  telefone TEXT,
  cidade TEXT,
  estado TEXT,
  foto_url TEXT,
  status participante_crm_status NOT NULL DEFAULT 'lead',
  aceite_lgpd BOOLEAN NOT NULL DEFAULT false,
  ultimo_acesso TIMESTAMPTZ,
  observacoes_admin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.participantes TO authenticated;
GRANT ALL ON public.participantes TO service_role;
ALTER TABLE public.participantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participantes_self_select" ON public.participantes FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "participantes_self_update" ON public.participantes FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "participantes_admin_insert" ON public.participantes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER participantes_updated BEFORE UPDATE ON public.participantes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ TRIGGER: cria participante + role no signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.participantes (id, nome, email, cpf, telefone, cidade, estado, aceite_lgpd)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'cpf',
    NEW.raw_user_meta_data->>'telefone',
    NEW.raw_user_meta_data->>'cidade',
    NEW.raw_user_meta_data->>'estado',
    COALESCE((NEW.raw_user_meta_data->>'aceite_lgpd')::boolean, false)
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'participante');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ TRILHAS ============
CREATE TABLE public.trilhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  imagem_url TEXT,
  cor TEXT DEFAULT '#8B4513',
  status trilha_status NOT NULL DEFAULT 'ativa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trilhas TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.trilhas TO authenticated;
GRANT ALL ON public.trilhas TO service_role;
ALTER TABLE public.trilhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trilhas_public_read" ON public.trilhas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "trilhas_admin_write" ON public.trilhas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trilhas_updated BEFORE UPDATE ON public.trilhas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ LIVROS ============
CREATE TABLE public.livros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trilha_id UUID NOT NULL REFERENCES public.trilhas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  autor TEXT,
  imagem_url TEXT,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 1,
  status livro_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX livros_trilha_idx ON public.livros(trilha_id);
GRANT SELECT ON public.livros TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.livros TO authenticated;
GRANT ALL ON public.livros TO service_role;
ALTER TABLE public.livros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "livros_public_read" ON public.livros FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "livros_admin_write" ON public.livros FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER livros_updated BEFORE UPDATE ON public.livros
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ MATERIAIS ============
CREATE TABLE public.materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  livro_id UUID NOT NULL REFERENCES public.livros(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  tipo material_tipo NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX materiais_livro_idx ON public.materiais(livro_id);
GRANT SELECT ON public.materiais TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.materiais TO authenticated;
GRANT ALL ON public.materiais TO service_role;
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materiais_auth_read" ON public.materiais FOR SELECT TO authenticated USING (true);
CREATE POLICY "materiais_admin_write" ON public.materiais FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ EVENTOS ============
CREATE TABLE public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  livro_id UUID REFERENCES public.livros(id) ON DELETE SET NULL,
  descricao TEXT,
  imagem_url TEXT,
  cidade TEXT,
  local TEXT,
  data DATE NOT NULL,
  hora TIME,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  vagas INTEGER NOT NULL DEFAULT 0,
  status evento_status NOT NULL DEFAULT 'aberto',
  pix_chave TEXT,
  pix_qrcode_url TEXT,
  pix_copia_cola TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX eventos_data_idx ON public.eventos(data);
CREATE INDEX eventos_livro_idx ON public.eventos(livro_id);
GRANT SELECT ON public.eventos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.eventos TO authenticated;
GRANT ALL ON public.eventos TO service_role;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eventos_public_read" ON public.eventos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "eventos_admin_write" ON public.eventos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER eventos_updated BEFORE UPDATE ON public.eventos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ INSCRICOES ============
CREATE TABLE public.inscricoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participante_id UUID NOT NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  status inscricao_status NOT NULL DEFAULT 'aguardando_pagamento',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(participante_id, evento_id)
);
CREATE INDEX inscricoes_evento_idx ON public.inscricoes(evento_id);
CREATE INDEX inscricoes_participante_idx ON public.inscricoes(participante_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inscricoes TO authenticated;
GRANT ALL ON public.inscricoes TO service_role;
ALTER TABLE public.inscricoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inscricoes_self_select" ON public.inscricoes FOR SELECT TO authenticated
  USING (participante_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "inscricoes_self_insert" ON public.inscricoes FOR INSERT TO authenticated
  WITH CHECK (participante_id = auth.uid());
CREATE POLICY "inscricoes_admin_update" ON public.inscricoes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "inscricoes_admin_delete" ON public.inscricoes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR participante_id = auth.uid());
CREATE TRIGGER inscricoes_updated BEFORE UPDATE ON public.inscricoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PAGAMENTOS ============
CREATE TABLE public.pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id UUID NOT NULL REFERENCES public.inscricoes(id) ON DELETE CASCADE,
  participante_id UUID NOT NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  valor NUMERIC(10,2) NOT NULL,
  comprovante_url TEXT,
  status pagamento_status NOT NULL DEFAULT 'aguardando',
  aprovado_por UUID REFERENCES auth.users(id),
  aprovado_em TIMESTAMPTZ,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pagamentos_inscricao_idx ON public.pagamentos(inscricao_id);
CREATE INDEX pagamentos_participante_idx ON public.pagamentos(participante_id);
CREATE INDEX pagamentos_status_idx ON public.pagamentos(status);
GRANT SELECT, INSERT, UPDATE ON public.pagamentos TO authenticated;
GRANT ALL ON public.pagamentos TO service_role;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pagamentos_self_select" ON public.pagamentos FOR SELECT TO authenticated
  USING (participante_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "pagamentos_self_insert" ON public.pagamentos FOR INSERT TO authenticated
  WITH CHECK (participante_id = auth.uid());
CREATE POLICY "pagamentos_admin_update" ON public.pagamentos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER pagamentos_updated BEFORE UPDATE ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PRESENCAS ============
CREATE TABLE public.presencas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id UUID NOT NULL REFERENCES public.inscricoes(id) ON DELETE CASCADE,
  participante_id UUID NOT NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  presente BOOLEAN NOT NULL DEFAULT false,
  horario_checkin TIMESTAMPTZ,
  registrado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(inscricao_id)
);
CREATE INDEX presencas_evento_idx ON public.presencas(evento_id);
GRANT SELECT, INSERT, UPDATE ON public.presencas TO authenticated;
GRANT ALL ON public.presencas TO service_role;
ALTER TABLE public.presencas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presencas_self_select" ON public.presencas FOR SELECT TO authenticated
  USING (participante_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "presencas_admin_write" ON public.presencas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ CERTIFICADOS ============
CREATE TABLE public.certificados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participante_id UUID NOT NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  livro_id UUID REFERENCES public.livros(id) ON DELETE SET NULL,
  carga_horaria INTEGER NOT NULL DEFAULT 2,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  pdf_url TEXT,
  assinatura TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(participante_id, evento_id)
);
CREATE INDEX certificados_participante_idx ON public.certificados(participante_id);
GRANT SELECT ON public.certificados TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.certificados TO authenticated;
GRANT ALL ON public.certificados TO service_role;
ALTER TABLE public.certificados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "certificados_self_select" ON public.certificados FOR SELECT TO authenticated
  USING (participante_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "certificados_admin_write" ON public.certificados FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ OBSERVACOES (CRM) ============
CREATE TABLE public.observacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participante_id UUID NOT NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES auth.users(id),
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX observacoes_participante_idx ON public.observacoes(participante_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.observacoes TO authenticated;
GRANT ALL ON public.observacoes TO service_role;
ALTER TABLE public.observacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "observacoes_admin_all" ON public.observacoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ NOTIFICACOES ============
CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participante_id UUID NOT NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
  canal TEXT NOT NULL,
  assunto TEXT,
  mensagem TEXT NOT NULL,
  enviada BOOLEAN NOT NULL DEFAULT false,
  enviada_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notificacoes_participante_idx ON public.notificacoes(participante_id);
GRANT SELECT, INSERT, UPDATE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notificacoes_self_select" ON public.notificacoes FOR SELECT TO authenticated
  USING (participante_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "notificacoes_admin_write" ON public.notificacoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ STORAGE POLICIES (buckets criados via tool) ============
-- policies criadas depois da criação dos buckets
