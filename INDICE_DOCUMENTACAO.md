# Índice da documentação – KFS Online

> Projeto actual: **`kfs_online`** (GitHub). Stack: **Next.js 15**, Node **20**, Supabase. Última revisão: **22 maio 2026** — docs alinhadas ao código (`DOCS/INDEX.md`, `DOCS/memory.md`, `DOCS/PWA.md`).

### Actualização maio 2026 (marca / PWA)

- Ícone e splash: `public/brand/kfs-app-icon.png`, manifest `#000000`, pipeline `npm run generate:pwa-icons`. Ver **`DOCS/PWA.md`** e **`DOCS/memory.md`** (Identidade visual).
- Após mudar ícones: reinstalar a PWA no telemóvel.

### Actualização maio 2026 (treinador assistente + Tribo)

- **Assistente (escola):** `SchoolAssistantCoach` — `DOCS/memory.md`.
- **Tribo:** MVP em curso — `DOCS/TRIBO_MVP.md`, `/dashboard/tribo`.

### Actualização maio 2026 (timer de rounds)

- **Coach:** `/coach/round-timer` e timer embutido em `/coach/aula` — sons, últimos segundos, UI. Ver **`DOCS/ROUND_TIMER_COACH.md`** e **`DOCS/memory.md`** (secção timer).

### Actualização maio 2026 (eventos + notificações)

- **Aluno:** `/dashboard/eventos` — filtro **Inscritos e ativos**; na home, secção **próximos eventos** antes de **Explorar** (com plano). Ver `DOCS/memory.md`, `DOCS/MELHORIAS_DASHBOARD.md`, `DOCS/NOTIFICACOES_IN_APP_E_EVENTOS.md`.
- **Admin / coach:** central `/admin/notificacoes` e sino no header admin; notificações in-app para **novas inscrições** em eventos (todos os admins) e confirmação ao aluno — mesmo doc.

### Actualização fevereiro 2026 (dashboard + docs)

- **Dashboard aluno** (`/dashboard`): semana em **Lisboa** (`getThisWeekRangeLisbon`), filtro **Presencial I** (modalidade + aulas abertas), `getCachedLocations` via `lib/plan-access.ts` — detalhe em `DOCS/memory.md`, `DOCS/MELHORIAS_DASHBOARD.md`, `DOCS/ROADMAP_Plataforma_KFS.md` sec. 2.

### Actualização abril 2026 (sincronização de docs)

- **Permissões admin (RBAC):** plano de ação `DOCS/PLANO_ACAO_PERMISSOES_ADMIN_RBAC.md`; tarefa no `DOCS/ROADMAP_Plataforma_KFS.md` (prioridade 11).

- **Sessão / PWA:** `DOCS/memory.md` (Sessão web), `DOCS/PWA.md`, `DOCS/LoginInfinitoBoasPraticas.md`.
- **Stripe:** `DOCS/STRIPE_KINGDOM_ONLINE.md`, `VARIAVEIS_AMBIENTE_VERCEL.txt`, `DOCS/DEPLOY_VERCEL.md`.
- **Índice canónico:** `DOCS/INDEX.md` (changelog no topo).

### Documentação canónica em `DOCS/`

- **`DOCS/INDEX.md`** — índice mestre de todos os ficheiros em `DOCS/`
- **`DOCS/NOTIFICACOES_IN_APP_E_EVENTOS.md`** — centrais de notificações e gatilhos (eventos)
- **`DOCS/memory.md`** — contexto técnico e decisões recentes (prioridade para continuidade)

## 🚀 Deploy & Configuração

### Início Rápido
- **`INICIO_RAPIDO.md`** ⚡
  - Deploy em menos de 30 minutos
  - Passo a passo resumido
  - Checklist essencial
  - **👉 COMECE POR AQUI!**

### Guias de Deploy
- **`VERCEL_DEPLOY.md`** 📖
  - Guia completo e detalhado
  - Todas as configurações explicadas
  - Troubleshooting avançado
  - Recursos úteis

- **`GUIA_VISUAL_VERCEL.md`** 📸
  - Guia passo a passo com screenshots
  - Instruções visuais
  - Exemplos de cada ecrã
  - Ideal para iniciantes

- **`VERCEL_CHECKLIST.md`** ✅
  - Checklist rápido
  - Lista de verificação
  - Problemas comuns
  - Referência rápida

