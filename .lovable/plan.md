## Objetivo

Permitir que o participante escolha uma trilha (vinculada aos livros), veja detalhes (descrição, vagas, dados PIX), envie o comprovante de pagamento (PDF ou foto) e acompanhe o status da inscrição.

## Modelo de dados (Lovable Cloud)

Novas tabelas em `public`:

- **trilhas** — `id`, `slug`, `nome`, `descricao`, `nivel` (básico/avançado), `vagas_total`, `preco_centavos`, `pix_chave`, `pix_beneficiario`, `pix_cidade`, `ativa`, timestamps.
- **livros** — `id`, `trilha_id` (FK), `titulo`, `autor`, `ordem`, `capa_url`, timestamps.
- **inscricoes** — `id`, `user_id` (auth.users), `trilha_id` (FK), `status` (`pendente_pagamento` | `nao_validado` | `validado` | `confirmada` | `recusada`), `comprovante_url`, `comprovante_enviado_em`, `validado_por`, `validado_em`, `observacao`, timestamps. Unique (user_id, trilha_id).
- **user_roles** (padrão) + enum `app_role` (`admin`, `participante`) + função `has_role` para separar admin (valida comprovantes) do participante.

RLS:
- `trilhas`/`livros`: SELECT público (anon + authenticated) onde `ativa = true`; escrita apenas admin.
- `inscricoes`: participante lê/insere/atualiza (upload comprovante) apenas as suas; admin lê/atualiza todas (via `has_role`).

Storage:
- Bucket privado `comprovantes` (max ~10MB, tipos: `application/pdf`, `image/*`).
- Políticas: usuário faz upload/leitura apenas de arquivos sob `comprovantes/{user_id}/...`; admin lê tudo.

Seed inicial: 2 trilhas ("Book Team Básico", "Book Team Avançado") já vinculadas aos 4 livros existentes na landing, com dados PIX de exemplo (editáveis depois).

## Fluxo do usuário

1. Na landing, cada card de livro passa a linkar para `/trilhas/$slug` (a trilha do livro).
2. Nova rota pública `/trilhas/$slug` mostra: nome, descrição, nível, lista de livros ordenados, vagas (X restantes de Y), preço, botão **"Quero me inscrever"**.
3. Se não logado → redireciona para `/auth` guardando destino.
4. Se logado → rota protegida `/_authenticated/inscricao/$slug`:
   - Se ainda não há inscrição → mostra dados PIX (chave, beneficiário, valor, QR/copia-e-cola simples) e área de upload do comprovante. Ao enviar, cria `inscricoes` com status `nao_validado`.
   - Se já existe inscrição → mostra card de status atual + timeline e permite reenviar comprovante se `recusada`/`pendente_pagamento`.
5. Dashboard `/_authenticated/inicio` (já existe) ganha bloco "Minhas inscrições" com status colorido.

## Status e regras

- `pendente_pagamento` — inscrição criada sem comprovante (opcional; hoje o botão já força upload, então normalmente pula direto para o próximo).
- `nao_validado` — comprovante enviado, aguardando admin.
- `validado` — admin marcou como pago.
- `confirmada` — vaga oficial garantida (admin confirma após validar).
- `recusada` — comprovante inválido; participante pode reenviar.

Vagas contam apenas inscrições com status `validado` ou `confirmada`.

## Área admin

Rota `/_authenticated/admin/inscricoes` (visível apenas se `has_role('admin')`):
- Lista inscrições com filtro por status.
- Visualiza comprovante (link assinado do storage).
- Botões: **Validar**, **Confirmar**, **Recusar** (com observação opcional).

## Detalhes técnicos

- Server functions em `src/lib/inscricoes.functions.ts` com `requireSupabaseAuth`:
  - `criarInscricao({ trilha_slug })`
  - `enviarComprovante({ inscricao_id, storage_path })` (path é validado começar com `${userId}/`)
  - `minhasInscricoes()`
  - Admin: `listarInscricoes(filtro)`, `atualizarStatus({ inscricao_id, status, observacao })`
- Upload direto do browser via `supabase.storage.from('comprovantes').upload(...)` para `${userId}/${inscricao_id}/${timestamp}.{ext}`.
- Validação Zod em todos os inputs. Tipos MIME e tamanho verificados no cliente antes do upload.
- Landing (`src/routes/index.tsx`): trocar carrossel de livros hardcoded para ler `trilhas`+`livros` via server fn pública, e cards viram `<Link to="/trilhas/$slug">`.

## Arquivos afetados

- Nova migração SQL (tabelas, RLS, grants, seeds, bucket policies).
- `src/lib/inscricoes.functions.ts`, `src/lib/trilhas.functions.ts` (novos).
- `src/routes/trilhas.$slug.tsx` (nova pública).
- `src/routes/_authenticated/inscricao.$slug.tsx` (nova).
- `src/routes/_authenticated/admin/inscricoes.tsx` (nova).
- `src/routes/_authenticated/inicio.tsx` (adicionar bloco de inscrições).
- `src/routes/index.tsx` (livros/cards passam a linkar para as trilhas).

## Fora do escopo desta fase

- Geração real de QR Code PIX dinâmico (usaremos chave copia-e-cola + valor; QR pode vir depois).
- Notificações por e-mail em mudança de status.
- Reembolso/cancelamento pelo participante.

Confirma que sigo com essa estrutura?
