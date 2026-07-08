# Memória do projeto



Contexto técnico e decisões recentes (**prioridade para continuidade** e alinhamento de código). Índice geral: [`INDEX.md`](INDEX.md).



| Tema | Documento |

|------|-----------|

| Notificações e eventos | [`NOTIFICACOES_IN_APP_E_EVENTOS.md`](NOTIFICACOES_IN_APP_E_EVENTOS.md) |

| Timer de rounds (coach) | [`ROUND_TIMER_COACH.md`](ROUND_TIMER_COACH.md) |

| Tribo (comunidade) — **em curso** | [`TRIBO_MVP.md`](TRIBO_MVP.md) |

| Inscrição, matrícula, seguro, 1.º pagamento | [`FINANCEIRO_INSCRICAO_SEGURO.md`](FINANCEIRO_INSCRICAO_SEGURO.md) |

| Mensalidades, crons, suspensão | [`PAGAMENTOS_MENSALIDADES_CRON.md`](PAGAMENTOS_MENSALIDADES_CRON.md) |

| Loja presencial + relatório financeiro | [`LOJA_PRESENCIAL.md`](LOJA_PRESENCIAL.md) |

| Mobile — PWA pelo site | [`MOBILE_APP_DISTRIBUICAO.md`](MOBILE_APP_DISTRIBUICAO.md) · [`PWA.md`](PWA.md) |

| Capacitor (fase 2) | [`CAPACITOR.md`](CAPACITOR.md) |

| Sessão longa / Supabase | [`LoginInfinitoBoasPraticas.md`](LoginInfinitoBoasPraticas.md) |



> Documentação canónica só em **`DOCS/`** (maiúsculas). A pasta `docs/` na raiz, se existir, não deve ser editada em paralelo — usar sempre `DOCS/`.



---



## Sessão web (Supabase Auth)



- **Manter-me ligado:** checkbox em `/sign-in` e `/sign-up` (por defeito activo), **por baixo** do botão principal. Cookie `kfs_auth_long` (`lib/auth/remember-device.ts`); `middleware`, `lib/supabase/server.ts`, `route-handler` e `lib/supabase/client.ts` usam `resolveSupabaseCookieOptions` (`lib/supabase/cookie-options.ts`) — sessão **longa** (~400 d) vs **curta** (30 d). Renovação JWT: `components/AuthSessionKeepAlive.tsx`. Ver também [`PWA.md`](PWA.md) e [`LoginInfinitoBoasPraticas.md`](LoginInfinitoBoasPraticas.md).

- **PWA (fase 1):** instalação pelo site — `HomePwaInstallBand`, `SidebarPwaInstall`, `PwaInstallHint` ([`MOBILE_APP_DISTRIBUICAO.md`](MOBILE_APP_DISTRIBUICAO.md)).

- **Capacitor (fase 2):** WebView → produção; `CapacitorNativeBridge`, OAuth + deep links; `npm run generate:capacitor-assets` ([`CAPACITOR.md`](CAPACITOR.md)).



## Identidade visual / marca (2026)



- **Tokens:** `lib/brand.ts` — `BRAND_BG` `#121416` (UI), `BRAND_ICON_BG` `#000000` (ícone/splash PWA), primário `#9B111E`.

- **Assets:** `public/brand/` — `kfs-app-icon.png` (fonte PWA 1024²), `kfs-logotipo-transparent.png` (marca completa), `kfs-logotipo-emblem.png` (recorte só coroa / ícone), `kfs-emblem-icon.png`.

- **Header:** texto «Kingdom Fight School» (sem logotipo grande no menu).

- **Landing (`/`):** após a secção de vídeos «em ação», bloco interactivo do significado do emblema — `components/home/LogoSymbolismSection.tsx`; textos `symbolism*` em `lib/home-content.ts`; **`public/brand/symbolism/foto-completa.svg`** visível por defeito; no **hover** a foto completa **esconde-se** (`opacity-0`) e mostra-se só o **recorte** (`coroa.svg`, `octogono.svg`, …) sobre fundo preto do contentor. Painel: hover ou clique. Fontes em `KFS simbolo significados/`. `HOTSPOTS` / `HOTSPOT_HIT_ORDER`.

