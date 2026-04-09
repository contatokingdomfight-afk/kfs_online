# Índice de contexto (memory) – KFS Online

> **Para continuar noutro chat:** lê este ficheiro primeiro; a documentação de produto e decisões está em **`DOCS/`** (não em `docs/`). Regra do projeto: `.cursor/rules/documentacao-projeto.mdc`.

**Última revisão:** abril 2026.

---

## 1. O que é o projeto

- **Nome repo:** `kfs_online` (ex.: GitHub `contatokingdomfight-afk/kfs_online`).
- **Produto:** Plataforma Kingdom Fight School — alunos, coaches, admin; presenças, planos, biblioteca, gamificação, financeiro (Stripe + presencial), multi-escola.
- **Stack:** Next.js **15** (App Router), React 18, TypeScript, Tailwind, **Supabase** (Auth + Postgres), Prisma (schema alinhado à BD), Vercel, Stripe, Resend.
- **Node:** `20.x` (`package.json` engines).

---

## 2. Onde está cada coisa

| Área | Local |
|------|--------|
| Rotas e páginas | `app/` |
| Componentes | `components/` |
| Lógica partilhada | `lib/` |
| Migrações SQL Supabase | `supabase/migrations/` |
| Schema Prisma | `prisma/schema.prisma` |
| Scripts (ex.: seed testes) | `scripts/seed-test-users.ts` |
| Documentação canónica | **`DOCS/`** — índice de ficheiros: **`DOCS/INDEX.md`** |
| Roadmap feito/por fazer | `DOCS/ROADMAP_Plataforma_KFS.md` |
| Mensalidades / crons / Lisboa | `DOCS/PAGAMENTOS_MENSALIDADES_CRON.md` |
| Contas de teste + `npm test` | `DOCS/CONTAS_TESTE.md` |
| Checklist manual por perfil | `DOCS/GUIA_TESTE_VALIDACAO_PERFIS.md` |
| Índice na raiz | `INDICE_DOCUMENTACAO.md`, `README.md`, `PROXIMOS_PASSOS.md` |

---

## 3. Entregas recentes (contexto técnico)

### 3.1 Aulas livres (`Lesson.isOpenClass`)

- **Regra:** Qualquer aluno da **escola** pode participar (dashboard, RSVP, check-in), **incluindo sem `planId`** ou plano sem check-in.
- **Dashboard (aluno):** Aulas da **própria escola** + **todas** as aulas com `isOpenClass` de **qualquer** unidade (rede Kingdom Fight). A agenda da semana (**hoje → domingo**) usa **`expandLessonsForDateRange`** para incluir recorrentes (`Lesson.date` nulo). **Todas** as aulas relevantes aparecem; RSVP/check-in só quando `isLessonParticipationAllowedByPlan` (plano, `hasCheckIn`, modalidade). Cartões com mensagens se plano sem check-in ou modalidade fora do plano. **Presenças:** `Attendance.occurrenceDate`; check-in `/check-in/[id]?date=YYYY-MM-DD`.
- **Admin / turmas:** Criar aula com `SUPABASE_SERVICE_ROLE_KEY` (cliente admin) quando disponível; o coach **tem de** estar associado à escola da aula (`CoachSchool`). Lista de coaches filtrada por escola. Filtro `?school=` na lista (por semana / por modalidade).
- **Coach ↔ escolas (N:N):** tabela `CoachSchool`; cadastro/edição em **Admin → Coaches** (várias escolas por professor). Migração: `supabase/migrations/20260327180000_coach_multi_school.sql`.
- **Ficheiros:** `lib/dashboard-lesson-filter.ts`, `app/dashboard/page.tsx`, `app/dashboard/NextLessonCard.tsx`, `app/dashboard/OpenClassesCarouselShell.tsx` (client só scroll/setas; cartões como `children` do servidor), `app/dashboard/LessonPromoBlock.tsx`, `app/admin/turmas/*`, `app/admin/turmas/actions.ts`, `lib/lesson-check-in-window.ts`, `lib/perform-check-in.ts`, `app/dashboard/actions.ts`.
- **Migração:** `supabase/migrations/20260326140000_lesson_open_class.sql` (se aplicável ao teu projeto Supabase).

### 3.2 Cadastro, auth e onboarding (aluno)

