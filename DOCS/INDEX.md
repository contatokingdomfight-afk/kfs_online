# Índice da documentação (`DOCS/`)

> **Última revisão deste índice:** junho 2026 — inscrição/matrícula/seguro, 1.º pagamento presencial, gate middleware, migração `referenceMonth` nullable — [`FINANCEIRO_INSCRICAO_SEGURO.md`](FINANCEIRO_INSCRICAO_SEGURO.md), [`memory.md`](memory.md).  
> **Anterior:** 22 maio 2026 — marca/PWA 2026, treinador assistente, Tribo em curso.  
> **Anterior:** 19 maio 2026 — **Mobile / PWA (site, sem lojas):** [`MOBILE_APP_DISTRIBUICAO.md`](MOBILE_APP_DISTRIBUICAO.md), faixa na homepage, roadmap e [`PWA.md`](PWA.md); [`memory.md`](memory.md).  
> **Anterior:** 19 maio 2026 — **Tribo (comunidade):** MVP planeado — [`TRIBO_MVP.md`](TRIBO_MVP.md), secção 7 em [`Especificacao_Plataforma_Kingdom_Digital.md`](Especificacao_Plataforma_Kingdom_Digital.md), [`memory.md`](memory.md).  
> **Anterior:** 15 maio 2026 — **timer de rounds (coach):** sons, últimos segundos, UI dos botões — [`ROUND_TIMER_COACH.md`](ROUND_TIMER_COACH.md), [`memory.md`](memory.md).  
> **Anterior:** 13 maio 2026 (eventos no dashboard; centrais de notificações — [`NOTIFICACOES_IN_APP_E_EVENTOS.md`](NOTIFICACOES_IN_APP_E_EVENTOS.md)).  
> **Anterior:** 10 fevereiro 2026 (dashboard aluno: semana Lisboa, Presencial I + aulas abertas, `plan-access` + `getCachedLocations`).  
> **Anterior:** 27 abril 2026 (plano de ação **permissões admin / RBAC:** `PLANO_ACAO_PERMISSOES_ADMIN_RBAC.md`); 22 abril 2026 (silhueta 2D: `SILHUETA_CORPORAL_2D_ILUSTRATIVA.md`).

> **Índice de contexto técnico (prioridade para IA / equipa):** [`memory.md`](memory.md)  
> **Roadmap feito / por fazer:** [`ROADMAP_Plataforma_KFS.md`](ROADMAP_Plataforma_KFS.md)

Este ficheiro lista os documentos na pasta **`DOCS/`** (canónica). **Não editar** cópias em `docs/` na raiz em paralelo — só **`DOCS/`** (regra em `.cursor/rules/documentacao-projeto.mdc`).

Ficheiros antigos removidos ou substituídos: **histórico no Git**. Stack atual: Supabase (sem Clerk); ver **`DEPLOY_VERCEL.md`**.

**Changelog (junho 2026):** financeiro inscrição — seguro anual, matrícula, waiver, 1.º pagamento admin, aluno paga na escola (`/escolher-plano` + gate até `PAID`), pagamento antecipado — [`FINANCEIRO_INSCRICAO_SEGURO.md`](FINANCEIRO_INSCRICAO_SEGURO.md); migração `20260630150000_payment_reference_month_nullable.sql`.  
**Changelog (maio 2026 — identidade / PWA):** `kfs-app-icon.png`, ícones manifest com transparência, splash `#000000`, `PwaLaunchSplash`, [`PWA.md`](PWA.md), [`lib/brand.ts`](../lib/brand.ts). Reinstalar PWA após mudar ícones.  
**Changelog (maio 2026):** treinador assistente (escola) — `SchoolAssistantCoach`, rotas `/coach/eventos`, ver `memory.md`.  
**Changelog (maio 2026):** performance — secção Objetivos com Ver mais/menos; fix nome do treinador no histórico de avaliações (`lib/evaluation-history-helpers.ts`).  
**Changelog (maio 2026):** mobile — distribuição inicial PWA só pelo **site** (CTA na homepage); doc [`MOBILE_APP_DISTRIBUICAO.md`](MOBILE_APP_DISTRIBUICAO.md); Capacitor — [`CAPACITOR.md`](CAPACITOR.md); resumo executivo mobile em [`ROADMAP_Plataforma_KFS.md`](ROADMAP_Plataforma_KFS.md).  
**Changelog (maio 2026):** Tribo (comunidade) — [`TRIBO_MVP.md`](TRIBO_MVP.md) (feed por escola, media, comentários, curtidas, partilha por link, moderação, RLS/Storage); secção 7 em [`Especificacao_Plataforma_Kingdom_Digital.md`](Especificacao_Plataforma_Kingdom_Digital.md).  
**Changelog (maio 2026):** timer de rounds — documentação [`ROUND_TIMER_COACH.md`](ROUND_TIMER_COACH.md) (rotas `/coach/round-timer` e embutido em `/coach/aula`, sons WAV, digital-beep em preparo / round / descanso, UI `.round-timer-actions` e botões por fase).  
**Changelog (maio 2026):** eventos no dashboard (filtro *Inscritos e ativos*, strip *próximos eventos* na home antes de *Explorar*); centrais `/admin/notificacoes` e `/coach/notificacoes`; notificações in-app para inscrições em eventos — [`NOTIFICACOES_IN_APP_E_EVENTOS.md`](NOTIFICACOES_IN_APP_E_EVENTOS.md).

