CREATE POLICY "presencas_self_insert" ON public.presencas
FOR INSERT TO authenticated
WITH CHECK (
  participante_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.inscricoes i
    JOIN public.eventos e ON e.id = i.evento_id
    WHERE i.id = presencas.inscricao_id
      AND i.participante_id = auth.uid()
      AND i.evento_id = presencas.evento_id
      AND i.status = 'confirmada'
      AND e.data = (now() AT TIME ZONE 'America/Sao_Paulo')::date
  )
);

CREATE POLICY "presencas_self_update" ON public.presencas
FOR UPDATE TO authenticated
USING (
  participante_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.eventos e
    WHERE e.id = presencas.evento_id
      AND e.data = (now() AT TIME ZONE 'America/Sao_Paulo')::date
  )
)
WITH CHECK (participante_id = auth.uid());