### Configuração
- **`VARIAVEIS_AMBIENTE_VERCEL.txt`** 🔑
  - Lista completa de variáveis
  - Onde obter cada valor
  - Formato correto
  - Instruções de uso

- **`LINKS_IMPORTANTES.md`** 🔗
  - Links para todos os serviços
  - Dashboards
  - Documentação externa
  - Ferramentas úteis

## 🛠️ Scripts & Automação

### Scripts Disponíveis
- **`scripts/generate-nextauth-secret.js`**
  - Gera NEXTAUTH_SECRET seguro
  - Uso: `node scripts/generate-nextauth-secret.js`

- **`scripts/bulk-push-github.js`**
  - Push em massa para GitHub via API
  - Usado para deploy inicial

- **`scripts/prepare-push-batch.js`**
  - Prepara batches de ficheiros
  - Usado internamente

## 📋 Documentação do Produto

### Especificações
- **`DOCS/Especificacao_Plataforma_Kingdom_Digital.md`**
  - Visão geral do produto
  - Funcionalidades principais
  - Arquitetura

- **`DOCS/NOTIFICACOES_IN_APP_E_EVENTOS.md`**
  - Centrais de notificações (aluno, coach, admin) e gatilhos (eventos)

- **`DOCS/ROUND_TIMER_COACH.md`**
  - Timer de rounds (coach): rotas, sons WAV, avisos nos últimos segundos, UI, motor

- **`DOCS/ROADMAP_Plataforma_KFS.md`**
  - Roadmap de desenvolvimento
  - Fases do projeto
  - Prioridades

- **`DOCS/CONTAS_TESTE.md`**
  - Seed `npm run seed:test-users` (Admin, Coach, Aluno)
  - `npm test` (Vitest, filtro de aulas no dashboard)

- **`DOCS/GUIA_TESTE_VALIDACAO_PERFIS.md`**
  - Checklist manual por perfil (Admin, Coach, Aluno), incl. aula livre

- **`DOCS/PAGAMENTOS_MENSALIDADES_CRON.md`**
  - Mensalidades, **Europe/Lisbon** (5.º dia útil / dia 10)
  - Crons `payment-suspension`, `generate-monthly-payments`
  - Campos `Student` (grace / suspensão)

- **`DOCS/FINANCEIRO_STRIPE_E_PRESENCIAL.md`**
  - Stripe, faturação em Portugal, fluxos na KFS

### Plano de Negócios
- **`DOCS/Plano_de_Negócios_Kingdom_Fight_School.md`**
  - Modelo de negócio
  - Análise de mercado
  - Estratégia

## 💻 Desenvolvimento

### Configuração Local
- **`README.md`** 📄
  - Setup inicial
  - Comandos disponíveis
  - Estrutura do projeto
  - Contas de teste

- **`.env.example`**
  - Template de variáveis
  - Valores de exemplo
  - Comentários explicativos

### Base de Dados
- **`prisma/schema.prisma`**
  - Schema da base de dados
  - Modelos e relações
  - Configuração Prisma

## 🎯 Fluxos de Trabalho

### Para Desenvolvedores
```
1. README.md (setup inicial)
2. .env.example (configurar variáveis locais)
3. npm install
4. npx prisma db push
5. npm run dev
```

### Para Deploy
```
1. INICIO_RAPIDO.md (visão geral)
2. VARIAVEIS_AMBIENTE_VERCEL.txt (preparar variáveis)
3. VERCEL_CHECKLIST.md (seguir checklist)
4. GUIA_VISUAL_VERCEL.md (se precisar de ajuda visual)
5. VERCEL_DEPLOY.md (documentação completa)
```

### Para Troubleshooting
```
1. VERCEL_CHECKLIST.md (problemas comuns)
2. VERCEL_DEPLOY.md (troubleshooting avançado)
3. LINKS_IMPORTANTES.md (aceder a logs e dashboards)
```

## 📊 Estrutura de Ficheiros