**Changelog (fevereiro 2026):** dashboard aluno — `getThisWeekRangeLisbon`, filtro de modalidade com plano Presencial I + aulas abertas, testes `dashboard-lesson-filter`, re-export `getCachedLocations` em `plan-access` (ver `DOCS/memory.md`).

**Changelog (abril 2026):** revisão cruzada de deploy, Stripe, troubleshooting Vercel, PWA/sessão, onboarding — alinhados a `memory.md` (secções Sessão web, financeiro no roadmap).

---

## Essenciais (produto + contexto)

| Documento | Conteúdo |
|-----------|----------|
| [`NOTIFICACOES_IN_APP_E_EVENTOS.md`](NOTIFICACOES_IN_APP_E_EVENTOS.md) | Centrais de notificações (aluno / coach / admin), gatilhos de eventos, rotas e permissões |
| [`memory.md`](memory.md) | Índice de contexto: arquitetura, entregas recentes, comandos, pendências |
| [`ROADMAP_Plataforma_KFS.md`](ROADMAP_Plataforma_KFS.md) | Roadmap por área (aluno, admin, coach, BD, deploy) |
| [`Especificacao_Plataforma_Kingdom_Digital.md`](Especificacao_Plataforma_Kingdom_Digital.md) | Especificação geral da plataforma (inclui secção Tribo / comunidade) |
| [`TRIBO_MVP.md`](TRIBO_MVP.md) | Tribo (comunidade): MVP **em curso** — feed, media, RLS, moderação |
| [`Fluxo Lógico Completo – Plataforma Kingdom Fight School.md`](Fluxo%20Lógico%20Completo%20–%20Plataforma%20Kingdom%20Fight%20School.md) | Fluxos de negócio |
| [`FLUXO_DE_CADASTRO_E_ONBOARDING.md`](FLUXO_DE_CADASTRO_E_ONBOARDING.md) | Cadastro, onboarding, escolha de plano e pagamento na escola |

---

## Deploy, Vercel e ambiente

| Documento | Conteúdo |
|-----------|----------|
| [`DEPLOY_VERCEL.md`](DEPLOY_VERCEL.md) | Deploy Vercel |
| [`Deploy_Vercel_kingdomfight.md`](Deploy_Vercel_kingdomfight.md) | Deploy domínio Kingdom Fight |
| [`VERCEL_DEPLOY_TROUBLESHOOTING.md`](VERCEL_DEPLOY_TROUBLESHOOTING.md) | Resolução de problemas |
| [`OTIMIZACOES_SPEED_INSIGHTS.md`](OTIMIZACOES_SPEED_INSIGHTS.md) | LCP, skeletons, Speed Insights (`NEXT_PUBLIC_DISABLE_SPEED_INSIGHTS`) |
| [`PERFORMANCE_E_GOOGLE_LOGIN.md`](PERFORMANCE_E_GOOGLE_LOGIN.md) | Performance e login Google |
| [`PWA.md`](PWA.md) | PWA: manifest preto, `kfs-app-icon.png`, pipeline ícones, splash, SW, sessão |
| [`MOBILE_APP_DISTRIBUICAO.md`](MOBILE_APP_DISTRIBUICAO.md) | Decisão de produto: site + PWA primeiro (sem lojas); Capacitor + lojas depois |
| [`CAPACITOR.md`](CAPACITOR.md) | App nativa Android/iOS (WebView → URL Next); comandos, dev local, pendências |
| [`ANDROID_PRIMEIRO_TESTE.md`](ANDROID_PRIMEIRO_TESTE.md) | Primeiro teste no Android Studio (sync prod, Run, checklist) |

---

## Supabase, migrações e segurança

