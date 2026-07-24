## Book Clube — Plano de Construção

Plataforma completa para gestão de clube de leitura com trilhas, eventos presenciais, pagamentos PIX manuais e certificados. Dado o escopo (11 tabelas, 2 perfis, painel admin + área do participante + landing), proponho entregar em **fases incrementais** para manter qualidade e permitir validação a cada etapa.

### Stack
- **Frontend:** TanStack Start + React + TypeScript + Tailwind v4 + shadcn/ui
- **Backend:** Lovable Cloud (Supabase) — Auth, Postgres com RLS, Storage
- **Bibliotecas:** TanStack Query, react-hook-form + Zod, Recharts (dashboard), jsPDF (certificados/export), xlsx (export Excel)

### Design
- Visual moderno, caloroso e literário (não corporativo genérico)
- Paleta: tons terrosos/creme + accent primário (a definir na Fase 1)
- Mobile-first, componentes grandes e legíveis (usuários pouco técnicos)
- Dark mode automático via tokens semânticos

---

### Fase 1 — Fundação (entrega inicial)
1. Ativar Lovable Cloud
2. Design system completo em `src/styles.css` (tokens oklch, tipografia, radius)
3. Schema Supabase completo — 11 tabelas com RLS, grants, enums, FKs, índices
4. Buckets de Storage: `comprovantes` (privado), `certificados` (privado), `materiais` (privado), `perfil` (público)
5. Sistema de roles (`user_roles` + enum `app_role` + `has_role()` security definer)
6. Trigger `handle_new_user` cria linha em `participantes` no signup
7. Auth: cadastro (com CPF, telefone, cidade, estado, LGPD), login, recuperação de senha, página `/reset-password`
8. Layout protegido `_authenticated/` + gate admin `_authenticated/_admin/`
9. Landing page pública com Hero, Como funciona, Trilhas, Próximos eventos, Depoimentos, FAQ, Footer

### Fase 2 — Núcleo do participante
10. Perfil (edição + upload foto)
11. Listagem de trilhas e livros
12. Listagem de eventos + página de detalhe com vagas restantes
13. Fluxo de inscrição → status "aguardando pagamento"
14. Tela PIX: QR code, copia-e-cola, chave, upload de comprovante
15. Dashboard do participante: próximo evento, trilha atual, livro atual, histórico, pagamentos, certificados, materiais

### Fase 3 — Painel administrativo
16. Layout admin com menu lateral (Sidebar shadcn)
17. Dashboard com cards + gráficos (Recharts): inscrições/mês, receita/mês, participantes/trilha
18. CRUD: Trilhas, Livros (com materiais PDF/vídeo), Eventos
19. Aprovação de pagamentos: lista, visualizar comprovante, aprovar/rejeitar
20. Presença: check-in por evento com timestamp
21. Emissão de certificados (PDF gerado com jsPDF, salvo em Storage)
22. CRM: lista de participantes com filtros (cidade, trilha, status, evento), busca, ficha completa com observações
23. Exportação: Excel / CSV / PDF de participantes, inscrições, pagamentos, presenças, certificados

### Fase 4 — Polimento
24. Estrutura de notificações (tabela `notificacoes` + service layer, sem envio real)
25. Empty states, skeletons, confirmações de exclusão, paginação, busca em tempo real
26. SEO da landing, sitemap, robots
27. Testes manuais de fluxos críticos

---

### Modelagem de dados (resumo)

```text
usuarios (auth.users)
  └─ user_roles (admin | participante)
  └─ participantes (perfil estendido: cpf, telefone, cidade, estado, foto, status CRM)

trilhas ──< livros (ordem sequencial)
              └─< materiais (pdf | video)

eventos (livro_id, cidade, local, data, hora, valor, vagas, status)
  └─< inscricoes (participante_id, status: aguardando_pagamento | confirmada | cancelada)
       └─ pagamentos (comprovante_url, status: aguardando | aprovado | rejeitado)
       └─ presencas (presente, horario_checkin)
       └─ certificados (pdf_url, carga_horaria)

observacoes (participante_id, autor_id, texto) — CRM
```

Progresso do participante em uma trilha = próximo livro cuja `ordem` sucede o último livro com evento concluído + presença.

### RLS (resumo)
- `participantes`: usuário lê/edita a própria linha; admin lê tudo
- `inscricoes`, `pagamentos`, `presencas`, `certificados`: usuário lê os próprios; admin lê/escreve tudo
- `trilhas`, `livros`, `eventos`, `materiais`: leitura pública (para landing) ou autenticada; escrita admin
- `observacoes`: apenas admin
- Aprovação de pagamento confirma inscrição via server function admin

### Fora de escopo (explicitado)
- Integração PIX automática (apenas comprovante manual)
- Envio real de WhatsApp/Email/Push (apenas estrutura)
- App mobile nativo, gamificação

---

### Confirmações antes de começar

1. **Começo pela Fase 1 completa** nesta rodada (fundação + auth + landing) e sigo para as próximas fases nas mensagens seguintes? Ou prefere que eu entregue tudo de uma vez (resposta muito longa, maior risco de erros)?
2. **Chave PIX / QR Code**: será uma chave única configurável pelo admin (ex.: config global) ou uma chave por evento?
3. **Primeiro admin**: crio via seed no banco com um email que você me informar depois, ou promovo manualmente no Supabase após o primeiro cadastro?
4. **Identidade visual**: alguma cor/estilo obrigatório (ex.: cor da marca), ou tenho liberdade para propor uma paleta literária moderna?