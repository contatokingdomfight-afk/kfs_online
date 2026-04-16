# Índice de contexto (memory) – KFS Online

> **Para continuar noutro chat:** lê este ficheiro primeiro; a documentação de produto e decisões está em **`DOCS/`** (não em `docs/`). Regra do projeto: `.cursor/rules/documentacao-projeto.mdc`.

**Última revisão:** 16 abril 2026 (roadmap + ranking RPCs em produção; `DOCS/APLICAR_MIGRATIONS` Ranking).

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
| Fluxo Git (branch `dev`, merge em `main` só com autorização, DOCS após merge) | `.cursor/rules/fluxo-git-dev-main.mdc` |
| Bem-estar / RPE / dores / benchmarks / peso (aluno) | `app/dashboard/bem-estar/`, migração `20260410200000_wellness_rpe_pain_benchmark_weight.sql` (§3.15) |

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
- **Sessão (evitar logout após idle em mobile):** cookies Supabase com `cookieOptions` partilhado (`lib/supabase/cookie-options.ts`: `maxAge` ~400 dias, `secure` em produção); middleware chama `getSession()` antes de `getUser()` para alinhar refresh; `components/AuthSessionKeepAlive.tsx` no `app/layout.tsx` reage a `visibilitychange` / `pageshow` (bfcache) / `online` e chama `getSession()` com throttle — mitiga timers de refresh suspensos em segundo plano.
- **Tour no dashboard:** `StudentOnboardingGate` em `app/dashboard/layout.tsx`; wizard opcional em `app/onboarding/`.
- **Recuperação de senha:** `resetPasswordForEmail` corre numa **Server Action** (`app/auth/forgot-password/actions.ts`) com `createClient` de `@/lib/supabase/server` para o **PKCE code verifier** ficar em **cookies** alinhados ao `@supabase/ssr`. `redirectTo` = `…/auth/callback?next=/auth/update-password`; a troca do `code` é em **`GET /auth/callback`** (servidor). `/auth/update-password` e `/auth/callback` em **`publicPaths`**; Supabase → Redirect URLs: `…/auth/callback` e `…/auth/update-password`. `getPasswordResetSiteUrl()` trata `x-forwarded-host` / `VERCEL_URL` / `NEXT_PUBLIC_APP_URL` para o `redirectTo` em produção.
- **Emails transacionais (Resend):** `lib/notifications/email.ts` — **`sendCheckInConfirmation`** (coach confirma presença) e **`sendLessonReminder`** (resumo das aulas de amanhã) partilham o mesmo **`wrapTransactionalEmail`**: fundo cinza, cartão branco, barra superior `#c1121f`, lista de aulas com blocos estilizados nos lembretes, campo **`text`** + **`html`** no envio. Variáveis: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (Vercel + `.env`). **Cron:** `GET /api/cron/lesson-reminders` (`vercel.json` + `CRON_SECRET`). **Auth (convite, recuperar senha, magic link):** corpo nos templates **Supabase → Authentication → Email Templates**; SMTP custom Resend em **Project Settings → Auth → SMTP**. Guia completo: **`DOCS/CONFIGURAR_RESEND.md`** (§6 esqueci-me da senha / redirects, §6.5 detalhes Resend, §7 spam/DMARC, §8 aparência e onde editar).
- **Aula experimental** (`/aula-experimental`): escolha de **escola** + slots por `expandLessonsForDateRange` e `schoolId`; `submitTrialRequest` valida escola, modalidade e ocorrência (`lessonId::occurrenceDate`).
- **Perfil (`/dashboard/perfil`):** **data de nascimento** em **Dados pessoais** (`StudentProfile.dateOfBirth`); valor normalizado para `input type="date"`; validação na action (`app/dashboard/perfil/actions.ts`); após guardar, revalidação inclui `/dashboard/rank`.
- **Ranking (Rank):** `/dashboard/rank` — classificação por **XP** (só `Student` ATIVO com `Athlete`). **Filtros (query):** escola, modalidade (`Student.primaryModality`), faixa etária (`StudentProfile.dateOfBirth`: KIDS / TEENS / ADULTS / MASTERS). RPCs **`get_leaderboard_filtered`** e **`get_leaderboard_my_school`** (`20260412120000` / `20260402120000`); **produção** (abril 2026) com ambas aplicadas na BD. `lib/leaderboard.ts`: fallback para `get_leaderboard_my_school` se a RPC filtrada faltar noutro ambiente; `errorKind` + i18n `rankErrorRankingRpcMissing` se **nenhuma** RPC existir. `lib/rank-filters.ts`, `RankFiltersForm.tsx`. Menu: `hasPerformanceTracking`. `SECURITY DEFINER` para contornar RLS em listagens agregadas.

