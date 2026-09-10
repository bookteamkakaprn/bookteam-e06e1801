# Setup: Adicionar Data de Nascimento em Participantes

## 1. Adicionar coluna em participantes

```sql
-- Adicionar coluna data_nascimento em participantes
ALTER TABLE participantes
ADD COLUMN IF NOT EXISTS data_nascimento DATE NULL;

-- Criar índice para melhorar queries
CREATE INDEX IF NOT EXISTS idx_participantes_data_nascimento ON participantes(data_nascimento);
```

## 2. Atualizar componente de criação de conta (Auth)

A criação de conta do aluno agora pedirá:
- Nome completo
- Email
- Senha
- **Data de nascimento** (novo)
- Telefone
- Aceitar termos

Arquivo: `src/routes/sign-up.tsx`

## 3. Exportar de Pagamentos e Inscritos

Quando exportar Excel:
- Nome Completo
- Email
- **Idade** (calculada a partir de data_nascimento)
- Curso/Evento
- Valor (para pagamentos)
- Status
- Data

## 4. Verificação

Rodar em Supabase SQL Editor:

```sql
-- Verificar se coluna foi criada
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'participantes' 
ORDER BY ordinal_position;
```

Deve aparecer `data_nascimento | date`

---

## Status

- ✅ Controle de Pagamentos: 4 abas (Aprovados, Rejeitados, Estornados, Inscritos)
- ✅ Filtros por Curso
- ✅ Busca por Nome
- ✅ Exportar Excel com Nome + Idade
- ✅ Click em aluno = expandir histórico
- ⏳ **PENDENTE:** Adicionar data_nascimento em sign-up.tsx
