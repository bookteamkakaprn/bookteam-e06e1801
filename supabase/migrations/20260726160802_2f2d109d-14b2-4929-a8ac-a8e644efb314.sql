REVOKE ALL ON FUNCTION public.sync_livro_inscritos() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_inscricao_from_pagamento() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;