# Otimizações Speed Insights (LCP)

Melhorias aplicadas para reduzir LCP nas rotas mais lentas do Vercel Speed Insights.

## Estado (abril 2026)

- **`NEXT_PUBLIC_DISABLE_SPEED_INSIGHTS=true`** (variável de ambiente): desativa só o pacote **Speed Insights** em `components/VercelMetrics.tsx`; **Analytics** mantém-se. Útil se aparecerem avisos de preload de recursos de terceiros (ex.: scripts associados ao produto Vercel).
- O **dashboard** evoluiu (carrosséis «Sua próxima aula» / «Aulas livres»); o skeleton de loading pode não refletir o layout atual linha-a-linha — o objetivo continua a ser LCP percebido.

## Alterações realizadas

### 1. Skeletons de loading (LCP percebido)
- **Dashboard** (`/dashboard`): Skeleton que imita NextLessonCard, WarriorPanel e WhatIsNew
- **Admin** (`/admin`): Skeleton com KPIs e área de gráficos
- **Coach** (`/coach`): Skeleton com cards de aula e atletas
- **Admin alunos** (`/admin/alunos/[id]`): Skeleton do formulário de edição
- **Admin leads** (`/admin/leads`): Skeleton da lista de leads
- **Sign-in** (`/sign-in`): Skeleton do formulário de login

### 2. Layout paralelizado
- **Dashboard layout**: `getPlanAccess` e `Student.planId` agora correm em paralelo (`Promise.all`)

### 3. Admin – gráficos
- **OverviewCharts**: Carregamento dinâmico com `next/dynamic` e `ssr: false`
- Reduz o bundle inicial e o recharts só é carregado quando necessário

## Rotas com LCP mais alto (antes)

| Rota | LCP |
|------|-----|
| /dashboard | 10.04s |
| /admin | 7.77s |
| /admin/alunos/[id] | 8.15s |
| /admin/leads | 8.2s |
| /coach | 6.15s |
| /sign-in | 5.46s |

## Estado (abril 2026) — dashboard aluno e performance

- **`/dashboard`:** secção **Painel do Guerreiro + O que há de novo + próximos eventos (slot) + Explorar** em `app/dashboard/DashboardBelowFold.tsx` (async) com `<Suspense>` — primeiro paint com menos serialização RSC. Fallback com skeleton leve.
- **Sidebar:** `prefetch={false}` em `/como-sou-avaliado` e `/sistema-pontuacao` (evita prefetch longo de páginas informativas pesadas).
- **`/dashboard/performance`:** radar sem Recharts (SVG); lazy-load de secções; ver também `memory.md` §3.14.

## Próximos passos (opcional)

1. **Cache de dados** – `unstable_cache` para queries pesadas no **admin** (ex.: `getAdminDashboardStats` com revalidate 60s) — **não** aplicar de forma a stalear configs de avaliação em rotas dinâmicas.
2. **Streaming** – Continuar a aplicar Suspense/async onde fizer sentido (ex.: outras páginas com muitos dados acima do fold).
3. **Prefetch** – Manter prefetch por defeito em rotas leves; usar `prefetch={false}` só em rotas pesadas ou raramente visitadas.
4. **Imagens** – `priority` em imagens above-the-fold e `loading="lazy"` em abaixo.
5. **Medição** – Re-correr Lighthouse / Speed Insights em **produção** após deploy para validar ganhos.

---

*Referência cruzada: [INDEX.md](INDEX.md), [memory.md](memory.md), [NOTIFICACOES_IN_APP_E_EVENTOS.md](NOTIFICACOES_IN_APP_E_EVENTOS.md) — maio 2026.*
