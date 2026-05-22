# Memória do projeto

Contexto técnico e decisões recentes (**prioridade para continuidade** e alinhamento de código). Índice geral da pasta `DOCS/`: [`INDEX.md`](INDEX.md). Notificações e eventos (rotas, gatilhos): [`NOTIFICACOES_IN_APP_E_EVENTOS.md`](NOTIFICACOES_IN_APP_E_EVENTOS.md). **Timer de rounds (coach):** [`ROUND_TIMER_COACH.md`](ROUND_TIMER_COACH.md). **Tribo (comunidade) — MVP planeado:** [`TRIBO_MVP.md`](TRIBO_MVP.md). **Mobile — PWA só pelo site (sem lojas):** [`MOBILE_APP_DISTRIBUICAO.md`](MOBILE_APP_DISTRIBUICAO.md).

> Não confundir com ficheiros duplicados fora de `DOCS/`; a canónica é **`DOCS/memory.md`**.

## Sessão web (Supabase Auth)

- **Manter-me ligado:** checkbox em `/sign-in` e `/sign-up` (por defeito activo), **por baixo** do botão principal (Entrar / Criar conta). Grava o cookie de preferência `kfs_auth_long` (`lib/auth/remember-device.ts`); `middleware`, `lib/supabase/server.ts`, `route-handler` e `lib/supabase/client.ts` usam `resolveSupabaseCookieOptions` em `lib/supabase/cookie-options.ts` — **longo** (~400 d de `maxAge` nos cookies de sessão) vs **curto** (30 d) quando desmarcado (PC partilhado). Renovação do access JWT: `components/AuthSessionKeepAlive.tsx` e `DOCS/PWA.md`.
- **PWA / distribuição mobile (fase 1):** instalação pelo **site** (atalho no ecrã), sem lojas — faixa na homepage `components/home/HomePwaInstallBand.tsx`, mais `SidebarPwaInstall` e `PwaInstallHint`; ver [`MOBILE_APP_DISTRIBUICAO.md`](MOBILE_APP_DISTRIBUICAO.md) e roadmap.
- **Capacitor (fase 2):** WebView → URL de produção; `CapacitorNativeBridge` (status bar, voltar Android, OAuth); `openOAuthAuthorizeUrl` + deep links; `npm run generate:capacitor-assets`. Ver [`CAPACITOR.md`](CAPACITOR.md).

## Supabase EU — histórico de migrações

- **Lista canónica** de nomes já registados no projecto EU (`supabase_migrations.schema_migrations`): `scripts/lib/supabase-eu-remote-migration-names.mjs`. Actualizar quando o MCP `list_migrations` (servidor `user-supabase_kfs_eu`) mostrar entradas novas.
- **Pendentes locais vs EU:** `node scripts/list-pending-supabase-migrations.mjs` (usa o módulo acima + equivalências de slug, ex. ficheiro com prefixo data vs nome curto no remoto).
- **Aplicar SQL na BD sem passar pelo dashboard:** `node scripts/apply-pending-migrations-pg.mjs` (`DATABASE_URL` no `.env`). Opção `--resume=nome_base` para continuar após falha parcial. Não preenche o histórico Supabase por si só.
- **Backfill do histórico** (registar migrações já reflectidas na BD mas ainda sem linha no histórico): `node scripts/backfill-supabase-migration-history.mjs` (ou `--out ficheiro.sql`) e executar o SQL gerado com MCP `execute_sql`. Os `INSERT` usam `version` = basename do ficheiro para evitar colisões entre migrações com o mesmo prefixo numérico.

## Performance (área do aluno)

