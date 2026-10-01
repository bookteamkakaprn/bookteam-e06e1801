CREATE TABLE IF NOT EXISTS public.tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livro_id uuid NOT NULL REFERENCES public.livros(id) ON DELETE CASCADE,
  modulo integer NOT NULL DEFAULT 1,
  titulo text NOT NULL,
  descricao text,
  arquivo_nome text,
  tamanho_bytes bigint,
  mime_type text,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tarefas_livro_modulo_idx ON public.tarefas(livro_id, modulo, created_at);

ALTER TABLE public.inscricoes
  ADD COLUMN IF NOT EXISTS livro_disponibilizado boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.estoque_livraria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livro_id uuid NOT NULL UNIQUE REFERENCES public.livros(id) ON DELETE CASCADE,
  quantidade integer NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.movimentos_estoque_livraria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livro_id uuid NOT NULL REFERENCES public.livros(id) ON DELETE CASCADE,
  turma_id uuid REFERENCES public.turmas(id) ON DELETE SET NULL,
  quantidade integer NOT NULL CHECK (quantidade > 0),
  tipo text NOT NULL DEFAULT 'saida',
  observacao text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS movimentos_estoque_livro_idx ON public.movimentos_estoque_livraria(livro_id, created_at DESC);

ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_livraria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentos_estoque_livraria ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_livraria TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentos_estoque_livraria TO authenticated;

DROP POLICY IF EXISTS "tarefas_select_admin_or_permission" ON public.tarefas;
CREATE POLICY "tarefas_select_admin_or_permission" ON public.tarefas FOR SELECT TO authenticated USING (
  (SELECT public.admin_tem_permissao((SELECT auth.uid()), 'tarefas'))
  OR EXISTS (SELECT 1 FROM public.inscricoes i WHERE i.participante_id = (SELECT auth.uid()) AND i.livro_id = tarefas.livro_id AND i.status = 'confirmada')
);
DROP POLICY IF EXISTS "tarefas_insert_permission" ON public.tarefas;
CREATE POLICY "tarefas_insert_permission" ON public.tarefas FOR INSERT TO authenticated WITH CHECK ((SELECT public.admin_tem_permissao((SELECT auth.uid()), 'tarefas')));
DROP POLICY IF EXISTS "tarefas_update_permission" ON public.tarefas;
CREATE POLICY "tarefas_update_permission" ON public.tarefas FOR UPDATE TO authenticated USING ((SELECT public.admin_tem_permissao((SELECT auth.uid()), 'tarefas'))) WITH CHECK ((SELECT public.admin_tem_permissao((SELECT auth.uid()), 'tarefas')));
DROP POLICY IF EXISTS "tarefas_delete_permission" ON public.tarefas;
CREATE POLICY "tarefas_delete_permission" ON public.tarefas FOR DELETE TO authenticated USING ((SELECT public.admin_tem_permissao((SELECT auth.uid()), 'tarefas')));

DROP POLICY IF EXISTS "estoque_select_permission" ON public.estoque_livraria;
CREATE POLICY "estoque_select_permission" ON public.estoque_livraria FOR SELECT TO authenticated USING ((SELECT public.admin_tem_permissao((SELECT auth.uid()), 'estoque')));
DROP POLICY IF EXISTS "estoque_insert_permission" ON public.estoque_livraria;
CREATE POLICY "estoque_insert_permission" ON public.estoque_livraria FOR INSERT TO authenticated WITH CHECK ((SELECT public.admin_tem_permissao((SELECT auth.uid()), 'estoque')));
DROP POLICY IF EXISTS "estoque_update_permission" ON public.estoque_livraria;
CREATE POLICY "estoque_update_permission" ON public.estoque_livraria FOR UPDATE TO authenticated USING ((SELECT public.admin_tem_permissao((SELECT auth.uid()), 'estoque'))) WITH CHECK ((SELECT public.admin_tem_permissao((SELECT auth.uid()), 'estoque')));
DROP POLICY IF EXISTS "estoque_delete_permission" ON public.estoque_livraria;
CREATE POLICY "estoque_delete_permission" ON public.estoque_livraria FOR DELETE TO authenticated USING ((SELECT public.admin_tem_permissao((SELECT auth.uid()), 'estoque')));

