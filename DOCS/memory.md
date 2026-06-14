# Memória do projeto



Contexto técnico e decisões recentes (**prioridade para continuidade** e alinhamento de código). Índice geral: [`INDEX.md`](INDEX.md).



| Tema | Documento |

|------|-----------|

| Notificações e eventos | [`NOTIFICACOES_IN_APP_E_EVENTOS.md`](NOTIFICACOES_IN_APP_E_EVENTOS.md) |

| Timer de rounds (coach) | [`ROUND_TIMER_COACH.md`](ROUND_TIMER_COACH.md) |

| Tribo (comunidade) — **em curso** | [`TRIBO_MVP.md`](TRIBO_MVP.md) |

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

- **Landing (`/`):** após a secção de vídeos «em ação», bloco interactivo do significado do emblema — `components/home/LogoSymbolismSection.tsx`; textos `symbolism*` em `lib/home-content.ts`; arte **`public/brand/symbolism/foto-completa.svg`** (export «Foto completa»). Fontes de recorte com o mesmo JPEG: pasta **`KFS simbolo significados/`** (`Coroa.svg`, `Octógono.svg`, etc.) — o `viewBox` comum é **1235,25 × 716,25**; os rectângulos de clique no componente espelham os `clipPath` desses ficheiros. Ordem de clique: `HOTSPOT_HIT_ORDER` (áreas grandes por baixo).

- **Pipeline ícones PWA:** `npm run generate:pwa-icons` → `public/icons/kfs-emblem-*`, `app/icon.png`, `app/apple-icon.png`. Fonte: `kfs-app-icon.png` (transparente); ícones **manifest** com alpha; maskable/favicon 48px opacos. Bump `SW_VERSION` em `public/sw.js`; **reinstalar** PWA após mudanças.

- **Splash:** `PwaLaunchSplash` + `BrandSplashLogo` (`kfs-app-icon.png` sobre preto); `DashboardSplash` no dashboard. Manifest: `background_color` / `theme_color` = `#000000`. Detalhe: [`PWA.md`](PWA.md).



## Performance / avaliações (aluno)



- **Objetivos (missões):** `MissionCard.tsx` — lista colapsável (3 + Ver mais/menos); i18n `missionsShowMore` / `missionsShowLess`.

- **Histórico:** `/dashboard/performance/historico` — `resolveCoachDisplayNamesByCoachIds` (`lib/evaluation-history-helpers.ts`).



## Supabase EU — histórico de migrações



- **Lista canónica:** `scripts/lib/supabase-eu-remote-migration-names.mjs` (actualizar via MCP `list_migrations`, servidor `user-supabase_kfs_eu`).

- **Pendentes:** `node scripts/list-pending-supabase-migrations.mjs`

- **Aplicar SQL:** `node scripts/apply-pending-migrations-pg.mjs` (`DATABASE_URL`); `--resume=nome_base`

- **Backfill histórico:** `node scripts/backfill-supabase-migration-history.mjs` → SQL com MCP `execute_sql`



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



## Eventos — aluno e admin



- `/dashboard/eventos` — `EventosBoard`, filtro Todos / Inscritos e ativos.

- Home: `DashboardUpcomingEventsStrip` (com/sem plano).

- Admin: `/admin/eventos`, confirmação `setRegistrationStatus`.



## Notificações in-app (`Notification`)



- Aluno: `studentId`, `/dashboard/notificacoes`.

- Staff: `coachUserId`, `/coach/notificacoes`, `/admin/notificacoes`, `CoachNotificationBell`.

- Eventos: inscrição pendente → admins; confirmada → aluno. Ver [`NOTIFICACOES_IN_APP_E_EVENTOS.md`](NOTIFICACOES_IN_APP_E_EVENTOS.md).

- RBAC parcial: `lib/permissions/paths.ts` (ex. `/admin/notificacoes`).



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