- Na performance (aluno e vista coach do aluno), o carrossel radar + silhueta tem **sempre** 2.º painel: silhueta **personalizada** com ≥2 circunferências na ficha; **neutra** com ficha sem medidas suficientes; **neutra + texto «sem ficha»** só se `getAchievementUnlockContext` também não encontrar ficha. Se a plataforma indica ficha mas a query com `formData` falhar, texto de «detalhes não carregaram». Helper: `lib/build-performance-physical-carousel.ts`. **Título do 2.º painel** (`perfCarouselSlideBodyCaption`) omitido quando a string i18n está vazia. **Dica de swipe** (`perfCarouselSwipeHint*` em `lib/i18n/messages.ts`): preenchida no builder (texto menciona primeiro a silhueta 2D, depois o radar). **Copy da silhueta:** com `perfAvatarCaptionShort*` preenchido → linha curta + tooltip (`components/ui/InlineInfoTip.tsx`); vazio → só o parágrafo longo inline. **Rodapé sob o canvas 3D** em `Humanoid3DPanel` só quando `humanoidFootnote.short` existe (sem texto por defeito). Ao gravar ficha: `revalidatePath('/dashboard/performance')`.
- **Aluno — ver ficha:** `/dashboard/ficha-fisica` (só leitura, última `StudentPhysicalAssessment`). Menu «Ficha física». Link «Ver ficha completa» sob o carrossel na performance. `hasAnamnesisOrNonAnthroAssessmentContent` em `lib/physical-assessment-content-flags.ts` distingue anamnese preenchida sem secção 6.4 para copy do 2.º painel. **Especificação silhueta 2D / pipeline / regressão:** [`DOCS/SILHUETA_CORPORAL_2D_ILUSTRATIVA.md`](SILHUETA_CORPORAL_2D_ILUSTRATIVA.md). **Escala global (helper):** `computeGlobalBodyScale` em `lib/illustrative-body-silhouette.ts` (motor B / evoluções); na vista modular `Avatar`, altura/peso entram sobretudo via `mapFormDataToAvatarMeasurements` + `bulkFactor`. **Pipeline único motor A:** `formDataProfileToAvatarScales` em `lib/illustrative-body-2d-pipeline.ts`. **Proporções 2D (SVG):** `buildBodyScaleFactors` / `scaleMeasurement` em `components/avatar/avatar-utils.ts`; `components/avatar/Body.tsx` (cintura–anca).

## Ficha de anamnese e avaliação física (coach)

