# Performance e Login com Google

> Alterações feitas para reduzir lentidão e corrigir o problema de “primeira tentativa de login Google falha, segunda funciona”.

---

## 1. Login com Google – primeira tentativa

### Problema
Na primeira tentativa de login com Google, o utilizador era redirecionado mas não entrava; na segunda tentativa funcionava.

### Causa provável
Após o redirect do Google para `/auth/callback`, o código trocava o `code` por sessão e redirecionava para `/dashboard`. No primeiro carregamento do dashboard, a página chamava `syncUser()` para criar/atualizar o registo em `User` e `Student`. Se isso fosse lento ou falhasse (ex.: escola padrão não encontrada), o utilizador podia ver erro ou ser enviado de volta ao login. Na segunda vez o `User`/`Student` já existiam, por isso o fluxo era rápido.

### Solução implementada
- **Callback (`/auth/callback`):** Depois de `exchangeCodeForSession(code)`, passamos a chamar `syncUser(session.user)` no próprio callback. Assim, o `User` e o `Student` são criados/atualizados na mesma requisição do callback, antes do redirect para o dashboard.
- O redirect para `/dashboard` acontece só após o sync (em `try/catch`; se o sync falhar, registamos o erro mas continuamos a redirecionar para o utilizador não ficar preso).

---

## 2. Performance – menos trabalho por pedido

### Problema
A plataforma estava lenta ao mudar de página ou ao fazer ações (muitas chamadas à BD e `syncUser` repetido).

### Alterações feitas

#### A) Cache por pedido em `getCurrentDbUser`
- `getCurrentDbUser()` passou a usar `cache()` do React (request deduplication).
- Na mesma renderização (layout + página), várias chamadas a `getCurrentDbUser()` passam a partilhar o mesmo resultado, sem voltar a chamar `syncUser` e a BD.

#### B) Eliminar `syncUser` duplicado
- `getCurrentStudentId()` deixou de chamar `syncUser` diretamente e passou a usar `getCurrentDbUser()` (que já está em cache). Assim, cada pedido faz no máximo um sync por utilizador.
- O dashboard e o check-in passaram a usar `getCurrentDbUser()` + `getCurrentStudentId()` em vez de chamar `syncUser` à parte.

#### C) Loading states
- Foram adicionados ficheiros `loading.tsx` em:
  - `app/dashboard/loading.tsx`
  - `app/admin/loading.tsx`
  - `app/coach/loading.tsx`
- Ao navegar para estas áreas, o Next.js mostra de imediato “A carregar…” em vez de ecrã em branco, melhorando a perceção de velocidade.

---

## 3. Recomendações futuras (opcional)

- **Cache de dados pouco voláteis:** Para dados que mudam raramente (ex.: configurações de avaliação, lista de modalidades), considerar `unstable_cache` (Next.js) com TTL de 60–300 segundos para reduzir leituras à BD.
- **Streaming:** O dashboard do aluno faz muitas queries; manter o uso de `Promise.all` onde já existe e, se necessário, dividir a página em componentes que fazem `Suspense` para o conteúdo mais pesado carregar depois do “above the fold”.
- **Lazy de componentes pesados:** Componentes com muitas dependências (ex.: gráficos Recharts) podem ser carregados com `next/dynamic` e `loading` para não bloquear o first paint.
- **Índices na BD:** Garantir índices em colunas usadas em `WHERE` e `ORDER BY` (ex.: `Lesson.date`, `Attendance.studentId`, `Student.userId`).
- **Supabase:** Se a latência à BD for alta, rever a região do projeto Supabase (proximidade ao servidor Next.js) e o plano (conexões e recursos).

---

*Última atualização: alterações no callback OAuth, cache de getCurrentDbUser e loading.tsx.*