- **Pós-registo:** destino **`/dashboard`** (sem obrigar o wizard). `lib/auth/sync-user.ts` cria `StudentProfile` com `hasCompletedOnboarding: true` para novos alunos; OAuth em `app/auth/callback/route.ts` não redireciona para `/onboarding`.
- **Tour no dashboard:** `StudentOnboardingGate` em `app/dashboard/layout.tsx`; wizard opcional em `app/onboarding/`.
- **Recuperação de senha:** `resetPasswordForEmail` corre numa **Server Action** (`app/auth/forgot-password/actions.ts`) com `createClient` de `@/lib/supabase/server` para o **PKCE code verifier** ficar em **cookies** alinhados ao `@supabase/ssr`. `redirectTo` = `…/auth/callback?next=/auth/update-password`; a troca do `code` é em **`GET /auth/callback`** (servidor). `/auth/update-password` e `/auth/callback` em **`publicPaths`**; Supabase → Redirect URLs: `…/auth/callback` e `…/auth/update-password`.
- **Aula experimental** (`/aula-experimental`): escolha de **escola** + slots por `expandLessonsForDateRange` e `schoolId`; `submitTrialRequest` valida escola, modalidade e ocorrência (`lessonId::occurrenceDate`).
- **Ranking (Rank):** `/dashboard/rank` — classificação por **XP** na **mesma escola** do aluno (só `Student` ATIVO com `Athlete`). RPC Postgres `get_leaderboard_my_school` (`supabase/migrations/20260402120000_leaderboard_school_rpc.sql`); `lib/leaderboard.ts`. Menu e acesso alinhados a **performance** (`hasPerformanceTracking`). RLS não expõe `User`/`Student` de terceiros: o ranking usa função `SECURITY DEFINER`.

### 3.3 Testes e seed