- **Horários públicos (`/`):** secção «Horários das aulas» após «Como funciona» — `components/home/WeeklyScheduleSection.tsx`; dados em `lib/public-weekly-schedule.ts` (aulas **recorrentes** `Lesson.isOneOff=false` + `weekday`, escolas activas; mesma fonte que Admin → Turmas). Visitantes anónimos: leitura via `getAdminClientOrNull()`. Cache `unstable_cache` tag `public-weekly-schedule` (5 min); invalidação em `revalidatePublicWeeklySchedule()` ao criar/editar/apagar aulas (`app/admin/turmas/actions.ts`, `lib/admin/update-lesson.ts`, `lib/admin/delete-lesson.ts`). Textos `schedule*` em `lib/home-content.ts`; âncora `#horarios`. UI: grade 7 colunas no desktop; no mobile, lista por dia com cartões (badge de hora + acento de cor estável por `modality` via `modalityAccent`).

- **Pipeline ícones PWA:** `npm run generate:pwa-icons` → `public/icons/kfs-emblem-*`, `app/icon.png`, `app/apple-icon.png`. Fonte: `kfs-app-icon.png` (transparente); ícones **manifest** com alpha; maskable/favicon 48px opacos. Bump `SW_VERSION` em `public/sw.js`; **reinstalar** PWA após mudanças.

- **Splash:** `PwaLaunchSplash` + `BrandSplashLogo` (`kfs-app-icon.png` sobre preto); `DashboardSplash` no dashboard. Manifest: `background_color` / `theme_color` = `#000000`. Detalhe: [`PWA.md`](PWA.md).



## Performance / avaliações (aluno)

- **Desempenho por modalidade (escola):** `/admin/desempenho-modalidades` (admin — todas as modalidades; filtro escola) e `/coach/desempenho-modalidades` (coach — só modalidades com aulas atribuídas). Agregação em `lib/school-modality-insights.ts` (última avaliação por atleta, médias de critérios e radar); UI `components/school-insights/SchoolModalityInsightsView.tsx`. Coach: `lib/coach-modalities-scope.ts`.



- **Objetivos (missões):** `MissionCard.tsx` — lista colapsável (3 + Ver mais/menos); i18n `missionsShowMore` / `missionsShowLess`.

- **Histórico:** `/dashboard/performance/historico` — `resolveCoachDisplayNamesByCoachIds` (`lib/evaluation-history-helpers.ts`).



## Supabase EU — histórico de migrações



- **Lista canónica:** `scripts/lib/supabase-eu-remote-migration-names.mjs` (actualizar via MCP `list_migrations`, servidor `user-supabase_kfs_eu`).

- **Pendentes:** `node scripts/list-pending-supabase-migrations.mjs`

- **Aplicar SQL:** `node scripts/apply-pending-migrations-pg.mjs` (`DATABASE_URL`); `--resume=nome_base`. Se der **timeout** na ligação directa `:5432` (comum no Windows/IPv6), usar connection string do **pooler** (`:6543`) ou MCP `apply_migration` / `execute_sql` no servidor `user-supabase_kfs_eu`.

- **Modalidades novas (`ModalityRef`):** migração `20260711200000_lesson_modality_text` — `Lesson.modality` e `TrialClass.modality` passam de enum PostgreSQL `Modality` para `TEXT` com FK a `ModalityRef(code)`. Sem isto, criar modalidade no admin (ex. `MTKIDS`) falha na agenda com `invalid input value for enum "Modality"`. Catálogo dinâmico: `/admin/modalidades` (`createModality`).

- **Backfill histórico:** `node scripts/backfill-supabase-migration-history.mjs` → SQL com MCP `execute_sql`

## Segurança (produção)

- **Estado (jun. 2026):** migração `20260616120000_production_security_hardening` **aplicada** no projeto Supabase EU (`production_security_hardening` no histórico remoto). Índice local actualizado em `scripts/lib/supabase-eu-remote-migration-names.mjs` — `list-pending` = 0.

