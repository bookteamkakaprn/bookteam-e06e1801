-- ============================================================
-- BOOK TEAM — Script de migração de estrutura (somente schema)
-- Destino: projeto Supabase PostgreSQL novo
-- NÃO contém dados de usuários. Execute no SQL Editor do destino.
-- ============================================================

-- ------------------------------------------------------------
-- 0) Schemas e extensões
-- ------------------------------------------------------------
create extension if not exists pgcrypto;
create schema if not exists private;

-- ------------------------------------------------------------
-- 1) Tipos ENUM
-- ------------------------------------------------------------
create type public.app_role                as enum ('admin','participante');
create type public.evento_status           as enum ('aberto','fechado','cancelado','realizado');
create type public.inscricao_status        as enum ('aguardando_pagamento','confirmada','cancelada','lista_espera');
create type public.livro_status            as enum ('ativo','arquivado');
create type public.material_tipo           as enum ('pdf','video','link');
create type public.pagamento_status        as enum ('aguardando','aprovado','rejeitado');
create type public.participante_crm_status as enum ('lead','inscrito','pago','participando','concluido','inativo');
create type public.trilha_status           as enum ('ativa','arquivada');

-- ------------------------------------------------------------
-- 2) Funções utilitárias e de trigger
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path to 'public' as $$
begin new.updated_at = now(); return new; end; $$;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

-- ------------------------------------------------------------
-- 3) Tabelas
-- ------------------------------------------------------------