- **Unitários:** `npm test` (Vitest) — `lib/dashboard-lesson-filter.test.ts`.
- **Contas de teste:** `npm run seed:test-users` — precisa `TEST_SEED_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, escola ativa; emails em **`DOCS/CONTAS_TESTE.md`**. Ordem dotenv no script: `.env` → `.env.local` (override); **gravar** `.env` antes de correr.

### 3.3 Financeiro – um pagamento por aluno e mês

- **`createPayment`** consolida linhas em `Payment` para o mesmo `studentId` + `referenceMonth`: registar **Pago** quando já existia **Em atraso** (ex.: mensalidade gerada) **atualiza** o registo em vez de criar duplicado. Ver **`DOCS/PAGAMENTOS_MENSALIDADES_CRON.md`**.

### 3.5 Admin – Turmas

- Vista **por semana** / por modalidade; criação de aulas (incl. recorrente / one-off) — ver `app/admin/turmas/`.
- **Modelo de agenda (2026-04):** uma linha em `Lesson` por **definição**; recorrentes usam `weekday` (1–7) e `date` null; ocorrências na agenda são **expandidas** em memória (`lib/lesson-occurrences.ts`). Cancelamento pontual: `LessonCancellation` (só aquela data). Professores N:N: `LessonCoach` (primeiro espelhado em `Lesson.coachId`). Migração: `supabase/migrations/20260401120000_lesson_template_schedule.sql`.
- **Área Coach** (agenda, presenças na aula, QR, home, presença global, financeiro, experimentais): mesma expansão; links para uma ocorrência usam `?lesson=<id>&date=YYYY-MM-DD`; lista de presenças na aula filtra `Attendance` por `occurrenceDate`. Helper `rowsToLessonDefinitions` em `lib/lesson-occurrences.ts`.

### 3.6 Perfil do atleta – critérios por categoria (resultados de avaliação)

- **Filtro principal** na área «Critérios por categoria» abre com **Técnico** (não Teórico): `components/evaluation-results/EvaluationResultsDashboard.tsx` (`INITIAL_MAIN_CATEGORY`).
- **Controle psicológico** pertence ao pilar **Mental** (não Tática): dimensões `MUAY_MENTAL_PSICOLOGICO` / `BOX_MENTAL_PSICOLOGICO` em `GeneralDimension`; componente `Controle psicológico`. Dados antigos com código `*_TATICO_PSICOLOGICO` são mapeados para o eixo mental em `lib/performance-utils.ts`.
- **Migração:** `supabase/migrations/20260327120000_controle_psicologico_under_mental.sql`.

### 3.7 Admin – Escolas e Coaches (UX)

- **Escolas:** ao criar ou guardar edição de uma escola, `FormLoadingModal` em `EscolasManager` (mensagens «A criar escola…» / «A guardar alterações…»).
- **Ficha do coach:** `app/admin/coaches/[id]/loading.tsx` — estado de carregamento ao navegar para a página de detalhe.
- **Escolas onde leciona:** componente `components/CoachSchoolMultiSelect.tsx` — pesquisa, lista rolável, chips com remoção; ordem define a primeira como «Principal» (alinhado a `schoolIds[0]` em `createCoach`).
- **Turmas / editar aula:** `app/admin/turmas/[id]/loading.tsx` — «A abrir edição…» ao navegar para a edição; no formulário, `FormLoadingModal` «A guardar alterações…»; após guardar com sucesso, redireciona para `/admin/turmas` com a mesma query (`view`, `week`, `school`) via `lib/turmas-list-query.ts`. Locais no select: `getLocationsForSchool` por `schoolId` da aula; `getCachedLocations` usa service role no callback de cache para não devolver lista vazia por cache incorreto.
- **Cancelar aula (edição):** modal em `document.body`. **Recorrente com `?occurrence=YYYY-MM-DD`:** pode **cancelar só essa semana** (`LessonCancellation`) ou **eliminar a definição** (apaga a linha `Lesson`). **Recorrente sem data na URL:** só eliminar definição. **Aula única:** elimina a linha. `lib/admin/delete-lesson.ts` (`performCancelOccurrence`, `performDeleteLessonDefinition`). **`POST /api/admin/turmas/delete-lesson`** com `action`: `cancelOccurrence` | `deleteDefinition`. **Guardar edição:** `POST /api/admin/turmas/update-lesson` — altera **a definição** (incl. vários professores em `LessonCoach`). `EditarAulaForm` com `fetch`. Sucesso: `{ redirectTo }` + `window.location.assign`; `turmasPathAfterDelete` reconstrói a query.

### 3.8 Produção (Vercel) — favicon, RSC e métricas

- **Favicon:** `app/icon.tsx` (ImageResponse); rewrite `next.config.mjs`: `/favicon.ico` → `/icon`.
- **Client vs Server:** carrosséis do dashboard passam só **strings** e **`children`** renderizados no servidor (`OpenClassesCarouselShell` + `LessonPromoBlock`); não passar `Map` nem funções `t` a `"use client"`.
- **Speed Insights:** avisos de preload (ex.: domínios de terceiros) podem surgir; opcional **`NEXT_PUBLIC_DISABLE_SPEED_INSIGHTS=true`** em `components/VercelMetrics.tsx` para desativar só o Speed Insights (Analytics mantém-se).

### 3.9 PWA (Progressive Web App)

- **Manifest** (`app/manifest.ts`): `standalone`, cor de tema **#ED1C24**, ícones em `public/icons/` (gerados com `npm run generate:pwa-icons` a partir de `KFS Logo.png`).
- **Service worker** (`public/sw.js`): `fetch` com fallback `Response.error()` se a rede falhar; `PwaInstallProvider` + `PwaInstallHint` (telemóvel, aviso inicial) e `SidebarPwaInstall` (menu lateral após «Agora não»). Registo em produção (`PwaServiceWorkerRegister`). Middleware não intercepta `/sw.js` nem `/manifest.webmanifest`.
- **Instalação vs desinstalação:** não há API para detetar remoção da app no telemóvel; `appinstalled` grava `kfs-pwa-appinstalled-at` em `localStorage` (só instalação concluída). Após desinstalar, o Chrome pode demorar a voltar a emitir `beforeinstallprompt` — ver **`DOCS/PWA.md`**.
- **Detalhes:** **`DOCS/PWA.md`**. **Capacitor** (Android/iOS) continua no roadmap como passo após o PWA.

### 3.10 Documentação em `DOCS/` (higiene)

- **Índice:** `DOCS/INDEX.md` lista os ficheiros atuais. Em março 2026 foram removidos resumos de sessão, guias Git obsoletos (repo antigo), texto de treino fora do âmbito do repositório e duplicado curto de marca; **`DEPLOY_VERCEL.md`** foi reescrito para a stack atual (Supabase, sem Clerk).

### 3.11 Histórico útil (sessões anteriores)

- **Mobile:** avaliação no `CoachStudentProfileModal` (select 1–10, toques maiores).
- **Admin:** `clearStudentPlanAccess` — remover plano / subscrição (`app/admin/alunos/actions.ts`).
- **Feedback aluno:** `lib/resolve-coach-feedback.ts`; comentários `SHARED` vs `PRIVATE`.

---

## 4. Comandos rápidos

```bash
npm install
npm run dev
npm run build
npm test
npm run seed:test-users   # ver DOCS/CONTAS_TESTE.md
npm run generate:pwa-icons   # ícones PWA a partir de KFS Logo.png — ver DOCS/PWA.md
```

---

## 5. Pendências / evoluções (não bloqueantes)

- Editar visibilidade de comentários antigos (PRIVATE ↔ SHARED) — não implementado.
- Roadmap opcional: **rankeamento** (evolução + pontos), **Tribo** (feed social); BJJ/MMA, biometria, Battle Pass, PWA/Capacitor, push, E2E — ver **`DOCS/ROADMAP_Plataforma_KFS.md`** secções 14–17.

---

## 6. Continuar noutro chat — prompt sugerido

Cola algo como:

> Lê `DOCS/memory.md` e o roadmap em `DOCS/ROADMAP_Plataforma_KFS.md`. Quero continuar [descreve a tarefa].

---
*Este ficheiro é o índice de contexto interno; ao alterar comportamento visível ou regras de negócio, atualiza a secção relevante aqui ou o doc específico em `DOCS/`.* Lista completa de documentos: **`DOCS/INDEX.md`**.
*Este ficheiro é o índice de contexto interno; ao alterar comportamento visível ou regras de negócio, atualiza a secção relevante aqui ou o doc específico em `DOCS/`.*
