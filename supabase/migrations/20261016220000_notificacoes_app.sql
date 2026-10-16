-- Avisos dentro do sistema: admin recebe novas inscrições; aluno recebe aprovação da inscrição.
CREATE TABLE IF NOT EXISTS public.notificacoes_app (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario text NOT NULL CHECK (destinatario IN ('admin', 'aluno')),
  participante_id uuid NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  mensagem text NULL,
  link text NULL,
  lida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_app_admin ON public.notificacoes_app(destinatario, lida, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_app_participante ON public.notificacoes_app(participante_id, lida, created_at DESC);

ALTER TABLE public.notificacoes_app ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.notificacoes_app TO authenticated;
GRANT ALL ON public.notificacoes_app TO service_role;

DROP POLICY IF EXISTS "notif_admin_select" ON public.notificacoes_app;
CREATE POLICY "notif_admin_select" ON public.notificacoes_app FOR SELECT TO authenticated
  USING (destinatario = 'admin' AND public.admin_tem_permissao((SELECT auth.uid()), 'inscricoes'));

DROP POLICY IF EXISTS "notif_admin_update" ON public.notificacoes_app;
CREATE POLICY "notif_admin_update" ON public.notificacoes_app FOR UPDATE TO authenticated
  USING (destinatario = 'admin' AND public.admin_tem_permissao((SELECT auth.uid()), 'inscricoes'))
  WITH CHECK (destinatario = 'admin' AND public.admin_tem_permissao((SELECT auth.uid()), 'inscricoes'));

DROP POLICY IF EXISTS "notif_aluno_select" ON public.notificacoes_app;
CREATE POLICY "notif_aluno_select" ON public.notificacoes_app FOR SELECT TO authenticated
  USING (destinatario = 'aluno' AND participante_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "notif_aluno_update" ON public.notificacoes_app;
CREATE POLICY "notif_aluno_update" ON public.notificacoes_app FOR UPDATE TO authenticated
  USING (destinatario = 'aluno' AND participante_id = (SELECT auth.uid()))
  WITH CHECK (destinatario = 'aluno' AND participante_id = (SELECT auth.uid()));

-- Nova inscrição -> aviso para o admin
CREATE OR REPLACE FUNCTION public.notificar_nova_inscricao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_nome text; v_turma text;
BEGIN
  SELECT nome INTO v_nome FROM public.participantes WHERE id = NEW.participante_id;
  SELECT nome INTO v_turma FROM public.turmas WHERE id = NEW.turma_id;
  INSERT INTO public.notificacoes_app (destinatario, titulo, mensagem, link)
  VALUES ('admin', 'Nova inscrição',
          COALESCE(v_nome, 'Um aluno') || ' se inscreveu em ' || COALESCE(v_turma, 'uma turma') || '.',
          '/admin/inscricoes');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_nova_inscricao ON public.inscricoes;
CREATE TRIGGER trg_notificar_nova_inscricao
  AFTER INSERT ON public.inscricoes
  FOR EACH ROW EXECUTE FUNCTION public.notificar_nova_inscricao();

-- Inscrição aprovada (confirmada) -> aviso para o aluno
CREATE OR REPLACE FUNCTION public.notificar_inscricao_confirmada()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_turma text;
BEGIN
  IF NEW.status = 'confirmada' AND OLD.status IS DISTINCT FROM 'confirmada' THEN
    SELECT nome INTO v_turma FROM public.turmas WHERE id = NEW.turma_id;
    INSERT INTO public.notificacoes_app (destinatario, participante_id, titulo, mensagem, link)
    VALUES ('aluno', NEW.participante_id, 'Inscrição aprovada',
            'Sua inscrição em ' || COALESCE(v_turma, 'uma turma') || ' foi aprovada.',
            '/minhas-inscricoes');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_inscricao_confirmada ON public.inscricoes;
CREATE TRIGGER trg_notificar_inscricao_confirmada
  AFTER UPDATE OF status ON public.inscricoes
  FOR EACH ROW EXECUTE FUNCTION public.notificar_inscricao_confirmada();

NOTIFY pgrst, 'reload schema';
