# Setup: Admin Configurações (Depoimentos, FAQ, Config Geral)

Execute as queries SQL abaixo no Supabase SQL Editor para criar as tabelas necessárias.

## 1. Tabela DEPOIMENTOS

```sql
CREATE TABLE depoimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  autor TEXT NOT NULL,
  cidade TEXT NOT NULL,
  nota INTEGER DEFAULT 5 CHECK (nota >= 1 AND nota <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policy
ALTER TABLE depoimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins to read depoimentos"
ON depoimentos FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'email' IN (SELECT email FROM admins));

CREATE POLICY "Allow admins to insert depoimentos"
ON depoimentos FOR INSERT
TO authenticated
WITH CHECK (auth.jwt() ->> 'email' IN (SELECT email FROM admins));

CREATE POLICY "Allow admins to update depoimentos"
ON depoimentos FOR UPDATE
TO authenticated
USING (auth.jwt() ->> 'email' IN (SELECT email FROM admins));

CREATE POLICY "Allow admins to delete depoimentos"
ON depoimentos FOR DELETE
TO authenticated
USING (auth.jwt() ->> 'email' IN (SELECT email FROM admins));

-- Public pode ler
CREATE POLICY "Allow public to read depoimentos"
ON depoimentos FOR SELECT
USING (true);
```

## 2. Tabela FAQ

```sql
CREATE TABLE faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  ordem INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policy
ALTER TABLE faq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins to read faq"
ON faq FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'email' IN (SELECT email FROM admins));

CREATE POLICY "Allow admins to insert faq"
ON faq FOR INSERT
TO authenticated
WITH CHECK (auth.jwt() ->> 'email' IN (SELECT email FROM admins));

CREATE POLICY "Allow admins to update faq"
ON faq FOR UPDATE
TO authenticated
USING (auth.jwt() ->> 'email' IN (SELECT email FROM admins));

CREATE POLICY "Allow admins to delete faq"
ON faq FOR DELETE
TO authenticated
USING (auth.jwt() ->> 'email' IN (SELECT email FROM admins));

-- Public pode ler
CREATE POLICY "Allow public to read faq"
ON faq FOR SELECT
USING (true);
```

## 3. Tabela CONFIG_GERAL

```sql
CREATE TABLE config_geral (
  id TEXT PRIMARY KEY DEFAULT '1',
  instagram TEXT,
  whatsapp TEXT,
  email TEXT,
  endereco TEXT,
  telefone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policy
ALTER TABLE config_geral ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins to read config"
ON config_geral FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'email' IN (SELECT email FROM admins));

CREATE POLICY "Allow admins to update config"
ON config_geral FOR UPDATE
TO authenticated
USING (auth.jwt() ->> 'email' IN (SELECT email FROM admins));

-- Public pode ler
CREATE POLICY "Allow public to read config"
ON config_geral FOR SELECT
USING (true);

-- Inserir config padrão
INSERT INTO config_geral (id, instagram, whatsapp, email, endereco, telefone)
VALUES ('1', '@bookteam', '(41) 99999-9999', 'contato@bookteam.com.br', 'Curitiba, PR', '(41) 3333-3333')
ON CONFLICT (id) DO NOTHING;
```

## 4. Tabela ADMINS (caso não exista)

Se a tabela `admins` não existir, criar:

```sql
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read their own admin status"
ON admins FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'email' = email);
```

---

## Como Adicionar Admin

```sql
INSERT INTO admins (email)
VALUES ('seu.email@example.com')
ON CONFLICT (email) DO NOTHING;
```

## ✅ Pronto!

Agora a aba **Configurações** no admin está funcional!