- **Insert Supabase:** `savePhysicalAssessment` envia `id` (UUID) em cada linha de `StudentPhysicalAssessment`; a migração `supabase/migrations/20260422120000_student_physical_assessment_id_default.sql` define `DEFAULT` na coluna `id` para ambientes onde o insert omitia a PK (evita erro NOT NULL).
- **6.4 em `formData`:** largura biaquatorial (ombros), comprimento braço ombro→ponta do dedo (esq./dir.), entrepé perna (esq./dir.), circunferência bíceps (esq./dir.), circunferência antebraço (esq./dir.), circunferência do tórax; tipos em `lib/physical-assessment-types.ts`, leitura em `avaliacao-fisica/actions.ts`, só leitura em `PhysicalAssessmentReadOnlyView.tsx`. **Altura/peso na ficha:** `heightCm` / `weightKg` opcionais (secção 6 do `AvaliacaoFisicaForm.tsx`), sugeridos do perfil do aluno e editáveis pelo professor; em `mapFormDataToAvatarMeasurements` têm prioridade sobre o perfil para a silhueta. Campo opcional **`humanoid3dBodyVariant`** (`FEMALE` / `MALE`) escolhe o GLB masculino vs feminino em `public/models/human-base-male.glb` / `human-base-female.glb` (e reforço com `NEXT_PUBLIC_HUMANOID_BODY_HINT` quando a ficha não define variante). `hasIllustrativeAnthropometry` (`lib/illustrative-body-silhouette.ts`) conta também estes valores para o mínimo de medidas da silhueta; o avatar (`components/avatar/`) usa medida direta de ombros (se existir), tórax e entrepé como ajuste ilustrativo de torso e perna.
- **UI:** formulário em `AvaliacaoFisicaForm.tsx` com grelhas e rótulos empilhados no desktop; página `avaliacao-fisica/page.tsx` com largura máxima maior em `xl`/`2xl`.
- **Notificação ao aluno:** após guardar com sucesso, `notifyStudentOfNewPhysicalAssessment` em `lib/notifications/in-app.ts` cria linha em `Notification` (tipo `PHYSICAL_ASSESSMENT`, link `/dashboard/ficha-fisica`); `revalidatePath` inclui `/dashboard` e `/dashboard/notificacoes`.
- **Silhueta na app (`IllustrativeBodyAvatar`):** vista **principal em 2D** (`components/avatar/Avatar.tsx`, SVG a partir de `formDataProfileToAvatarScales` → `buildAvatarPoseLayout` + mesma pose que o 3D). **Vista 3D** opcional: `show3dViewOption` (no carrossel de performance = `allowLazyHumanoid3d`) mostra chips com i18n `perfBodyView2d` / `perfBodyView3d` / `perfBodyViewGroupAria`; carrossel, resumo de avaliação física (coach) e ficha do atleta usam `perfAvatarFigureAria` para `role="img"` na figura. `Humanoid3DPanel` em `next/dynamic` só monta na vista 3D. `poseTag` por defeito «estrela»; `showPoseTags` no carrossel. Resumos compactos não passam `show3dViewOption` → só 2D. GLB M/F: `DOCS/AVATAR_3D_BASE_GLTF.md`. **`allowLazyHumanoid3d`** controla também a opção 3D e a nota rodapé 3D (i18n). **Playground dev:** `/dev/silhueta-2d` (404 em `VERCEL_ENV=production`; ver `DOCS/SILHUETA_CORPORAL_2D_ILUSTRATIVA.md` §12); E2E opcional `npm run test:e2e` (Playwright).

## Dashboard aluno — `/dashboard` (aulas na semana, Presencial I)

- **Calendário em Lisboa:** `getThisWeekRangeLisbon()` em `lib/lesson-utils.ts` (contra `getThisWeekRange()` = fuso do servidor) + `calendarDateLisbon` em `app/dashboard/page.tsx` alinham a expansão de ocorrências e o cartão «próxima aula» às mesmas datas que `isLessonEligibleForNextCard` e o check-in (`lib/lesson-check-in-window.ts`), evitando listas a só aulas abertas em produção (Vercel/UTC).
- **Plano de uma modalidade (ex. Presencial I, `getPlanAccess` com `modalityScope` SINGLE e `primaryModality`):** `filterDashboardLessonsByPlanModality` em `lib/dashboard-lesson-filter.ts` mostra aulas fechadas **dessa** modalidade e **todas** as aulas com `isOpenClass` (livres), de qualquer modalidade; quem tem plano «todas as modalidades» não restringe a lista por modalidade.
- **Participação / RSVP / check-in** por aula: `isLessonParticipationAllowedByPlan` (aulas abertas continuam permitidas no plano para participação, como antes). Testes: `lib/dashboard-lesson-filter.test.ts`.
- **Locais em cache na página do dashboard:** `getCachedPlanAccess` e `getCachedLocations` importados de `@/lib/plan-access` — `getCachedLocations` é **reexportado** em `plan-access.ts` a partir de `cached-reference-data` para o dashboard não perder o símbolo no build após refactors de imports.
- Pormenores UX e carrosséis: `DOCS/MELHORIAS_DASHBOARD.md`.

## Eventos — aluno e admin