```
kfs_online/
├── 📄 README.md                          # Documentação principal
├── ⚡ INICIO_RAPIDO.md                   # Guia rápido de deploy
├── 📖 VERCEL_DEPLOY.md                   # Guia completo de deploy
├── 📸 GUIA_VISUAL_VERCEL.md              # Guia visual
├── ✅ VERCEL_CHECKLIST.md                # Checklist rápido
├── 🔑 VARIAVEIS_AMBIENTE_VERCEL.txt      # Lista de variáveis
├── 🔗 LINKS_IMPORTANTES.md               # Links úteis
├── 📚 INDICE_DOCUMENTACAO.md             # Este ficheiro
│
├── 📁 DOCS/                              # Documentação do produto
│   ├── NOTIFICACOES_IN_APP_E_EVENTOS.md  # Centrais + gatilhos (eventos, etc.)
│   ├── ROUND_TIMER_COACH.md              # Timer de rounds (coach): rotas, sons, UI
│   ├── Especificacao_Plataforma_Kingdom_Digital.md
│   ├── ROADMAP_Plataforma_KFS.md
│   ├── CONTAS_TESTE.md
│   ├── GUIA_TESTE_VALIDACAO_PERFIS.md
│   ├── PAGAMENTOS_MENSALIDADES_CRON.md
│   ├── FINANCEIRO_STRIPE_E_PRESENCIAL.md
│   └── Plano_de_Negócios_Kingdom_Fight_School.md
│
├── 📁 scripts/                           # Scripts de automação
│   ├── seed-test-users.ts
│   ├── generate-nextauth-secret.js
│   ├── bulk-push-github.js
│   └── prepare-push-batch.js
│
├── 📁 app/                               # Aplicação Next.js
├── 📁 components/                        # Componentes React
├── 📁 lib/                               # Bibliotecas e utils
├── 📁 prisma/                            # Schema e migrações
│
├── 📄 .env.example                       # Template de variáveis
├── 📄 package.json                       # Dependências
└── 📄 tailwind.config.js                 # Configuração Tailwind
```

## 🎓 Guia de Leitura Recomendado

### Para Iniciantes
1. **README.md** - Entender o projeto
2. **INICIO_RAPIDO.md** - Deploy rápido
3. **GUIA_VISUAL_VERCEL.md** - Seguir passo a passo

### Para Desenvolvedores Experientes
1. **README.md** - Setup local
2. **VERCEL_CHECKLIST.md** - Deploy rápido
3. **VARIAVEIS_AMBIENTE_VERCEL.txt** - Configurar variáveis

### Para Troubleshooting
1. **VERCEL_CHECKLIST.md** - Problemas comuns
2. **VERCEL_DEPLOY.md** - Secção de troubleshooting
3. **LINKS_IMPORTANTES.md** - Aceder a logs

## 🔍 Procurar Informação

### Por Tópico

#### Deploy
- Guia rápido → `INICIO_RAPIDO.md`
- Guia completo → `VERCEL_DEPLOY.md`
- Guia visual → `GUIA_VISUAL_VERCEL.md`
- Checklist → `VERCEL_CHECKLIST.md`

#### Variáveis de Ambiente
- Lista completa → `VARIAVEIS_AMBIENTE_VERCEL.txt`
- Template local → `.env.example` (inclui **`CRON_SECRET`** para `/api/cron/*`)
- Onde obter → `VARIAVEIS_AMBIENTE_VERCEL.txt`

#### Configuração
- Supabase → `VARIAVEIS_AMBIENTE_VERCEL.txt` + `LINKS_IMPORTANTES.md`
- Stripe → `VARIAVEIS_AMBIENTE_VERCEL.txt` + `LINKS_IMPORTANTES.md`
- NextAuth → `scripts/generate-nextauth-secret.js`

#### Links & Dashboards
- Todos os links → `LINKS_IMPORTANTES.md`
- Documentação externa → `LINKS_IMPORTANTES.md`
- Ferramentas → `LINKS_IMPORTANTES.md`

## 📞 Suporte

### Documentação Interna
- Consulte os ficheiros listados acima
- Use o índice para encontrar rapidamente

### Documentação Externa
- Vercel: https://vercel.com/docs
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Stripe: https://stripe.com/docs
- Prisma: https://www.prisma.io/docs

### Logs & Debugging
- Vercel Logs: Dashboard → Deployments → Functions
- Supabase Logs: Dashboard → Logs
- Stripe Logs: Dashboard → Developers → Logs

---

**💡 Dica:** Adicione este ficheiro aos favoritos para acesso rápido à documentação!

**Última actualização:** 13 maio 2026