- **RLS:** funções `kfs_*` (`SECURITY DEFINER`) e políticas por papel: aluno só acede aos próprios dados (`Payment`, `Attendance`, avaliações, notificações, etc.); coach/admin (`kfs_is_staff`) mantêm acesso operacional via JWT; catálogo com leitura aberta e escrita só staff. Detalhe: [`SUPABASE_RLS.md`](SUPABASE_RLS.md).

- **Stripe webhook:** idempotência com tabela `StripeWebhookEvent` + `Payment.stripeInvoiceId` (único); `customer.subscription.deleted` preserva plano em `suspendedPlanId` quando aplicável.

- **Cron:** `lib/cron/authorize-cron.ts` — em produção exige `CRON_SECRET` definido; aceita `Authorization: Bearer` ou `x-vercel-cron: 1`.

- **Diagnóstico:** removido `/api/debug-auth`.

- **Seeds:** bloqueados em produção salvo `ALLOW_PRODUCTION_SEED=true` (`lib/auth/guard-production-seed.ts`, scripts `seed:*`).

- **Operacional:** backups Supabase e rotação de segredos fora do repo — configurar no painel Supabase/Vercel.

### Qualidade (não bloqueadores, jun. 2026)

- **`app/error.tsx`:** boundary global com mensagem KFS e «Tentar novamente».
- **Webhook Stripe:** pedidos não autorizados (sem segredo/config/assinatura inválida) respondem **401**.
- **Portal Stripe:** `create-portal-session` usa `.maybeSingle()` no `Student`.
- **Prisma:** modelo `StripeWebhookEvent` alinhado à migração de idempotência.
- **Crons:** lembretes de aula e suspensão por pagamento processam alunos em lotes paralelos (25 / 15).



## Performance (área do aluno)



- Carrossel radar + silhueta: 2.º painel personalizado / neutro / erro de carga — `lib/build-performance-physical-carousel.ts`. Silhueta 2D/3D, ficha: [`SILHUETA_CORPORAL_2D_ILUSTRATIVA.md`](SILHUETA_CORPORAL_2D_ILUSTRATIVA.md), [`AVATAR_3D_BASE_GLTF.md`](AVATAR_3D_BASE_GLTF.md). Playground: `/dev/silhueta-2d` (404 em produção).



## Ficha de anamnese e avaliação física (coach)



- `savePhysicalAssessment` com `id` UUID; migração `20260422120000_student_physical_assessment_id_default.sql`.

- Secção 6.4, altura/peso, `humanoid3dBodyVariant`, notificação `PHYSICAL_ASSESSMENT` → `/dashboard/ficha-fisica`.

- UI: `AvaliacaoFisicaForm.tsx`, `IllustrativeBodyAvatar` (2D principal, 3D opcional).



## Dashboard aluno — `/dashboard`



- Semana em **Lisboa:** `getThisWeekRangeLisbon`, `calendarDateLisbon`, check-in alinhado.

- Plano Presencial I: `filterDashboardLessonsByPlanModality`, aulas abertas, `dashboard-lesson-filter.test.ts`.

- `getCachedLocations` reexportado em `plan-access.ts`. Ver [`MELHORIAS_DASHBOARD.md`](MELHORIAS_DASHBOARD.md).

- **Bem-estar:** `/dashboard/bem-estar` com **`layout.tsx` + tabs** (`BemEstarTabs.tsx`, pt/en): RPE, Dores, Testes físicos, Peso e metas — rotas `/rpe`, `/dores`, `/benchmarks`, `/peso`. Raiz redireciona para `/rpe`. Cabeçalho e texto explicativo no layout; conteúdo de cada secção nas `page.tsx` existentes. **Empty states orientados:** Performance sem avaliações (`perfEmpty*` em i18n + CTAs); RPE sem aulas pendentes (`rpeEmpty*` + CTAs). Menu lateral: **Loja (em breve)** (`navStore`). `actions.ts` mantém `revalidatePath` nas mesmas rotas.



## Eventos — aluno, coach e admin