DROP POLICY IF EXISTS "movimentos_select_permission" ON public.movimentos_estoque_livraria;
CREATE POLICY "movimentos_select_permission" ON public.movimentos_estoque_livraria FOR SELECT TO authenticated USING ((SELECT public.admin_tem_permissao((SELECT auth.uid()), 'estoque')));
DROP POLICY IF EXISTS "movimentos_insert_permission" ON public.movimentos_estoque_livraria;
CREATE POLICY "movimentos_insert_permission" ON public.movimentos_estoque_livraria FOR INSERT TO authenticated WITH CHECK ((SELECT public.admin_tem_permissao((SELECT auth.uid()), 'estoque')));
DROP POLICY IF EXISTS "movimentos_delete_permission" ON public.movimentos_estoque_livraria;
CREATE POLICY "movimentos_delete_permission" ON public.movimentos_estoque_livraria FOR DELETE TO authenticated USING ((SELECT public.admin_tem_permissao((SELECT auth.uid()), 'estoque')));

GRANT EXECUTE ON FUNCTION public.admin_tem_permissao(uuid, text) TO authenticated;

DROP FUNCTION IF EXISTS public.baixar_estoque_livraria(uuid, uuid, integer, text);
CREATE FUNCTION public.baixar_estoque_livraria(p_livro_id uuid,p_turma_id uuid,p_quantidade integer,p_observacao text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_estoque integer; v_pendentes integer; v_baixados integer;
BEGIN
  IF NOT (SELECT public.admin_tem_permissao((SELECT auth.uid()), 'pedido_materiais')) THEN RAISE EXCEPTION 'Sem permissão para baixar estoque'; END IF;
  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  SELECT count(*) INTO v_pendentes FROM public.inscricoes WHERE turma_id=p_turma_id AND livro_id=p_livro_id AND status='confirmada' AND livro_disponibilizado=false;
  IF v_pendentes=0 THEN RAISE EXCEPTION 'Não há livros pendentes de disponibilização nesta turma'; END IF;
  IF p_quantidade>v_pendentes THEN RAISE EXCEPTION 'A quantidade não pode ser maior que os alunos pendentes (%)',v_pendentes; END IF;
  SELECT quantidade INTO v_estoque FROM public.estoque_livraria WHERE livro_id=p_livro_id FOR UPDATE;
  IF v_estoque IS NULL THEN RAISE EXCEPTION 'Estoque não cadastrado para este livro'; END IF;
  IF v_estoque<p_quantidade THEN RAISE EXCEPTION 'Estoque insuficiente. Disponível: %',v_estoque; END IF;
  UPDATE public.estoque_livraria SET quantidade=quantidade-p_quantidade,updated_at=now() WHERE livro_id=p_livro_id;
  UPDATE public.inscricoes SET livro_disponibilizado=true,updated_at=now()
  WHERE id IN (SELECT id FROM public.inscricoes WHERE turma_id=p_turma_id AND livro_id=p_livro_id AND status='confirmada' AND livro_disponibilizado=false ORDER BY created_at LIMIT p_quantidade);
  GET DIAGNOSTICS v_baixados=ROW_COUNT;
  INSERT INTO public.movimentos_estoque_livraria(livro_id,turma_id,quantidade,tipo,observacao,created_by) VALUES(p_livro_id,p_turma_id,v_baixados,'saida',p_observacao,(SELECT auth.uid()));
  RETURN v_baixados;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.baixar_estoque_livraria(uuid,uuid,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.baixar_estoque_livraria(uuid,uuid,integer,text) TO authenticated;