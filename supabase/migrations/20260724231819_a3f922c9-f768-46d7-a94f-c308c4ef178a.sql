
-- COMPROVANTES: participante insere/lê o seu; admin lê todos
CREATE POLICY "comprovantes_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='comprovantes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "comprovantes_owner_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='comprovantes' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "comprovantes_admin_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id='comprovantes' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id='comprovantes' AND public.has_role(auth.uid(),'admin'));

-- CERTIFICADOS: participante lê o seu; admin escreve
CREATE POLICY "certificados_owner_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='certificados' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "certificados_admin_write" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id='certificados' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id='certificados' AND public.has_role(auth.uid(),'admin'));

-- MATERIAIS: qualquer autenticado lê; admin escreve
CREATE POLICY "materiais_auth_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='materiais');
CREATE POLICY "materiais_admin_write" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id='materiais' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id='materiais' AND public.has_role(auth.uid(),'admin'));

-- PERFIL: dono gerencia sua pasta; qualquer autenticado lê
CREATE POLICY "perfil_owner_write" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id='perfil' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id='perfil' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "perfil_auth_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='perfil');
