create table if not exists public.lista_interesse_cursos (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references auth.users(id) on delete cascade,
  livro_id uuid not null references public.livros(id) on delete cascade,
  created_at timestamptz not null default now(),
  notificado_em timestamptz null,
  unique (participante_id, livro_id)
);

alter table public.lista_interesse_cursos enable row level security;

drop policy if exists "lista_interesse_select_own" on public.lista_interesse_cursos;
drop policy if exists "lista_interesse_insert_own" on public.lista_interesse_cursos;
drop policy if exists "lista_interesse_admin" on public.lista_interesse_cursos;

create policy "lista_interesse_select_own"
on public.lista_interesse_cursos for select to authenticated
using (participante_id = auth.uid() or public.admin_tem_permissao(auth.uid(),'visualizacao_turmas'));

create policy "lista_interesse_insert_own"
on public.lista_interesse_cursos for insert to authenticated
with check (participante_id = auth.uid());

create policy "lista_interesse_admin"
on public.lista_interesse_cursos for all to authenticated
using (public.admin_tem_permissao(auth.uid(),'visualizacao_turmas'))
with check (public.admin_tem_permissao(auth.uid(),'visualizacao_turmas'));

grant select,insert,update,delete on public.lista_interesse_cursos to authenticated;