| Documento | Conteúdo |
|-----------|----------|
| [`SUPABASE_RLS.md`](SUPABASE_RLS.md) | Row Level Security |
| [`SUPABASE_EMAIL_CONVITE.md`](SUPABASE_EMAIL_CONVITE.md) | Emails de convite |
| [`APLICAR_MIGRATIONS_SUPABASE.md`](APLICAR_MIGRATIONS_SUPABASE.md) | Aplicar migrações (incl. secção Ranking: RPCs `get_leaderboard_*`) |
| [`REVISAO_SEGURANCA.md`](REVISAO_SEGURANCA.md) | Revisão de segurança |
| [`WEEK_THEME_MIGRATION.md`](WEEK_THEME_MIGRATION.md) | Migração tema da semana *(referência histórica)* |
| [`COURSE_UNITS_MIGRATION.md`](COURSE_UNITS_MIGRATION.md) | Unidades de curso *(referência histórica)* |
| [`BIBLIOTECA_360_MIGRATION.md`](BIBLIOTECA_360_MIGRATION.md) | Biblioteca 360 *(referência histórica)* |

---

## Dados, multi-escola e coaches

| Documento | Conteúdo |
|-----------|----------|
| [`Modelo de Dados – Kingdom Fight School (MVP).md`](Modelo%20de%20Dados%20–%20Kingdom%20Fight%20School%20(MVP).md) | Modelo de dados |
| [`SISTEMA_MULTI_ESCOLA.md`](SISTEMA_MULTI_ESCOLA.md) | Multi-escola (ver também `CoachSchool` N:N em `memory.md`) |
| [`GUIA_RAPIDO_MULTI_ESCOLA.md`](GUIA_RAPIDO_MULTI_ESCOLA.md) | Guia rápido multi-escola |

---

## Aluno – dashboard e testes

| Documento | Conteúdo |
|-----------|----------|
| [`MELHORIAS_DASHBOARD.md`](MELHORIAS_DASHBOARD.md) | Dashboard aluno (`/dashboard`): carrosséis, Presencial I, aulas abertas, Lisboa; **eventos** (home + `/dashboard/eventos`); ver `memory.md` |
| [`AVATAR_3D_BASE_GLTF.md`](AVATAR_3D_BASE_GLTF.md) | Vista 3D: GLBs M/F (`human-base-male.glb` / `human-base-female.glb`), fallback e env |
| [`SILHUETA_CORPORAL_2D_ILUSTRATIVA.md`](SILHUETA_CORPORAL_2D_ILUSTRATIVA.md) | Silhueta 2D ilustrativa: campo ↔ corpo, pipeline, 2D/3D, critérios de aceite, checklist de regressão |
| [`CONTAS_TESTE.md`](CONTAS_TESTE.md) | Contas de teste e `seed:test-users` |
| [`GUIA_TESTE_VALIDACAO_PERFIS.md`](GUIA_TESTE_VALIDACAO_PERFIS.md) | Checklist por perfil |
| [`TESTE_REGRESSAO_PRODUCAO.md`](TESTE_REGRESSAO_PRODUCAO.md) | Regressão manual em kingdomfight.com (rotas, KPIs, dados de teste) |
| [`GUIA_TESTE_LOJA.md`](GUIA_TESTE_LOJA.md) | Testes da loja |
| [`TESTE_COM_ALUNO_REAL.md`](TESTE_COM_ALUNO_REAL.md) | Testes com aluno real |

---

## Admin e especificações de painéis

| Documento | Conteúdo |
|-----------|----------|
| [`ESPECIFICACAO_DASHBOARD_ADMIN.md`](ESPECIFICACAO_DASHBOARD_ADMIN.md) | Especificação painel admin (incl. navegação para eventos e central de notificações) |
| [`ESPECIFICACAO_DASHBOARD_COACH.md`](ESPECIFICACAO_DASHBOARD_COACH.md) | Especificação painel coach (timer, presenças; ver também treinador assistente em `memory.md`) |
| [`ROUND_TIMER_COACH.md`](ROUND_TIMER_COACH.md) | Timer de rounds: rotas, sons, CSS, motor, persistência |
| [`PLANO_ACAO_PERMISSOES_ADMIN_RBAC.md`](PLANO_ACAO_PERMISSOES_ADMIN_RBAC.md) | Plano de ação: ecrã e modelo de **permissões (RBAC)** no admin; fases, RLS, checklist; ver também [ROADMAP_Plataforma_KFS.md](./ROADMAP_Plataforma_KFS.md) |

---

## Financeiro e Stripe

| Documento | Conteúdo |
|-----------|----------|
| [`FINANCEIRO_INSCRICAO_SEGURO.md`](FINANCEIRO_INSCRICAO_SEGURO.md) | Matrícula, seguro anual, waiver, 1.º pagamento, gate presencial, migrações jun. 2026 |
| [`PAGAMENTOS_MENSALIDADES_CRON.md`](PAGAMENTOS_MENSALIDADES_CRON.md) | Mensalidades, crons, Lisboa, `paymentType` |
| [`FINANCEIRO_STRIPE_E_PRESENCIAL.md`](FINANCEIRO_STRIPE_E_PRESENCIAL.md) | Stripe vs presencial; faturação AT |
| [`LOJA_PRESENCIAL.md`](LOJA_PRESENCIAL.md) | Loja admin, stock, vendas, relatório consolidado, migração `20260707120000_retail_inventory.sql` |
| [`STRIPE_KINGDOM_ONLINE.md`](STRIPE_KINGDOM_ONLINE.md) | Stripe no projeto |