### 3.3 Testes e seed

- **Unitários:** `npm test` (Vitest) — `lib/dashboard-lesson-filter.test.ts`.
- **Contas de teste:** `npm run seed:test-users` — precisa `TEST_SEED_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, escola ativa; emails em **`DOCS/CONTAS_TESTE.md`**. Ordem dotenv no script: `.env` → `.env.local` (override); **gravar** `.env` antes de correr.

### 3.4 Financeiro – um pagamento por aluno e mês

- **`createPayment`** consolida linhas em `Payment` para o mesmo `studentId` + `referenceMonth`: registar **Pago** quando já existia **Em atraso** (ex.: mensalidade gerada) **atualiza** o registo em vez de criar duplicado. Ver **`DOCS/PAGAMENTOS_MENSALIDADES_CRON.md`**.

### 3.5 Coach – Timer de rounds

- **Rota:** `/coach/round-timer` — temporizador para treinos (boxe, muay thai, etc.): rounds, descanso, contagem inicial; configuração de tempos com **seletores minutos:segundos** (UX tipo rolo no telemóvel); estado com **timestamps** (`phaseEndsAt`) + `catchUp` ao voltar do background; som (Web Audio: contagem 3‑2‑1, aviso ao entrar nos **últimos 10 s** do round/descanso, **fim de round** em três tons, fim do treino), vibração, cores por fase, ecrã inteiro; presets e `localStorage` / `sessionStorage` para config e sessão ativa. Atalho na **home do coach** (`app/coach/page.tsx`). Código: `lib/round-timer/*`, `components/coach/round-timer/RoundTimerClient.tsx`, `DurationRollPicker.tsx`.

### 3.6 Admin – Turmas

- Vista **por semana** / por modalidade; criação de aulas (incl. recorrente / one-off) — ver `app/admin/turmas/`.
- **Modelo de agenda (2026-04):** uma linha em `Lesson` por **definição**; recorrentes usam `weekday` (1–7) e `date` null; ocorrências na agenda são **expandidas** em memória (`lib/lesson-occurrences.ts`). Cancelamento pontual: `LessonCancellation` (só aquela data). Professores N:N: `LessonCoach` (primeiro espelhado em `Lesson.coachId`). Migração: `supabase/migrations/20260401120000_lesson_template_schedule.sql`.
- **Área Coach** (agenda, presenças na aula, QR, home, presença global, financeiro, experimentais): mesma expansão; links para uma ocorrência usam `?lesson=<id>&date=YYYY-MM-DD`; lista de presenças na aula filtra `Attendance` por `occurrenceDate`. Helper `rowsToLessonDefinitions` em `lib/lesson-occurrences.ts`. Na **home do coach** (`app/coach/page.tsx`), atalhos para presenças da **próxima** aula (ainda não começou) e da **última** já terminada, com ocorrências no intervalo ~21 dias atrás a ~28 à frente e instantes em `Europe/Lisbon` (`lib/coach-presence-shortcuts.ts`). A lista de ocorrências usa o mesmo âmbito que a **agenda** (`lib/coach-schedule-scope.ts`: escolas via `CoachSchool`; se não houver aulas com o `coachId` do professor, todas as da escola). **Hoje** e **minutos do dia** para o cartão «resto do dia» usam calendário e relógio em **Europe/Lisbon** (`calendarDateLisbon` / `minutesSinceMidnightLisbon` em `lib/lesson-check-in-window.ts`), não o dia UTC de `toISOString()`.

### 3.7 Perfil do atleta – critérios por categoria (resultados de avaliação)

- **Modalidade MMA:** critérios de avaliação alinhados a Muay Thai + Boxing (componentes e critérios clonados na BD; dimensões Mental/Teórico/Físico partilhadas ficam uma vez por nome). Migração: `supabase/migrations/20260411120000_mma_evaluation_clone_muay_boxing.sql`; `ModalityRef` + `load-evaluation-config.ts` (`MMA` em `MODALITIES_USE_COMPONENTS`).
- **Filtro principal** na área «Critérios por categoria» abre com **Técnico** (não Teórico): `components/evaluation-results/EvaluationResultsDashboard.tsx` (`INITIAL_MAIN_CATEGORY`).
- **Controle psicológico** pertence ao pilar **Mental** (não Tática): dimensões `MUAY_MENTAL_PSICOLOGICO` / `BOX_MENTAL_PSICOLOGICO` em `GeneralDimension`; componente `Controle psicológico`. Dados antigos com código `*_TATICO_PSICOLOGICO` são mapeados para o eixo mental em `lib/performance-utils.ts`.
- **Migração:** `supabase/migrations/20260327120000_controle_psicologico_under_mental.sql`.

### 3.8 Admin – Escolas e Coaches (UX)

- **Escolas:** ao criar ou guardar edição de uma escola, `FormLoadingModal` em `EscolasManager` (mensagens «A criar escola…» / «A guardar alterações…»).
- **Ficha do coach:** `app/admin/coaches/[id]/loading.tsx` — estado de carregamento ao navegar para a página de detalhe.
- **Escolas onde leciona:** componente `components/CoachSchoolMultiSelect.tsx` — pesquisa, lista rolável, chips com remoção; ordem define a primeira como «Principal» (alinhado a `schoolIds[0]` em `createCoach`).
- **Turmas / editar aula:** `app/admin/turmas/[id]/loading.tsx` — «A abrir edição…» ao navegar para a edição; no formulário, `FormLoadingModal` «A guardar alterações…»; após guardar com sucesso, redireciona para `/admin/turmas` com a mesma query (`view`, `week`, `school`) via `lib/turmas-list-query.ts`. Locais no select: `getLocationsForSchool` por `schoolId` da aula; `getCachedLocations` usa service role no callback de cache para não devolver lista vazia por cache incorreto.
- **Cancelar aula (edição):** modal em `document.body`. **Recorrente com `?occurrence=YYYY-MM-DD`:** pode **cancelar só essa semana** (`LessonCancellation`) ou **eliminar a definição** (apaga a linha `Lesson`). **Recorrente sem data na URL:** só eliminar definição. **Aula única:** elimina a linha. `lib/admin/delete-lesson.ts` (`performCancelOccurrence`, `performDeleteLessonDefinition`). **`POST /api/admin/turmas/delete-lesson`** com `action`: `cancelOccurrence` | `deleteDefinition`. **Guardar edição:** `POST /api/admin/turmas/update-lesson` — altera **a definição** (incl. vários professores em `LessonCoach`). `EditarAulaForm` com `fetch`. Sucesso: `{ redirectTo }` + `window.location.assign`; `turmasPathAfterDelete` reconstrói a query.

### 3.9 Produção (Vercel) — favicon, RSC e métricas

- **Favicon:** `app/icon.tsx` (ImageResponse); rewrite `next.config.mjs`: `/favicon.ico` → `/icon`.
- **Client vs Server:** carrosséis do dashboard passam só **strings** e **`children`** renderizados no servidor (`OpenClassesCarouselShell` + `LessonPromoBlock`); não passar `Map` nem funções `t` a `"use client"`.
- **Speed Insights:** avisos de preload (ex.: domínios de terceiros) podem surgir; opcional **`NEXT_PUBLIC_DISABLE_SPEED_INSIGHTS=true`** em `components/VercelMetrics.tsx` para desativar só o Speed Insights (Analytics mantém-se).

### 3.10 PWA (Progressive Web App)

- **Manifest** (`app/manifest.ts`): `standalone`, cor de tema **#ED1C24**, ícones em `public/icons/` (gerados com `npm run generate:pwa-icons` a partir de `KFS Logo.png`).
- **Service worker** (`public/sw.js`): `fetch` com fallback `Response.error()` se a rede falhar; `PwaInstallProvider` + `PwaInstallHint` (telemóvel, aviso inicial) e `SidebarPwaInstall` (menu lateral após «Agora não»). Registo em produção (`PwaServiceWorkerRegister`). Middleware não intercepta `/sw.js` nem `/manifest.webmanifest`.
- **Instalação vs desinstalação:** não há API para detetar remoção da app no telemóvel; `appinstalled` grava `kfs-pwa-appinstalled-at` em `localStorage` (só instalação concluída). Após desinstalar, o Chrome pode demorar a voltar a emitir `beforeinstallprompt` — ver **`DOCS/PWA.md`**.
- **Detalhes:** **`DOCS/PWA.md`**. **Capacitor** (Android/iOS) continua no roadmap como passo após o PWA.

### 3.11 Documentação em `DOCS/` (higiene)

- **Índice:** `DOCS/INDEX.md` lista os ficheiros atuais. Ficheiros antigos removidos ou substituídos: histórico no Git. Stack documentada: Supabase (sem Clerk). Bem-estar / biométricos no perfil: abril 2026 (§3.15).

### 3.12 XP / níveis — tempo mínimo na faixa

- Para além do XP, a **subida de nível** (faixa mostrada no perfil) exige **tempo mínimo na faixa atual**: **2 → 5 → 11 meses** nas três primeiras faixas (regra 2×+1); **a partir da faixa índice 3** (Verde em `BELT_NAMES`), fixo **12 meses** por degrau — `getMinMonthsInCurrentBeltForNextPromotion` em `lib/belts.ts` (~30 d/mês). Estado: `Athlete.displayBeltIndex`, `Athlete.lastBeltPromotionAt`; migração **`supabase/migrations/20260408120000_athlete_display_belt_time_gate.sql`**. UI: `getRankFromAthleteState` (`lib/xp-missions.ts`); sync: `syncAthleteDisplayBelt`. Missões: `getApplicableMissionTemplates`.

### 3.13 Histórico útil (sessões anteriores)

- **Mobile:** avaliação no `CoachStudentProfileModal` (select 1–10, toques maiores).
- **Admin:** `clearStudentPlanAccess` — remover plano / subscrição (`app/admin/alunos/actions.ts`). **Papel Professor/Admin:** `promoteStudentToRole` aceita qualquer `User.role` atual (ALUNO, COACH, ADMIN); no-op se já for o pedido; cria `Coach`/`CoachSchool` se necessário. UI `AdminAlunoQuickActions` em `/admin/alunos/[id]` e em **`/coach/alunos/[id]`** quando o logado é `ADMIN`.
- **Feedback aluno:** `lib/resolve-coach-feedback.ts`; comentários `SHARED` vs `PRIVATE`.

### 3.14 Admin – critérios de avaliação e performance (abril 2026)

- **Admin Avaliação** (`app/admin/avaliacao/`): várias subcategorias por dimensão; **replicar o mesmo critério em várias modalidades**; migração `20260410120000_remove_legacy_evaluation_components.sql` para dados legacy inconsistentes.
- **Config em tempo real:** `lib/load-evaluation-config.ts` **sem** `unstable_cache` (alterações no admin reflectem nas avaliações/radar).
- **Performance (aluno):** `/dashboard` — `DashboardBelowFold` async + `<Suspense>` para reduzir payload RSC inicial; sidebar com `prefetch: false` em `/como-sou-avaliado` e `/sistema-pontuacao`; `WarriorPanel` com barras via `transform: scaleX`. `/dashboard/performance` — radar **SVG** (sem Recharts), lazy-load de secções, tooltips CSS em conquistas, payload de detalhe condicional. Chunk partilhado grande `1255-*` no browser = runtime Next.js (esperado). Detalhe: **`DOCS/ROADMAP_Plataforma_KFS.md`** (resumo executivo + §2 e §2b).

### 3.15 Bem-estar, RPE, dores, benchmarks e peso (abril 2026)

- **Migração:** `supabase/migrations/20260410200000_wellness_rpe_pain_benchmark_weight.sql` — `PreLessonWellness` (sono, hidratação, stress, fadiga, zona GREEN/YELLOW/RED), `Attendance.rpe` / `rpeRecordedAt`, `Attendance.countsForGamification` (falso se zona vermelha no pré-treino), `PainSelfReport`, `PhysicalBenchmarkEntry`, `BodyWeightEntry`, `StudentProfile.weightGoalKg` / `weightGoalTargetDate`.
- **Check-in** (`/check-in/[lessonId]`): formulário pré-treino opcional (ou saltar); `lib/wellness-score.ts` calcula zona; `lib/resolve-check-in-occurrence.ts` partilha resolução de data com `performCheckIn`. Zona **vermelha**: presença válida mas **não** entra em `computeBadgeStats` / badges de assiduidade (`lib/gamification.ts` conta por linha `Attendance` + `occurrenceDate`). **UI:** controlos com classe `.input` e `check-in-wellness-form` em `app/globals.css` (tema escuro/claro; `color-scheme`); **sucesso:** modal `CheckInSuccessModal` (não substitui a página inteira) com título tipo «Check-in realizado com sucesso!»; `app/check-in/[lessonId]/CheckInFlow.tsx`.
- **Aluno:** hub `/dashboard/bem-estar` — RPE (`/dashboard/bem-estar/rpe`), dores (`/dores`), benchmarks (`/benchmarks`), peso (`/peso`). Ações em `app/dashboard/bem-estar/actions.ts`.
- **Perfil do atleta (performance):** `/dashboard/performance` — secção **Dados biométricos** (`components/fighter/CheckInWellnessSection.tsx`): médias sobre até **500** linhas `PreLessonWellness` do aluno — sono (h), qualidade (1–5), stress/fadiga médios (1–5), **% hidratação adequada** = (nº de registos com `hydrationOk === true` / total de registos) × 100 (autorrelato no check-in, não sensor), distribuição % das zonas GREEN/YELLOW/RED. UI em **grelha 2 colunas** (cartões com valor + estado semântico + **gauge vertical** por métrica, alinhado ao tema da plataforma). Agregação em `lib/check-in-wellness-aggregates.ts`. **Ordem no ecrã:** após **Objetivos / Quests** (`MissionCard`), **antes** da **Progressão de níveis / XP** (`BeltProgressionSection`). i18n: `perfWellness*` em `lib/i18n/messages.ts`. Se **não** há avaliações do coach mas há pré-treinos, a secção aparece acima da mensagem de «ainda não tens avaliações».
- **Metas mensais / totais no dashboard:** contagens de presenças usam `countsForGamification = true` (`DashboardBelowFold`, `DashboardRestContent`) para alinhar com badges.
- **Coach:** `/coach/aula?lesson=&date=` — por aluno, zona de pré-treino + RPE (`AttendanceRow`, dados de `PreLessonWellness` + `Attendance.rpe`). `/coach/alunos/[id]` — secção **Bem-estar e carga** (`CoachStudentWellbeingSection`): últimos pré-treinos e RPE (cliente admin).

### 3.16 Planos (Supabase) — colunas, RLS e UI admin (abril 2026)

- **Tabela `Plan`:** colunas alinhadas ao Prisma — `priceMonthly`, `includesDigitalAccess`, `modalityScope`, `isActive` (não usar `price_monthly` / `is_active` nas queries PostgREST). Várias rotas foram corrigidas (`lib/plan-access.ts`, `escolher-plano`, financeiro, webhooks Stripe, etc.).
- **Admin → listar/editar planos (`/admin/planos`):** leitura com `createClient()` (sessão + anon key), para coincidir com o projeto do login; criar/editar continuam com `SUPABASE_SERVICE_ROLE_KEY` nas server actions. **RLS:** `Plan` precisa de política para `authenticated` (ex. `allow_authenticated`); sem políticas com RLS ativo a lista fica vazia.
- **`/escolher-plano`:** planos visíveis para `schoolId` do aluno **e** `default-school-001` (catálogo partilhado).
- **Migrações úteis:** `20260414140000_rls_backfill_core_tables_if_missing.sql`, `20260414150000_plan_price_seed_and_plan_access_updates.sql`, `20260414160000_seed_plans_legacy_kfs_snapshot.sql`; correção de nomes em `20260312120632_plan_access_fields.sql` e preço mensal legado em `20260322000000_create_plan_price_for_subscription_options.sql`.

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
- **PWA na web** (instalar, Safari modal, menu lateral) — feito; ver **`DOCS/PWA.md`**. **Capacitor** e lojas — por fazer (roadmap, resumo executivo).
- **Modalidades** (BJJ, MMA, etc.): cadastro na plataforma — **feito** (`ModalityRef`). **Próximo passo operacional:** preencher **critérios de avaliação** por modalidade onde ainda faltem dados na BD (foco **BJJ / MMA**) — Admin Avaliação; ver roadmap (prioridade 4 na tabela resumo).
- Roadmap opcional: **Tribo**, **Rank v2**, «Ver como melhorar» → biblioteca, biometria além do autorrelato, Battle Pass, **push Web**, E2E, financeiro/Lighthouse — **`DOCS/ROADMAP_Plataforma_KFS.md`** (tabela «Resumo executivo»).

---

## 6. Continuar noutro chat — prompt sugerido

Cola algo como:

> Lê `DOCS/memory.md` e o roadmap em `DOCS/ROADMAP_Plataforma_KFS.md`. Quero continuar [descreve a tarefa].

---
*Este ficheiro é o índice de contexto interno; ao alterar comportamento visível ou regras de negócio, atualiza a secção relevante aqui ou o doc específico em `DOCS/`.* Lista completa de documentos: **`DOCS/INDEX.md`**.