- `/dashboard/eventos` — `EventosBoard`, filtro Todos / Inscritos e ativos.

- Home aluno: `DashboardUpcomingEventsStrip` (com/sem plano).

- **Coach:** `/coach/eventos` — calendário + lista (`CoachEventosBoard`, `lib/coach-upcoming-events.ts`); card «Próximos eventos» na home (`CoachUpcomingEventsCard`). Menu lateral «Eventos» para todos os coaches; check-in escola só para treinador assistente.
- **Ficha do aluno (coach):** `/coach/alunos/[id]` com **`layout.tsx` + tabs** (`AlunoTabs.tsx`): Visão geral, **Plano e seguro** (só ADMIN), Avaliação física, Avaliações, Performance — rotas reais e deep-linkáveis (`?next=` na avaliação física inalterado). Cabeçalho + tabs no layout; ações de coach (Avaliar, assistente) na Visão geral (`CoachAlunoOverviewActions`). **Avaliar performance** também no topo da tab Performance (`CoachAlunoEvaluateButton`). **ADMIN** vê na Visão geral e em `/coach/alunos/[id]/inscricao` o bloco completo de inscrição (`CoachAlunoAdminEnrollmentSection`: acesso rápido ao plano, seguro/termo, editar dados). Modal «Avaliar performance» filtra modalidades pelo plano (`getPlanAccess` / `lib/coach-student-evaluation-modalities.ts`); após guardar redireciona para `/coach/alunos/[id]/performance`.

- Admin: `/admin/eventos`, confirmação `setRegistrationStatus`.



## Conformidade e pré-lançamento (jun 2026)



- **404:** `app/not-found.tsx`
- **Email:** `app/auth/verify-email`, redirect pós-signup, erros no sign-in; activar «Confirm email» no Supabase Dashboard
- **RGPD:** `/termos`, `/privacidade`, `components/CookieBanner.tsx`, checkbox no registo, «Eliminar conta» em `/dashboard/perfil`
- **Password:** `ChangePasswordSection` no perfil (oculto para Google OAuth)
- **Sentry:** `@sentry/nextjs`, `instrumentation.ts`, `app/global-error.tsx` — env `SENTRY_DSN`
- **CSV admin:** `lib/export-csv.ts`, botões em alunos/financeiro/presença



## Status do aluno e pagamentos (`Student.status`)



- Enum: `ATIVO`, `INADIMPLENTE`, `INATIVO`, `EXPERIMENTAL` (migração `20260628120000_student_status_inadimplente.sql`).

- Sincronização automática em `lib/student-payment-status.ts`: **ATIVO** = em dia; **INADIMPLENTE** = 1 mês `Payment` LATE ou suspenso; **INATIVO** = 2+ meses LATE. `EXPERIMENTAL` não é alterado pelo cron.

- Chamado em: cron `payment-suspension`, `createPayment`, webhook Stripe, `lib/payment-grace.ts`, `lib/renewals.ts`.



## Notificações in-app (`Notification`)



- Aluno: `studentId`, `/dashboard/notificacoes`.

- Staff: `coachUserId`, `/coach/notificacoes`, `/admin/notificacoes`, `CoachNotificationBell`.

- Eventos: inscrição pendente → admins; confirmada → aluno. Ver [`NOTIFICACOES_IN_APP_E_EVENTOS.md`](NOTIFICACOES_IN_APP_E_EVENTOS.md).

- RBAC parcial: `lib/permissions/paths.ts` (ex. `/admin/notificacoes`).

- **Email Resend (transacional):** `lib/notifications/email.ts` — presença confirmada, lembretes de aula, **aceite de aula experimental** (`sendTrialAcceptanceConfirmation` em `acceptTrialRequest`, `app/admin/experimentais/actions.ts`). Requer `RESEND_API_KEY` e `RESEND_FROM_EMAIL` (Vercel); o contacto do pedido tem de incluir email. Ver [`CONFIGURAR_RESEND.md`](CONFIGURAR_RESEND.md).

