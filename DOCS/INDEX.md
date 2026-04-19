# Índice da documentação (`DOCS/`)

> **Última revisão deste índice:** 18 abril 2026.  
> **Índice de contexto técnico (prioridade para IA / equipa):** [`memory.md`](memory.md)  
> **Roadmap feito / por fazer:** [`ROADMAP_Plataforma_KFS.md`](ROADMAP_Plataforma_KFS.md)

Este ficheiro lista os documentos na pasta **`DOCS/`** (canónica). Não confundir com `docs/` na raiz, se existir.

Ficheiros antigos removidos ou substituídos: **histórico no Git**. Stack atual: Supabase (sem Clerk); ver **`DEPLOY_VERCEL.md`**.

**Changelog (abril 2026):** revisão cruzada de deploy (`DEPLOY_VERCEL.md`, `Deploy_Vercel_kingdomfight.md`), Stripe (`STRIPE_KINGDOM_ONLINE.md`), troubleshooting Vercel, PWA (nota de sessão instalada), fluxo de onboarding, `VARIAVEIS_AMBIENTE_VERCEL.txt` e **`INDICE_DOCUMENTACAO.md`** na raiz — alinhados a `memory.md` §3.2 (sessão), §3.4 (Stripe) e §3.17.

---

## Essenciais (produto + contexto)

| Documento | Conteúdo |
|-----------|----------|
| [`memory.md`](memory.md) | Índice de contexto: arquitetura, entregas recentes, comandos, pendências |
| [`ROADMAP_Plataforma_KFS.md`](ROADMAP_Plataforma_KFS.md) | Roadmap por área (aluno, admin, coach, BD, deploy) |
| [`Especificacao_Plataforma_Kingdom_Digital.md`](Especificacao_Plataforma_Kingdom_Digital.md) | Especificação geral da plataforma |
| [`Fluxo Lógico Completo – Plataforma Kingdom Fight School.md`](Fluxo%20Lógico%20Completo%20–%20Plataforma%20Kingdom%20Fight%20School.md) | Fluxos de negócio |
| [`FLUXO_DE_CADASTRO_E_ONBOARDING.md`](FLUXO_DE_CADASTRO_E_ONBOARDING.md) | Cadastro e onboarding |

---

## Deploy, Vercel e ambiente

| Documento | Conteúdo |
|-----------|----------|
| [`DEPLOY_VERCEL.md`](DEPLOY_VERCEL.md) | Deploy Vercel |
| [`Deploy_Vercel_kingdomfight.md`](Deploy_Vercel_kingdomfight.md) | Deploy domínio Kingdom Fight |
| [`VERCEL_DEPLOY_TROUBLESHOOTING.md`](VERCEL_DEPLOY_TROUBLESHOOTING.md) | Resolução de problemas |
| [`OTIMIZACOES_SPEED_INSIGHTS.md`](OTIMIZACOES_SPEED_INSIGHTS.md) | LCP, skeletons, Speed Insights (`NEXT_PUBLIC_DISABLE_SPEED_INSIGHTS`) |
| [`PERFORMANCE_E_GOOGLE_LOGIN.md`](PERFORMANCE_E_GOOGLE_LOGIN.md) | Performance e login Google |
| [`PWA.md`](PWA.md) | PWA (manifest, ícones, service worker); Capacitor continua no roadmap |

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
| [`MELHORIAS_DASHBOARD.md`](MELHORIAS_DASHBOARD.md) | Melhorias do dashboard (carrosséis; perfil / biométricos — ver `memory.md` §3.15) |
| [`CONTAS_TESTE.md`](CONTAS_TESTE.md) | Contas de teste e `seed:test-users` |
| [`GUIA_TESTE_VALIDACAO_PERFIS.md`](GUIA_TESTE_VALIDACAO_PERFIS.md) | Checklist por perfil |
| [`GUIA_TESTE_LOJA.md`](GUIA_TESTE_LOJA.md) | Testes da loja |
| [`TESTE_COM_ALUNO_REAL.md`](TESTE_COM_ALUNO_REAL.md) | Testes com aluno real |

---

## Admin e especificações de painéis

| Documento | Conteúdo |
|-----------|----------|
| [`ESPECIFICACAO_DASHBOARD_ADMIN.md`](ESPECIFICACAO_DASHBOARD_ADMIN.md) | Especificação painel admin |
| [`ESPECIFICACAO_DASHBOARD_COACH.md`](ESPECIFICACAO_DASHBOARD_COACH.md) | Especificação painel coach |

---

## Financeiro e Stripe

| Documento | Conteúdo |
|-----------|----------|
| [`PAGAMENTOS_MENSALIDADES_CRON.md`](PAGAMENTOS_MENSALIDADES_CRON.md) | Mensalidades, crons, Lisboa |
| [`FINANCEIRO_STRIPE_E_PRESENCIAL.md`](FINANCEIRO_STRIPE_E_PRESENCIAL.md) | Stripe e presencial |
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

---

## Design, UI e internacionalização

| Documento | Conteúdo |
|-----------|----------|
| [`DESIGN SYSTEM — KINGDOM FIGHT SCHOOL (MVP).md`](DESIGN%20SYSTEM%20—%20KINGDOM%20FIGHT%20SCHOOL%20(MVP).md) | Design system |
| [`DESIGN SYSTEM - TOKENS OFICIAIS.md`](DESIGN%20SYSTEM%20-%20TOKENS%20OFICIAIS.md) | Tokens |
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
