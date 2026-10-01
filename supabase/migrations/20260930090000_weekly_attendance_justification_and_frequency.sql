-- Weekly attendance, absence justification and 90% minimum frequency.
alter table public.presencas
  add column if not exists participante_id uuid references auth.users(id),
  add column if not exists data_aula date,
  add column if not exists justificativa text,
  add column if not exists falta_justificada boolean not null default false,
  add column if not exists evento_id uuid references public.eventos(id);

update public.presencas p
set participante_id = i.participante_id,
    turma_id = coalesce(p.turma_id, i.turma_id)
from public.inscricoes i
where i.id = p.inscricao_id
  and (p.participante_id is null or p.turma_id is null);

update public.presencas
set data_aula = coalesce(data_aula, created_at::date)
where data_aula is null;

alter table public.presencas
  alter column data_aula set not null,
  alter column participante_id set not null;

alter table public.presencas drop constraint if exists presencas_inscricao_id_key;
drop index if exists public.presencas_inscricao_id_key;
create unique index if not exists presencas_inscricao_data_aula_key
  on public.presencas(inscricao_id, data_aula);

create index if not exists presencas_turma_data_idx
  on public.presencas(turma_id, data_aula);

alter table public.presencas enable row level security;
drop policy if exists presencas_aluno_select on public.presencas;
drop policy if exists presencas_aluno_justificar on public.presencas;
drop policy if exists presencas_admin_all on public.presencas;

create policy presencas_aluno_select on public.presencas for select
using (
  participante_id = auth.uid()
  or private.has_role(auth.uid(), 'admin'::app_role)
  or public.admin_tem_permissao(auth.uid(), 'presencas')
);

create policy presencas_aluno_justificar on public.presencas for update
using (participante_id = auth.uid())
with check (participante_id = auth.uid());

create policy presencas_admin_all on public.presencas for all
using (
  private.has_role(auth.uid(), 'admin'::app_role)
  or public.admin_tem_permissao(auth.uid(), 'presencas')
)
with check (
  private.has_role(auth.uid(), 'admin'::app_role)
  or public.admin_tem_permissao(auth.uid(), 'presencas')
);

grant select, insert, update on public.presencas to authenticated;

alter table public.turmas
  add column if not exists frequencia_minima numeric not null default 90;

update public.turmas set frequencia_minima = 90 where frequencia_minima is null;
