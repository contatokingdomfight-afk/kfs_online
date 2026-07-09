# Performance e Login com Google

> Alterações feitas para reduzir lentidão e corrigir o problema de “primeira tentativa de login Google falha, segunda funciona”.

---

## 1. Login com Google – primeira tentativa

### Problema
Na primeira tentativa de login com Google, o utilizador era redirecionado mas não entrava; na segunda tentativa funcionava.

### Causa provável
1. O **middleware** chamava `getUser()` também em `/auth/callback`, interferindo com o fluxo PKCE (verifier/código) — sobretudo em **PWA/mobile**.
2. A troca do código no **servidor** (`route.ts`) dependia dos cookies PKCE escritos no browser; em alguns retornos do Google esses cookies não chegavam de forma fiável à 1.ª request.

### Solução implementada (2026-07)
- **Middleware:** bypass total em `/auth/callback` (sem `getUser()`).
- **Callback:** página client (`app/auth/callback/page.tsx`) faz `exchangeCodeForSession` no browser (mesmo contexto que iniciou o OAuth), depois `POST /api/auth/complete-oauth` para `syncUser` no servidor.
- **Sign-in:** ao voltar a tentar Google, limpa `?error=exchange_failed` da URL.

### Solução anterior (ainda válida como contexto)
- **Callback (`/auth/callback`):** Depois de `exchangeCodeForSession(code)`, passávamos a chamar `syncUser(session.user)` no próprio callback. Assim, o `User` e o `Student` são criados/atualizados na mesma requisição do callback, antes do redirect para o dashboard.

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

## 3. Menos round-trips no dashboard do aluno

### Alterações feitas
- **Reutilização do Athlete:** O dashboard do aluno fazia duas chamadas à tabela `Athlete` (uma no batch principal para avaliações, outra depois para estatísticas e missões). Passámos a pedir `id, currentBelt, currentXP` já no primeiro batch e a reutilizar esse resultado para o bloco de estatísticas (faixa, XP, total de presenças) e missões, eliminando uma query e uma query extra a `Student` para `primaryModality`.
- **primaryModality:** O `primaryModality` do aluno passou a ser lido na primeira query a `Student` (junto com `schoolId`, `planId`) e guardado em `studentPrimaryModality`, evitando uma segunda leitura a `Student` no bloco de missões.

---

## 4. Recomendações futuras (opcional)

- **Cache de dados pouco voláteis:** As configurações de avaliação já usam `unstable_cache` (5 min). Para listas como `Location` ou `ModalityRef` (pouco voláteis), considerar o mesmo com TTL 60–300 s.
- **Streaming (Suspense):** O dashboard do aluno continua a fazer muitas queries num único request. Dividir a página em componentes que fazem fetch próprio e envolvê-los em `<Suspense>` permite mostrar primeiro o “above the fold” (próxima aula, presenças) e streamar o resto (estatísticas, missões, performance, notificações).
- **Lazy de componentes pesados:** Componentes com muitas dependências (ex.: gráficos Recharts) podem ser carregados com `next/dynamic` e `loading` para não bloquear o first paint.
- **Índices na BD:** Implementado em `prisma/migrations/add_performance_indexes.sql`: `Lesson.date`, `Lesson.schoolId+date`, `Attendance.studentId`, `Attendance.studentId+status`.
- **Supabase:** Se a latência à BD for alta, rever a região do projeto Supabase (proximidade ao servidor Next.js) e o plano (conexões e recursos).

---

## 5. Melhorias implementadas (2026-03)

- **Índices:** Migration `add_performance_indexes.sql` com índices em Lesson (date, schoolId+date) e Attendance (studentId, studentId+status).
- **next/dynamic:** `PerformanceRadar` e `RadarStats` carregados via `PerformanceRadarDynamic` e `RadarStatsDynamic` (ssr: false, loading placeholder) para reduzir first-load JS.
- **Cache Location/ModalityRef:** `lib/cached-reference-data.ts` com `getCachedLocations(supabase)` e `getCachedModalityRefs(supabase)` (unstable_cache, revalidate 300s). Usado em dashboard, admin (turmas, alunos), coach (aula, alunos, performance). Em `app/dashboard/page.tsx`, `getCachedLocations` é consumida via re-export em `lib/plan-access.ts` (junto com `getCachedPlanAccess`) para estabilidade do build.
- **Streaming (Suspense):** Dashboard do aluno: a página principal (`app/dashboard/page.tsx`) faz o fetch da agenda (aulas da semana, locais, presenças, carrosséis). O bloco **abaixo da dobra** para quem tem plano está em `<Suspense>` com o componente async **`DashboardBelowFold`** (`app/dashboard/DashboardBelowFold.tsx`): Painel do guerreiro, carrossel opcional de aulas livres, «O que há de novo», **próximos eventos** (`upcomingEventsSlot`), secção **Explorar**. A agenda é enviada primeiro; o resto quando o servidor termina `DashboardBelowFold`.
- **Semana em Lisboa (2026):** `getThisWeekRangeLisbon` + datas do cartão alinhadas a `calendarDateLisbon` — ver `DOCS/memory.md` (*Dashboard aluno*).

---

*Última atualização:* índices, next/dynamic, cache Location/ModalityRef, Suspense com `DashboardBelowFold` no dashboard; fevereiro 2026 — re-export `getCachedLocations` em `plan-access`, semana Lisboa, filtro Presencial I; **maio 2026** — strip próximos eventos + doc notificações (`NOTIFICACOES_IN_APP_E_EVENTOS.md`).

---

*Referência cruzada: [INDEX.md](INDEX.md), [memory.md](memory.md) — fevereiro 2026; maio 2026 — notificações/eventos.*