---

## Google OAuth e login

| Documento | Conteúdo |
|-----------|----------|
| [`GOOGLE_OAUTH_SETUP.md`](GOOGLE_OAUTH_SETUP.md) | Setup principal OAuth |
| [`GOOGLE_OAUTH_PASSOS_RAPIDOS.md`](GOOGLE_OAUTH_PASSOS_RAPIDOS.md) | Passos rápidos |
| [`GOOGLE_OAUTH_USAR_EXISTENTE.md`](GOOGLE_OAUTH_USAR_EXISTENTE.md) | Reutilizar cliente existente |
| [`Login_Google_Supabase.md`](Login_Google_Supabase.md) | Google + Supabase |
| [`Login_Google_Producao_Hostinger.md`](Login_Google_Producao_Hostinger.md) | Produção / Hostinger |
| [`LoginInfinitoBoasPraticas.md`](LoginInfinitoBoasPraticas.md) | Boas práticas sessão Supabase persistente (complemento a `PWA.md`) |

---

## Design, UI e internacionalização

| Documento | Conteúdo |
|-----------|----------|
| [`DESIGN SYSTEM — KINGDOM FIGHT SCHOOL (MVP).md`](DESIGN%20SYSTEM%20—%20KINGDOM%20FIGHT%20SCHOOL%20(MVP).md) | Design system |
| [`DESIGN SYSTEM - TOKENS OFICIAIS.md`](DESIGN%20SYSTEM%20-%20TOKENS%20OFICIAIS.md) | Tokens CSS UI; cores de marca também em [`lib/brand.ts`](../lib/brand.ts) |
| [`Telas do Sistema – Mobile First.md`](Telas%20do%20Sistema%20–%20Mobile%20First.md) | Telas mobile first |
| [`Wireframes Mobile First – Kingdom Fight School.md`](Wireframes%20Mobile%20First%20–%20Kingdom%20Fight%20School.md) | Wireframes |
| [`Internacionalização (PT EN)   Dark Light Mode.md`](Internacionalização%20(PT%20EN)%20%20%20Dark%20Light%20Mode.md) | i18n e tema |

---

## Missões, biblioteca e planos

| Documento | Conteúdo |
|-----------|----------|
| [`MISSOES.md`](MISSOES.md) | Missões |
| [`POPULAR_MISSOES_SUPABASE.md`](POPULAR_MISSOES_SUPABASE.md) | Popular missões |
| [`PLANO_BIBLIOTECA_MELHORIAS.md`](PLANO_BIBLIOTECA_MELHORIAS.md) | Plano legado de melhorias (várias já feitas; ver Git / roadmap) |
| [`PLANO_ACAO_SISTEMA_PLANOS.md`](PLANO_ACAO_SISTEMA_PLANOS.md) | Planos |

---

## Resend, stack

| Documento | Conteúdo |
|-----------|----------|
| [`CONFIGURAR_RESEND.md`](CONFIGURAR_RESEND.md) | Resend (app + SMTP Supabase), variáveis, spam/DMARC, templates |
| [`STACK DE DESENVOLVIMENTO — KINGDOM FIGHT SCHOOL.md`](STACK%20DE%20DESENVOLVIMENTO%20—%20KINGDOM%20FIGHT%20SCHOOL.md) | Stack |

---

## Negócio e visão

| Documento | Conteúdo |
|-----------|----------|
| [`Plano_de_Negócios_Kingdom_Fight_School.md`](Plano_de_Negócios_Kingdom_Fight_School.md) | Plano de negócios |
| [`Visão — Escola Online Kingdom Fight School 👊🔥.md`](Visão%20—%20Escola%20Online%20Kingdom%20Fight%20School%20👊🔥.md) | Visão produto escola online |
| [`Remuneração de Coaches — Configurável (Futuro).md`](Remuneração%20de%20Coaches%20—%20Configurável%20(Futuro).md) | Remuneração coaches (futuro) |

---

## Avaliação e estados

| Documento | Conteúdo |
|-----------|----------|
| [`Mapeamento de Estados de Execução.md`](Mapeamento%20de%20Estados%20de%20Execução.md) | Estados de execução |

---

*Para alterações de comportamento visível no código, atualizar também [`memory.md`](memory.md) (regra do projeto em `.cursor/rules/documentacao-projeto.mdc`).*