- **Lista + calendário:** `/dashboard/eventos` — `app/dashboard/eventos/EventosBoard.tsx`; filtro **Todos** / **Inscritos e ativos** (lista filtrada; calendário continua a marcar dias com todos os eventos visíveis ao aluno). Inscrição: `registerForEvent` em `app/dashboard/eventos/actions.ts` → `EventRegistration` com `PENDING` (validações: evento activo, datas, lotação, duplicado).
- **Secção «Próximos eventos» na home:** `DashboardUpcomingEventsStrip` (`app/dashboard/DashboardUpcomingEventsStrip.tsx`). **Com plano:** passa como `upcomingEventsSlot` para `DashboardBelowFold`, **depois** de «O que há de novo» e **antes** de «Explorar…». **Sem plano:** renderizada na `page.tsx` antes do `<Suspense>` do below-fold (o below-fold devolve `null` sem plano). Link «ver todos» → `/dashboard/eventos`.
- **Admin:** CRUD e inscrições em `/admin/eventos`, detalhe `/admin/eventos/[id]`; confirmação de inscrição `setRegistrationStatus` em `app/admin/eventos/actions.ts`.

## Notificações in-app (`Notification` — Supabase)

- **Aluno:** linhas com `studentId`; central `/dashboard/notificacoes`; acções `app/dashboard/notification-actions.ts` (marcar lida / todas lidas).
- **Staff (coach ou admin):** mesma tabela com `coachUserId` = `User.id` do destinatário (`createCoachInAppNotification` em `lib/notifications/in-app.ts`). Rotas: `/coach/notificacoes`, `/admin/notificacoes`. **Sino:** `components/CoachNotificationBell.tsx` — `href` conforme `User.role` (ADMIN → central admin). Incluído no header do layout coach e do **admin** (`app/admin/layout.tsx`). Item de menu: `lib/admin-sidebar-links.ts` (Central de notificações).
- **Eventos — quando disparam:** (1) **Aluno** ao inscrever-se: confirmação de pedido + link `/dashboard/eventos`. (2) **Todos os admins** (`User.role === ADMIN`): `notifyAllAdminsOfEventRegistrationPending` em `lib/notifications/notify-admins.ts` — nova inscrição pendente, link `/admin/eventos/{eventId}`. (3) **Aluno** quando o admin define a inscrição como **CONFIRMED**: «Inscrição confirmada». Não há notificação automática aos admins só por confirmar.
- **Revalidação:** após eventos, `revalidatePath` inclui frequentemente `/dashboard/eventos`, `/dashboard/notificacoes`, `/admin/notificacoes`; `markNotificationRead` / `markAllNotificationsRead` revalidam também `/admin`, `/coach` e respectivas centrais.
- **Permissões granulares (admin sub-perfis):** `lib/permissions/paths.ts` — prefixo `/admin/notificacoes` com `admin:sistema:read` / `write`.
- **Sem registo `Student`:** visita a `/dashboard/notificacoes` redirecciona admin → `/admin/notificacoes`, coach → `/coach/notificacoes`, outros → `/dashboard` (`app/dashboard/notificacoes/page.tsx`).

Referência legível (fluxos e rotas): [`DOCS/NOTIFICACOES_IN_APP_E_EVENTOS.md`](NOTIFICACOES_IN_APP_E_EVENTOS.md).

## Treinador assistente (escola)

