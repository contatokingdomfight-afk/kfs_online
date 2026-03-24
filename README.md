# Kingdom Fight School – KFS Online (`kfs_online`)

Plataforma de gestão e ensino da Kingdom Fight School (MVP). Mobile first.

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **React 18**
- **Tailwind CSS** + design tokens (ver `DOCS/`)
- **Supabase** – autenticação + PostgreSQL
- **Prisma** – ORM (schema alinhado à BD no Supabase)
- **Vercel** – deploy
- **Stripe** – pagamentos online; **Resend** – email
- **`date-fns` / `date-fns-tz`** – regras de mensalidade em `Europe/Lisbon`

Repositório GitHub típico: `contatokingdomfight-afk/kfs_online` (ajusta se o teu remote for outro).

## Começar

1. **Dependências**
   ```bash
   npm install
   ```

2. **Variáveis de ambiente**
   - Copiar `.env.example` para `.env`
   - Preencher `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase → Project Settings → API)
   - Preencher `DATABASE_URL` (Supabase → Project Settings → Database → connection string)
   - **Cron:** `CRON_SECRET` para proteger os endpoints em `/api/cron/*` (Vercel Cron ou chamadas manuais com `Bearer`)
   - **Login com Google:** ver **DOCS/GOOGLE_OAUTH_SETUP.md**

3. **Base de dados**
   ```bash
   npx prisma generate
   npx prisma db push
   ```
   Migrações SQL em `supabase/migrations/` podem ser aplicadas no projeto Supabase conforme a vossa prática.

4. **Desenvolvimento**
   ```bash
   npm run dev
   ```
   Abrir [http://localhost:3000](http://localhost:3000).

**Node:** o `package.json` define `"engines": { "node": "20.x" }`. Usa Node 20 em local e na Vercel para consistência.

## Estrutura

- `app/` – rotas e layouts (App Router)
- `components/` – UI reutilizável (incl. `fighter/` para perfil do atleta gamificado)
- `lib/` – Supabase, utils, i18n, cintos, XP/missões, avaliação física, **pagamentos e datas em Lisboa** (`lisbon-payment-dates.ts`, `payment-grace.ts`, `renewals.ts`)
- `prisma/` – schema e migrações Prisma
- `supabase/migrations/` – migrações SQL (ex.: grace/suspensão de pagamento)
- `DOCS/` – documentação do produto e operação

## Funcionalidades principais

- **Perfil do atleta (gamificado)** – Faixas por cor, XP, radar (Técnico, Tático, Físico, Mental, Teórico), missões (sistema + configuráveis no Admin).
- **Avaliação física** – Ficha no perfil do aluno; renovação a cada 6 meses; missão até estar em dia.
- **Admin** – Turmas, planos, alunos, coaches, financeiro, missões, multi-escola, etc.
- **Mensalidades e suspensão** – Atraso após o **5.º dia útil** do mês em Lisboa; prazo de regularização até ao **dia 10**; bloqueio automático via cron. Detalhe: **DOCS/PAGAMENTOS_MENSALIDADES_CRON.md**.

## Contas de teste

Não existem contas pré-criadas. Cria-as assim:

1. **Aluno** – Registar com um email; no Supabase → **User**, `role` = `ALUNO`. O primeiro login sincroniza **Student**.
2. **Coach** – Outro email; **User** com `role` = `COACH`; em **Coach** ligar `userId`.
3. **Admin** – **User** com `role` = `ADMIN`.

### Ver como Aluno / Professor (admin)

Na área **Admin**: **Ver como: Aluno** ou **Ver como: Professor** (banner com **Voltar ao Admin**).

## Deploy (Vercel)

1. Importar o projeto a partir do GitHub.
2. Definir variáveis de ambiente (Supabase, Stripe, Resend, `CRON_SECRET`, etc.) — ver **`.env.example`** e **`VARIAVEIS_AMBIENTE_VERCEL.txt`** se existir.
3. Garantir **Node 20** no projeto Vercel.
4. Crons: `vercel.json` agenda `lesson-reminders` e **`payment-suspension`** (gera `LATE` + suspende após prazo). O `CRON_SECRET` tem de estar definido.

Guias na raiz / `DOCS/`: `INICIO_RAPIDO.md`, `VERCEL_DEPLOY.md`, `VERCEL_CHECKLIST.md`, `DOCS/DEPLOY_VERCEL.md`, etc.

## Segurança e dependências

- Mantém **`npm audit`** sem vulnerabilidades conhecidas; a stack foi atualizada para **Next.js 15.5.x** com esse objetivo.
- Após upgrades, corre **`npm run build`** antes de fazer deploy.

## Documentação

| Documento | Conteúdo |
|-----------|----------|
| **DOCS/ROADMAP_Plataforma_KFS.md** | O que está feito / por fazer |
| **DOCS/PAGAMENTOS_MENSALIDADES_CRON.md** | Mensalidades, Lisboa, crons, campos `Student` |
| **DOCS/FINANCEIRO_STRIPE_E_PRESENCIAL.md** | Stripe, faturação PT, fluxos |
| **INDICE_DOCUMENTACAO.md** | Índice de ficheiros na raiz |

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint (Next) |
| `npm run db:studio` | Prisma Studio |
| `npm run db:migrate` | Migrações Prisma |