- **Aulas experimentais (UX):** destaque «Experimentais hoje» na home coach (`/coach`) e admin (`/admin`) — `components/TodayTrialClassesHighlight.tsx`, `lib/today-trial-classes.ts`. Lista admin `/admin/experimentais`: data da inscrição (`lessonDate`, não `Lesson.date`); filtro **Realizados** para aceites passados não convertidos (`lib/trial-class-utils.ts`). Form público `/aula-experimental`: escola presencial pré-selecionada (`getDefaultOnboardingSchoolId`).



## Treinador assistente (escola)



- Aluno com `SchoolAssistantCoach` activo (`revokedAt` null), âmbito `schoolId`.

- Badge `SchoolAssistantBadge` em perfis admin/coach.

- Layout coach: `ALUNO` assistente → menu reduzido (`coach-sidebar-links`), `/coach/eventos`, presenças por escola, sem avaliar na aula.

- Migração: `20260519120000_school_assistant_coach.sql`; `lib/school-assistant-coach.ts`.



## Timer de rounds (coach)



- `/coach/round-timer`, embutido em `/coach/aula`. Ver [`ROUND_TIMER_COACH.md`](ROUND_TIMER_COACH.md).



## Tribo (comunidade) — em curso



- Feed aluno com plano: `/dashboard/tribo` (`requirePlan`). Partilha pública: `/t/p/[postId]`.

- Código: `app/dashboard/tribo/`, `lib/tribe/*`, `components/tribe/*`, `app/api/tribe/upload/route.ts`, Prisma `TribePost*`, migração `*_tribe_mvp.sql`.

- Especificação: [`TRIBO_MVP.md`](TRIBO_MVP.md), [`Especificacao_Plataforma_Kingdom_Digital.md`](Especificacao_Plataforma_Kingdom_Digital.md) §7.



## Roadmap (referência)



- RBAC admin: [`PLANO_ACAO_PERMISSOES_ADMIN_RBAC.md`](PLANO_ACAO_PERMISSOES_ADMIN_RBAC.md) — planeado; matriz parcial em `lib/permissions/paths.ts`.

- Resumo por área: [`ROADMAP_Plataforma_KFS.md`](ROADMAP_Plataforma_KFS.md).



## Seguro colectivo anual, matrícula e primeiro pagamento

**Documentação completa:** [`FINANCEIRO_INSCRICAO_SEGURO.md`](FINANCEIRO_INSCRICAO_SEGURO.md).

- **Tipos `Payment`:** `TUITION` (`referenceMonth`), `INSURANCE` (`referenceYear`), `ENROLLMENT` (taxa única, sem mês).
- **Migrações (jun. 2026):** `20260630120000_*` (seguro/waiver), `20260630140000_*` + `20260630140100_*` (matrícula), `20260630150000_payment_reference_month_nullable.sql` (fix NOT NULL no 1.º pagamento).
- **Config:** Admin → Configurações — `annualAmount`, `enrollmentAmount` (`lib/insurance-settings.ts`).
- **Aluno presencial:** `/escolher-plano` → modal `PlanSchoolPaymentModal` → `LATE` via `ensureOnboardingPendingPayments` → gate middleware até 1.º `PAID` → `/dashboard/financeiro` + `SchoolPaymentPendingModal`.
- **Admin:** `/admin/financeiro/primeiro-pagamento` (`createFirstPaymentBundle`); matrícula opcional, seguro obrigatório; renova `StudentInsuranceCoverage`. Campo **meses de mensalidade** (1–12, padrão 1). Na lista «Registos de pagamento» e «Pagamentos pendentes», 1.º pagamento aparece **numa linha** (matrícula + seguro + mensalidade), pendente ou já `PAID` — `lib/admin-payment-list-grouping.ts`.
- **Aviso «inscrição pendente»** (`hasPendingOnboardingPayments`): só quando há matrícula/seguro `LATE`, ou ainda **sem nenhum** `PAID` com mensalidade `LATE` — mensalidades `LATE` após o 1.º pagamento não disparam o aviso.
- **KPI receita (mês):** mensalidades `PAID` do `referenceMonth` + matrícula/seguro `PAID` com `createdAt` no mês (`lib/admin-finance-overview.ts`); tooltip com breakdown na visão geral.
- **Prazos mensalidade:** pagamento até **dia 8** do mês; regularização até **5 dias úteis** após o dia 8 (`lib/lisbon-payment-dates.ts`, `paymentGraceEndsAt`). Ver [`PAGAMENTOS_MENSALIDADES_CRON.md`](PAGAMENTOS_MENSALIDADES_CRON.md).
- **Waiver:** `/waiver-signing` (antes do plano); check-in bloqueado sem cobertura válida; cron `insurance-expiry-check` (segundas 08:00 UTC).