- **Conceito:** aluno (`User.role === ALUNO`) com registo activo em `SchoolAssistantCoach` (um registo por `studentId`; `revokedAt` não nulo = revogado). Âmbito **só da escola** do aluno (`schoolId` alinhado com `Student.schoolId`).
- **UI:** etiqueta **«Assistente (escola)»** no perfil do aluno (`components/SchoolAssistantBadge.tsx`) em `app/coach/alunos/[id]/page.tsx` e `app/admin/alunos/[id]/page.tsx` quando o registo está activo; tooltip nativo com resumo do papel.
- **Área coach:** layout `app/coach/layout.tsx` permite `ALUNO` com assistente activo; navegação reduzida em `lib/coach-sidebar-links.ts` (inclui **Eventos (check-in escola)** → `/coach/eventos`); outras rotas `/coach/*` redireccionam para `/coach`. Atalho no menu do aluno: `lib/dashboard-student-base-links.ts` (`hasSchoolAssistantCoach`).
- **Presenças:** `setAttendanceStatus` em `app/coach/aula/actions.ts` valida `Lesson.schoolId` vs escola do assistente. **Avaliações:** `saveEvaluationFromLesson` recusa quem tem assistente activo (defesa em profundidade); na UI, `AttendanceRow` com `canEvaluate={false}` em `app/coach/aula/page.tsx`.
- **Eventos (fase 2):** lista `/coach/eventos` e validação `/coach/eventos/[id]/validar` só para assistente activo; participantes filtrados por escola (`lib/event-checkin-participants-school.ts`). `redeemEventTicket` / `redeemEventCheckinByRegistrationId` em `app/admin/eventos/actions.ts` aceitam **ADMIN** ou **assistente** (só inscrições de alunos da mesma escola). QR scanner: `eventsBasePath` em `TicketQrScanner` / `IngressoValidator`.
- **Dados:** aulas e QR filtrados por escola em `app/coach/aula/page.tsx` e `app/coach/aula/qr/page.tsx`. Home coach simplificada para assistente em `app/coach/page.tsx`. Agenda: `app/coach/agenda/page.tsx`.
- **Migração Supabase:** `supabase/migrations/20260519120000_school_assistant_coach.sql`. Modelo Prisma: `SchoolAssistantCoach` em `prisma/schema.prisma`. Helper: `lib/school-assistant-coach.ts`.

## Timer de rounds (coach)

- **Rotas:** `/coach/round-timer` (página); timer embutido em `/coach/aula` com `RoundTimerClient` em `variant="embedded"`.
- **Sons:** `lib/round-timer/audio.ts` + ficheiros em `public/sounds/round-timer/`. Sino **`end__boxing-bell.wav`** no **início** e no **fim** de cada round. **`digital-beep.wav`** nos últimos 5 s do preparo (5→2), últimos 10 s + últimos 5 s do round, últimos 5 s do descanso — detalhe em [`DOCS/ROUND_TIMER_COACH.md`](ROUND_TIMER_COACH.md).
- **UI:** `app/coach/round-timer/round-timer.css` (cores por fase, zona central tocável para pausa/continuar, duas barras de progresso, urgência visual últimos 10 s do round, `prefers-reduced-motion`).
- **Motor / estado:** `lib/round-timer/engine.ts`, persistência `lib/round-timer/persistence.ts`.

## Roadmap (referência)

- **Permissões admin (RBAC):** plano de ação e fases em [`PLANO_ACAO_PERMISSOES_ADMIN_RBAC.md`](PLANO_ACAO_PERMISSOES_ADMIN_RBAC.md); tarefa no [`ROADMAP_Plataforma_KFS.md`](ROADMAP_Plataforma_KFS.md) (resumo — prioridade 11; sec. 4 — alunos). Estado: **planeado**, não implementado.

## Tribo (comunidade)

- **Doc canónica:** [`TRIBO_MVP.md`](TRIBO_MVP.md) — visibilidade `SCHOOL_ONLY` | `ALL_SCHOOLS`; media só **imagem + GIF** (sem vídeo v1); curtir com **luva** + efeito **soco** na media; **partilha** `/t/p/[id]` → visitante sem sessão para [`/sign-up`](./sign-up) com `next`; UX mobile first + modais de carregamento/gravação.
- **Rotas:** `/dashboard/tribo` (aluno com plano — `requirePlan`), partilha pública `/t/p/[postId]` (middleware: prefixo `/t` público).
- **Código (referência):** `app/dashboard/tribo/`, `app/t/p/[postId]/`, `app/api/tribe/upload/route.ts`, `lib/tribe/*`, migração `supabase/migrations/*_tribe_mvp.sql`, modelos Prisma `TribePost*`, `TribeComment`, `TribeLike`.
- **Resumo produto:** [`Especificacao_Plataforma_Kingdom_Digital.md`](Especificacao_Plataforma_Kingdom_Digital.md) secção 7.
