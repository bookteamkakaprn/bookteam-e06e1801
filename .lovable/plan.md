# Diagnóstico: `app/duplicate-app` no SSR (Worker bookteam)

## Causa raiz confirmada

Existem **duas** inicializações do Firebase Web SDK em escopo de módulo, com **configs diferentes**:

| Arquivo | Linha | Chamada | Config |
| --- | --- | --- | --- |
| `src/firebase.ts` | 18 | `getApps().length ? getApp() : initializeApp(cfg)` (guardado) | inclui `measurementId` |
| `src/integrations/supabase/client.ts` | 36 | `initializeApp(firebaseConfig)` (**sem guarda**) | **sem** `measurementId` |

`client.ts` chama `initializeApp` direto, sem `getApps()`. Quando os dois módulos são avaliados no mesmo runtime, o segundo `initializeApp` recebe options diferentes do app `[DEFAULT]` já existente e o Firebase lança exatamente `app/duplicate-app`. A guarda que já foi adicionada em `src/firebase.ts` não protege nada, porque o problema está no outro arquivo.

## Cadeia de imports que coloca isso no bundle SSR

```text
src/routeTree.gen.ts                (importa TODAS as rotas — vira _ssr/router-*.mjs)
  ├─ src/routes/_authenticated/route.tsx
  │     ├─ import { auth } from "@/firebase"            → initializeApp #1 (com measurementId)
  │     └─ import { useAuth } from "@/hooks/useAuth"
  │            └─ import { auth, db } from "@/integrations/supabase/client"  → initializeApp #2 (sem measurementId)  ❌
  ├─ src/routes/auth.tsx → @/hooks/useAuth → @/integrations/supabase/client   ❌
  └─ ~25 outras rotas (_admin/*, _authenticated/*, livros.$id, trilhas.$id, cadastro.$turmaId, reset-password)
        └─ import { supabase } from "@/integrations/supabase/client"          ❌
```

Observações importantes:
- `ssr: false` em `_authenticated/route.tsx` desliga a **renderização**, não o **import**; o módulo continua no grafo SSR.
- Tornar o import do Firebase dinâmico no `__root.tsx` não ajudou porque o `routeTree` já importa estaticamente `client.ts` a partir de dezenas de rotas.
- O frame `_ssr/router-Dgr687yu.mjs:241` no stack trace é exatamente o chunk gerado a partir do `routeTree`, o que bate com esse diagnóstico.
- `src/integrations/supabase/auth-middleware.ts` usa `firebase-admin` (outro SDK, com guarda própria) — não é a causa.

## Correção mínima recomendada

Apenas 1 arquivo precisa mudar: **`src/integrations/supabase/client.ts`**.

1. Trocar a inicialização por reuso do app existente, exatamente como em `src/firebase.ts`:
   - `import { getApp, getApps, initializeApp } from 'firebase/app'`
   - `const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)`
2. Melhor ainda (elimina a divergência de options de vez): fazer `client.ts` **reexportar** de `@/firebase` em vez de manter um segundo config:
   ```ts
   export { app, auth, db } from "@/firebase";
   export const supabase = null as any; // compat temporária
   ```
   Assim passa a existir uma única fonte de config e um único `initializeApp` no projeto inteiro.
3. Remover o `throw new Error("Missing Firebase environment variable(s)…")` em escopo de módulo (linhas 21-25). No Worker as envs são injetadas por requisição; um throw em escopo de módulo derruba **todas** as rotas com 500 mesmo sem o problema de duplicate-app. Se a validação for desejada, ela deve rodar dentro de função, não no topo do módulo.

Opcional (não necessário para o fix): depois disso, o import dinâmico do Firebase no `__root.tsx` pode voltar a ser estático, já que só existirá uma inicialização idempotente.

## Nada foi alterado

Esta análise é somente leitura. Nenhum arquivo do projeto foi modificado.