-- 3.1 participantes (espelha auth.users)
create table public.participantes (
  id                uuid primary key references auth.users(id) on delete cascade,
  nome              text not null,
  cpf               text,
  email             text not null,
  telefone          text,
  cidade            text,
  estado            text,
  foto_url          text,
  status            public.participante_crm_status not null default 'lead',
  aceite_lgpd       boolean not null default false,
  ultimo_acesso     timestamptz,
  observacoes_admin text,
  nascimento        date,
  whatsapp          text,
  igreja            text,
  como_conheceu     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
grant select, insert, update on public.participantes to authenticated;
grant all on public.participantes to service_role;
alter table public.participantes enable row level security;

-- 3.2 user_roles (papéis — NUNCA em profiles/participantes)
create table public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

-- 3.3 trilhas
create table public.trilhas (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  descricao  text,
  imagem_url text,
  cor        text default '#8B4513',
  status     public.trilha_status not null default 'ativa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.trilhas to anon;
grant select, insert, update, delete on public.trilhas to authenticated;
grant all on public.trilhas to service_role;
alter table public.trilhas enable row level security;

-- 3.4 livros
create table public.livros (
  id                    uuid primary key default gen_random_uuid(),
  trilha_id             uuid not null references public.trilhas(id) on delete cascade,
  titulo                text not null,
  autor                 text,
  imagem_url            text,
  descricao             text,
  ordem                 integer not null default 1,
  status                public.livro_status not null default 'ativo',
  categoria             text,
  objetivo              text,
  publico_alvo          text,
  conteudo_programatico text,
  competencias          text,
  qtd_encontros         integer,
  duracao               text,
  material_necessario   text,
  professor             text,
  coordenador           text,
  ano                   integer,
  turma                 text,
  datas_curso           text,
  horario               text,
  sala                  text,
  valor                 numeric,
  vagas_total           integer not null default 0,
  inscritos             integer not null default 0,
  vagas_restantes       integer generated always as (greatest(vagas_total - inscritos, 0)) stored,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index livros_trilha_idx on public.livros (trilha_id);
grant select on public.livros to anon;
grant select, insert, update, delete on public.livros to authenticated;
grant all on public.livros to service_role;
alter table public.livros enable row level security;

-- 3.5 turmas
create table public.turmas (
  id              uuid primary key default gen_random_uuid(),
  livro_id        uuid not null references public.livros(id) on delete cascade,
  nome            text not null,
  ano             integer,
  temporada       text,
  data_inicio     date,
  data_fim        date,
  horario         text,
  professor       text,
  coordenador     text,
  staff           text,
  sala            text,
  valor           numeric,
  vagas_max       integer not null default 0,
  inscritos       integer not null default 0,
  vagas_restantes integer generated always as (greatest(vagas_max - inscritos, 0)) stored,
  status          text not null default 'aberta',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index turmas_livro_idx on public.turmas (livro_id);
grant select on public.turmas to anon;
grant select, insert, update, delete on public.turmas to authenticated;
grant all on public.turmas to service_role;
alter table public.turmas enable row level security;

-- 3.6 eventos
create table public.eventos (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,
  livro_id        uuid references public.livros(id) on delete set null,
  descricao       text,
  imagem_url      text,
  cidade          text,
  local           text,
  data            date not null,
  hora            time,
  valor           numeric not null default 0,
  vagas           integer not null default 0,
  status          public.evento_status not null default 'aberto',
  pix_chave       text,
  pix_qrcode_url  text,
  pix_copia_cola  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index eventos_data_idx  on public.eventos (data);
create index eventos_livro_idx on public.eventos (livro_id);
grant select on public.eventos to anon;
grant select, insert, update, delete on public.eventos to authenticated;
grant all on public.eventos to service_role;
alter table public.eventos enable row level security;

-- 3.7 inscricoes
create table public.inscricoes (
  id              uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  evento_id       uuid references public.eventos(id) on delete cascade,
  turma_id        uuid references public.turmas(id) on delete set null,
  status          public.inscricao_status not null default 'aguardando_pagamento',
  codigo          text unique,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (participante_id, evento_id)
);
create unique index inscricoes_participante_turma_key
  on public.inscricoes (participante_id, turma_id) where turma_id is not null;
create index inscricoes_evento_idx       on public.inscricoes (evento_id);
create index inscricoes_participante_idx on public.inscricoes (participante_id);
create index inscricoes_turma_idx        on public.inscricoes (turma_id);
grant select, insert, update, delete on public.inscricoes to authenticated;
grant all on public.inscricoes to service_role;
alter table public.inscricoes enable row level security;

-- 3.8 pagamentos
create table public.pagamentos (
  id              uuid primary key default gen_random_uuid(),
  inscricao_id    uuid not null references public.inscricoes(id) on delete cascade,
  participante_id uuid not null references public.participantes(id) on delete cascade,
  evento_id       uuid references public.eventos(id) on delete cascade,
  turma_id        uuid references public.turmas(id) on delete set null,
  valor           numeric not null,
  comprovante_url text,
  status          public.pagamento_status not null default 'aguardando',
  aprovado_por    uuid references auth.users(id),
  aprovado_em     timestamptz,
  observacao      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index pagamentos_inscricao_idx    on public.pagamentos (inscricao_id);
create index pagamentos_participante_idx on public.pagamentos (participante_id);
create index pagamentos_status_idx       on public.pagamentos (status);
grant select, insert, update on public.pagamentos to authenticated;
grant all on public.pagamentos to service_role;
alter table public.pagamentos enable row level security;

-- 3.9 presencas
create table public.presencas (
  id              uuid primary key default gen_random_uuid(),
  inscricao_id    uuid not null unique references public.inscricoes(id) on delete cascade,
  participante_id uuid not null references public.participantes(id) on delete cascade,
  evento_id       uuid not null references public.eventos(id) on delete cascade,
  presente        boolean not null default false,
  horario_checkin timestamptz,
  registrado_por  uuid references auth.users(id),
  created_at      timestamptz not null default now()
);
create index presencas_evento_idx on public.presencas (evento_id);
grant select, insert, update, delete on public.presencas to authenticated;
grant all on public.presencas to service_role;
alter table public.presencas enable row level security;

-- 3.10 certificados
create table public.certificados (
  id              uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  evento_id       uuid not null references public.eventos(id) on delete cascade,
  livro_id        uuid references public.livros(id) on delete set null,
  carga_horaria   integer not null default 2,
  data_emissao    date not null default current_date,
  pdf_url         text,
  assinatura      text,
  created_at      timestamptz not null default now(),
  unique (participante_id, evento_id)
);
create index certificados_participante_idx on public.certificados (participante_id);
grant select, insert, update, delete on public.certificados to authenticated;
grant all on public.certificados to service_role;
alter table public.certificados enable row level security;

-- 3.11 materiais
create table public.materiais (
  id         uuid primary key default gen_random_uuid(),
  livro_id   uuid not null references public.livros(id) on delete cascade,
  titulo     text not null,
  tipo       public.material_tipo not null,
  url        text not null,
  created_at timestamptz not null default now()
);
create index materiais_livro_idx on public.materiais (livro_id);
grant select, insert, update, delete on public.materiais to authenticated;
grant all on public.materiais to service_role;
alter table public.materiais enable row level security;

-- 3.12 historico_livros
create table public.historico_livros (
  id              uuid primary key default gen_random_uuid(),
  participante_id uuid not null,
  livro_id        uuid not null references public.livros(id) on delete cascade,
  data_conclusao  date not null,
  observacao      text,
  created_at      timestamptz not null default now(),
  unique (participante_id, livro_id)
);
create index idx_historico_livros_livro        on public.historico_livros (livro_id);
create index idx_historico_livros_participante on public.historico_livros (participante_id);
grant select, insert, delete on public.historico_livros to authenticated;
grant all on public.historico_livros to service_role;
alter table public.historico_livros enable row level security;

-- 3.13 notificacoes
create table public.notificacoes (
  id              uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  canal           text not null,
  assunto         text,
  mensagem        text not null,
  enviada         boolean not null default false,
  enviada_em      timestamptz,
  created_at      timestamptz not null default now()
);
create index notificacoes_participante_idx on public.notificacoes (participante_id);
grant select, insert, update, delete on public.notificacoes to authenticated;
grant all on public.notificacoes to service_role;
alter table public.notificacoes enable row level security;

-- 3.14 observacoes (somente admin)
create table public.observacoes (
  id              uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  autor_id        uuid not null references auth.users(id),
  texto           text not null,
  created_at      timestamptz not null default now()
);
create index observacoes_participante_idx on public.observacoes (participante_id);
grant select, insert, update, delete on public.observacoes to authenticated;
grant all on public.observacoes to service_role;
alter table public.observacoes enable row level security;

-- 3.15 configuracoes_pagamento (PIX)
create table public.configuracoes_pagamento (
  id             uuid primary key default gen_random_uuid(),
  beneficiario   text,
  banco          text,
  tipo_chave     text,
  pix_chave      text,
  pix_copia_cola text,
  pix_qrcode_url text,
  instrucoes     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
grant select on public.configuracoes_pagamento to anon;
grant select, insert, update, delete on public.configuracoes_pagamento to authenticated;
grant all on public.configuracoes_pagamento to service_role;
alter table public.configuracoes_pagamento enable row level security;

-- ------------------------------------------------------------
-- 4) Funções de negócio (triggers)
-- ------------------------------------------------------------
create or replace function public.set_inscricao_codigo()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if new.codigo is null then
    new.codigo := 'BT-' || to_char(now(),'YYYY') || '-' || upper(substr(replace(new.id::text,'-',''),1,6));
  end if;
  return new;
end; $$;

create or replace function public.sync_inscricao_from_pagamento()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.status = 'aprovado' then
    update public.inscricoes set status='confirmada', updated_at=now() where id = new.inscricao_id;
  elsif new.status = 'rejeitado' then
    update public.inscricoes set status='aguardando_pagamento', updated_at=now() where id = new.inscricao_id;
  end if;
  return new;
end; $$;

create or replace function public.sync_livro_inscritos()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare v_livro uuid;
begin
  select e.livro_id into v_livro from public.eventos e where e.id = coalesce(new.evento_id, old.evento_id);
  if v_livro is null then return coalesce(new, old); end if;
  update public.livros l
     set inscritos = (select count(*) from public.inscricoes i
                        join public.eventos e2 on e2.id = i.evento_id
                       where e2.livro_id = v_livro and i.status = 'confirmada'),
         updated_at = now()
   where l.id = v_livro;
  return coalesce(new, old);
end; $$;

create or replace function public.sync_turma_inscritos()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare v_turmas uuid[] := array[]::uuid[]; v_turma uuid;
begin
  if tg_op <> 'DELETE' and new.turma_id is not null then v_turmas := array_append(v_turmas, new.turma_id); end if;
  if tg_op <> 'INSERT' and old.turma_id is not null then v_turmas := array_append(v_turmas, old.turma_id); end if;
  foreach v_turma in array v_turmas loop
    update public.turmas t
       set inscritos = (select count(*) from public.inscricoes i
                         where i.turma_id = t.id and i.status = 'confirmada'),
           updated_at = now()
     where t.id = v_turma;
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;

-- Cria participante + papel padrão a cada novo usuário do Auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  insert into public.participantes (id, nome, email, cpf, telefone, cidade, estado, aceite_lgpd)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    new.email,
    new.raw_user_meta_data->>'cpf',
    new.raw_user_meta_data->>'telefone',
    new.raw_user_meta_data->>'cidade',
    new.raw_user_meta_data->>'estado',
    coalesce((new.raw_user_meta_data->>'aceite_lgpd')::boolean, false)
  );
  insert into public.user_roles (user_id, role) values (new.id, 'participante');
  return new;
end; $$;

-- ------------------------------------------------------------
-- 5) Triggers
-- ------------------------------------------------------------
create trigger trg_participantes_updated_at before update on public.participantes           for each row execute function public.set_updated_at();
create trigger trg_trilhas_updated_at       before update on public.trilhas                 for each row execute function public.set_updated_at();
create trigger trg_livros_updated_at        before update on public.livros                  for each row execute function public.set_updated_at();
create trigger trg_turmas_updated_at        before update on public.turmas                  for each row execute function public.set_updated_at();
create trigger trg_eventos_updated_at       before update on public.eventos                 for each row execute function public.set_updated_at();
create trigger trg_inscricoes_updated_at    before update on public.inscricoes              for each row execute function public.set_updated_at();
create trigger trg_pagamentos_updated_at    before update on public.pagamentos              for each row execute function public.set_updated_at();
create trigger trg_config_pag_updated_at    before update on public.configuracoes_pagamento for each row execute function public.set_updated_at();

create trigger trg_set_inscricao_codigo before insert on public.inscricoes
  for each row execute function public.set_inscricao_codigo();

create trigger trg_sync_livro_inscritos after insert or delete or update of status on public.inscricoes
  for each row execute function public.sync_livro_inscritos();

create trigger trg_sync_turma_inscritos after insert or delete or update of status, turma_id on public.inscricoes
  for each row execute function public.sync_turma_inscritos();

create trigger trg_sync_inscricao_from_pagamento after insert or update of status on public.pagamentos
  for each row execute function public.sync_inscricao_from_pagamento();

-- Trigger no schema auth (executar como owner/postgres no projeto destino)
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 6) RLS — Policies
-- ------------------------------------------------------------

-- user_roles: leitura própria + admin (escrita apenas via service_role)
create policy user_roles_self_select on public.user_roles for select to authenticated
  using (auth.uid() = user_id or private.has_role(auth.uid(),'admin'));

-- participantes
create policy participantes_self_select on public.participantes for select to authenticated
  using (id = auth.uid() or private.has_role(auth.uid(),'admin'));
create policy participantes_self_update on public.participantes for update to authenticated
  using (id = auth.uid() or private.has_role(auth.uid(),'admin'))
  with check (id = auth.uid() or private.has_role(auth.uid(),'admin'));
create policy participantes_admin_insert on public.participantes for insert to authenticated
  with check (private.has_role(auth.uid(),'admin'));

-- catálogos públicos
create policy trilhas_public_read on public.trilhas for select to anon, authenticated using (true);
create policy trilhas_admin_write on public.trilhas for all to authenticated
  using (private.has_role(auth.uid(),'admin')) with check (private.has_role(auth.uid(),'admin'));

create policy livros_public_read on public.livros for select to anon, authenticated using (true);
create policy livros_admin_write on public.livros for all to authenticated
  using (private.has_role(auth.uid(),'admin')) with check (private.has_role(auth.uid(),'admin'));

create policy turmas_public_read on public.turmas for select to anon, authenticated using (true);
create policy turmas_admin_write on public.turmas for all to authenticated
  using (private.has_role(auth.uid(),'admin')) with check (private.has_role(auth.uid(),'admin'));

create policy eventos_public_read on public.eventos for select to anon, authenticated using (true);
create policy eventos_admin_write on public.eventos for all to authenticated
  using (private.has_role(auth.uid(),'admin')) with check (private.has_role(auth.uid(),'admin'));

create policy config_pag_public_read on public.configuracoes_pagamento for select to anon, authenticated using (true);
create policy config_pag_admin_write on public.configuracoes_pagamento for all to authenticated
  using (private.has_role(auth.uid(),'admin')) with check (private.has_role(auth.uid(),'admin'));

-- inscricoes
create policy inscricoes_self_select on public.inscricoes for select to authenticated
  using (participante_id = auth.uid() or private.has_role(auth.uid(),'admin'));
create policy inscricoes_self_insert on public.inscricoes for insert to authenticated
  with check (participante_id = auth.uid());
create policy inscricoes_admin_update on public.inscricoes for update to authenticated
  using (private.has_role(auth.uid(),'admin')) with check (private.has_role(auth.uid(),'admin'));
create policy inscricoes_admin_delete on public.inscricoes for delete to authenticated
  using (private.has_role(auth.uid(),'admin') or participante_id = auth.uid());

-- pagamentos
create policy pagamentos_self_select on public.pagamentos for select to authenticated
  using (participante_id = auth.uid() or private.has_role(auth.uid(),'admin'));
create policy pagamentos_self_insert on public.pagamentos for insert to authenticated
  with check (participante_id = auth.uid());
create policy pagamentos_admin_update on public.pagamentos for update to authenticated
  using (private.has_role(auth.uid(),'admin')) with check (private.has_role(auth.uid(),'admin'));

-- presencas (check-in só no dia do encontro, fuso America/Sao_Paulo)
create policy presencas_self_select on public.presencas for select to authenticated
  using (participante_id = auth.uid() or private.has_role(auth.uid(),'admin'));
create policy presencas_self_insert on public.presencas for insert to authenticated
  with check (
    participante_id = auth.uid() and exists (
      select 1 from public.inscricoes i join public.eventos e on e.id = i.evento_id
       where i.id = presencas.inscricao_id
         and i.participante_id = auth.uid()
         and i.evento_id = presencas.evento_id
         and i.status = 'confirmada'
         and e.data = (now() at time zone 'America/Sao_Paulo')::date
    )
  );
create policy presencas_self_update on public.presencas for update to authenticated
  using (
    participante_id = auth.uid() and exists (
      select 1 from public.eventos e
       where e.id = presencas.evento_id
         and e.data = (now() at time zone 'America/Sao_Paulo')::date
    )
  )
  with check (participante_id = auth.uid());
create policy presencas_admin_write on public.presencas for all to authenticated
  using (private.has_role(auth.uid(),'admin')) with check (private.has_role(auth.uid(),'admin'));

-- certificados
create policy certificados_self_select on public.certificados for select to authenticated
  using (participante_id = auth.uid() or private.has_role(auth.uid(),'admin'));
create policy certificados_admin_write on public.certificados for all to authenticated
  using (private.has_role(auth.uid(),'admin')) with check (private.has_role(auth.uid(),'admin'));

-- materiais
create policy materiais_auth_read on public.materiais for select to authenticated using (true);
create policy materiais_admin_write on public.materiais for all to authenticated
  using (private.has_role(auth.uid(),'admin')) with check (private.has_role(auth.uid(),'admin'));

-- historico_livros
create policy historico_self_select on public.historico_livros for select to authenticated
  using (auth.uid() = participante_id or private.has_role(auth.uid(),'admin'));
create policy historico_self_insert on public.historico_livros for insert to authenticated
  with check (auth.uid() = participante_id and data_conclusao <= current_date);
create policy historico_self_delete on public.historico_livros for delete to authenticated
  using (auth.uid() = participante_id);

-- notificacoes
create policy notificacoes_self_select on public.notificacoes for select to authenticated
  using (participante_id = auth.uid() or private.has_role(auth.uid(),'admin'));
create policy notificacoes_admin_write on public.notificacoes for all to authenticated
  using (private.has_role(auth.uid(),'admin')) with check (private.has_role(auth.uid(),'admin'));

-- observacoes (admin apenas — permissiva + restritiva)
create policy observacoes_admin_all on public.observacoes for all to authenticated
  using (private.has_role(auth.uid(),'admin')) with check (private.has_role(auth.uid(),'admin'));
create policy observacoes_admin_only_restrictive on public.observacoes as restrictive for all to authenticated
  using (private.has_role(auth.uid(),'admin')) with check (private.has_role(auth.uid(),'admin'));

-- ------------------------------------------------------------
-- 7) Storage — buckets e policies
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('comprovantes','comprovantes', false),
  ('certificados','certificados', false),
  ('materiais','materiais', false),
  ('perfil','perfil', false),
  ('capas','capas', false)
on conflict (id) do nothing;

-- comprovantes: dono grava/lê em {user_id}/..., admin lê tudo
create policy comprovantes_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy comprovantes_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy comprovantes_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy comprovantes_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'comprovantes' and ((storage.foldername(name))[1] = auth.uid()::text
         or private.has_role(auth.uid(),'admin')));
create policy comprovantes_admin_all on storage.objects for all to authenticated
  using (bucket_id = 'comprovantes' and private.has_role(auth.uid(),'admin'))
  with check (bucket_id = 'comprovantes' and private.has_role(auth.uid(),'admin'));

-- certificados
create policy certificados_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'certificados' and ((storage.foldername(name))[1] = auth.uid()::text
         or private.has_role(auth.uid(),'admin')));
