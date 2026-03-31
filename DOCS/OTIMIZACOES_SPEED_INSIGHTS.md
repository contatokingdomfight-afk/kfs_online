# Otimizações Speed Insights (LCP)

Melhorias aplicadas para reduzir LCP nas rotas mais lentas do Vercel Speed Insights.

## Estado (março 2026)

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

## Próximos passos (opcional)

1. **Cache de dados** – `unstable_cache` para queries pesadas no admin (ex.: `getAdminDashboardStats` com revalidate 60s)
2. **Streaming** – Dividir páginas em componentes async com Suspense para stream progressivo
3. **Prefetch** – `prefetch` em links críticos do dashboard
4. **Imagens** – `priority` em imagens above-the-fold e `loading="lazy"` em abaixo

---

*Referência cruzada: [INDEX.md](INDEX.md), [memory.md](memory.md) — março 2026.*
