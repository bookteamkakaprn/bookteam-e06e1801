alter table public.participantes
  add column if not exists arquivado boolean not null default false,
  add column if not exists arquivado_em timestamptz null;
create index if not exists idx_participantes_arquivado on public.participantes(arquivado);