create policy certificados_admin_write on storage.objects for all to authenticated
  using (bucket_id = 'certificados' and private.has_role(auth.uid(),'admin'))
  with check (bucket_id = 'certificados' and private.has_role(auth.uid(),'admin'));

-- materiais (admin)
create policy materiais_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'materiais' and private.has_role(auth.uid(),'admin'));
create policy materiais_admin_write on storage.objects for all to authenticated
  using (bucket_id = 'materiais' and private.has_role(auth.uid(),'admin'))
  with check (bucket_id = 'materiais' and private.has_role(auth.uid(),'admin'));

-- perfil
create policy perfil_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'perfil' and ((storage.foldername(name))[1] = auth.uid()::text
         or private.has_role(auth.uid(),'admin')));
create policy perfil_owner_write on storage.objects for all to authenticated
  using (bucket_id = 'perfil' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'perfil' and (storage.foldername(name))[1] = auth.uid()::text);

-- capas (leitura pública, escrita admin)
create policy "capas leitura publica" on storage.objects for select to public
  using (bucket_id = 'capas');
create policy "capas admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'capas' and private.has_role(auth.uid(),'admin'));
create policy "capas admin update" on storage.objects for update to authenticated
  using (bucket_id = 'capas' and private.has_role(auth.uid(),'admin'));
create policy "capas admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'capas' and private.has_role(auth.uid(),'admin'));

-- ------------------------------------------------------------
-- 8) Pós-migração (opcional, sem dados de teste)
-- ------------------------------------------------------------
-- Registro único de configuração de PIX (preencha depois pelo painel):
-- insert into public.configuracoes_pagamento (beneficiario, tipo_chave, pix_chave)
--   values ('Ruth', 'telefone', '41 99213-4801');
--
-- Promover um usuário a admin (após ele criar conta no Auth do novo projeto):
-- insert into public.user_roles (user_id, role)
--   select id, 'admin' from auth.users where email = 'seu-email@dominio.com'
--   on conflict (user_id, role) do nothing;