## Pagamento antecipado (mensalidades)



- `/admin/financeiro/antecipado` — N meses `TUITION` + `PAID` (`createAdvanceTuitionPayments`, `lib/payment-tuition-upsert.ts`). Cron só gera `LATE` para `paymentType = TUITION`.
- Registo manual de mensalidade (`/admin/financeiro/novo`) também aceita **quantidade de meses** (padrão 1).


## Plano Família

**Documentação:** [`PLANO_FAMILIA.md`](PLANO_FAMILIA.md).

- Plano `plan-familia` (acesso = **todas as modalidades**, equivalente Presencial MMA); **não** em `/escolher-plano` (nem cópias com nome «famil*»); descrição catálogo «até 4 pessoas».
- Admin: `/admin/familias` — **só a secretaria** cria grupo ou atribui `plan-familia` (grupo + titular automáticos); adiciona membros manualmente.
- Dashboard aluno: banner plano família (`FamilyPlanBanner`, `getFamilyStudentBanner`).
- Mensalidade **80 €/pessoa** (`KINGDOM_PLAN_FAMILIA_MONTHLY_PER_PERSON`, `lib/family-tuition.ts`); cada membro tem `TUITION` própria; acesso com PAID individual (`lib/family-payment-gate.ts`).
- Migrações: `20260701120000_family_plan.sql`, … `20260705120000_family_group_backfill_any_family_plan.sql`, **`20260706120000_family_plan_per_person_tuition.sql`**.
- Reparo automático: `repairOrphanFamilyTitulars` + `backfillFamilyGroupTuitions` ao abrir `/admin/familias`.


## Loja presencial e relatório financeiro (jun. 2026)

**Documentação:** [`LOJA_PRESENCIAL.md`](LOJA_PRESENCIAL.md).

- Migração **`20260707120000_retail_inventory.sql`**: `ProductSupplier`, `Product`, `ProductVariant`, `InventoryBalance`, `StockMovement`, `RetailSale`, `RetailSaleLine`; coluna `category` em `FinancialExpense`.
- Admin: `/admin/loja` (hub, POS, produtos, stock, vendas). Permissões = financeiro (`admin:financeiro:*`).
- `lib/retail/` — catálogo, movimentos, `createRetailSale` (sale + OUT + balance).
- Receitas loja: categoria **`MERCHANDISE`** em `lib/admin-revenue-breakdown.ts`.
- Relatório consolidado: `/admin/financeiro/relatorio` (`lib/admin-financial-report.ts`); CSV + gráfico 6 meses.
- Overview `/admin/financeiro`: **`layout.tsx` + barra de tabs** (navegação entre sub-rotas sem grid de botões); seletor de mês (`?month=AAAA-MM`); saldo = todas as receitas (breakdown + matrícula/seguro) − despesas; despesas com categoria; lista em **cartões** (mobile-first); **edição em modal dedicado**; forma de pagamento padrão ao lançar = **TRANSFER**.
- **Forma de pagamento** (`CASH` | `TRANSFER` | `MBWAY` | `DEPOSIT`) em pagamentos `PAID`, receitas manuais, despesas e loja — migração `20260708120000_finance_payment_method.sql`.
- **KPIs tesouraria** (`lib/cash-balance.ts`): **Caixa** = saldo bancário acumulado; **Espécie em mão** = físico não depositado; **Entradas do mês** por forma. Legado sem `paymentMethod` → `TRANSFER` (migração `20260710120000_backfill_payment_method_transfer.sql`).


