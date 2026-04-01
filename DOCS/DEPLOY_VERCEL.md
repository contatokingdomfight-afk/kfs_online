# Deploy na Vercel (KFS Online)

> **Última revisão:** março 2026.  
> **Repo:** `contatokingdomfight-afk/kfs_online` · **Auth:** Supabase (não Clerk).  
> **Índice:** [`INDEX.md`](INDEX.md) · contexto técnico: [`memory.md`](memory.md)

---

## 1. Pré-requisitos

- Código no GitHub com `main` (ou branch de produção) atualizado.
- Migrações Supabase aplicáveis ao projeto (ver [`APLICAR_MIGRATIONS_SUPABASE.md`](APLICAR_MIGRATIONS_SUPABASE.md)).
- Variáveis de ambiente alinhadas ao `.env.example` na raiz do repositório.

---

## 2. Git e push

Se o `git push` falhar com **403** ou credenciais erradas:

1. Preferir **GitHub CLI:** `gh auth login` e voltar a fazer push.
2. Ou **Personal Access Token** (classic) com scope `repo`, no URL HTTPS do remote (sem commitar o token).

---

## 3. Projeto na Vercel

1. [vercel.com](https://vercel.com) → importar o repositório `kfs_online`.
2. **Framework:** Next.js (detetado automaticamente).
3. **Build:** `npm run build` (padrão).
4. **Node:** 20.x (alinhado a `package.json` engines).

---

## 4. Variáveis de ambiente (resumo)

Configurar em **Settings → Environment Variables** (Production e, se necessário, Preview):

| Área | Exemplos de chaves |
|------|---------------------|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| App / URL | `NEXT_PUBLIC_APP_URL` (opcional; ver `.env.example`) |
| Base de dados | `DATABASE_URL` (Prisma; mesmo projeto Supabase) |
| Email (Resend) | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — ver [`CONFIGURAR_RESEND.md`](CONFIGURAR_RESEND.md) |
| Stripe | `STRIPE_*`, `NEXT_PUBLIC_STRIPE_*`, `STRIPE_WEBHOOK_SECRET` |
| Google OAuth | `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (opcional; ver `DOCS/GOOGLE_OAUTH_SETUP.md`) |
| Crons | `CRON_SECRET` (rotas em `app/api/cron/*`) |
| Opcional | `NEXT_PUBLIC_DISABLE_SPEED_INSIGHTS=true` para desativar só o Speed Insights (ver [`OTIMIZACOES_SPEED_INSIGHTS.md`](OTIMIZACOES_SPEED_INSIGHTS.md)) |

Valores exatos: copiar do `.env.local` de desenvolvimento (sem secrets no Git).

### 4.1 Supabase Auth — callbacks e recuperação de senha

Em **Authentication → URL Configuration**:

- **Site URL:** URL de produção (ou `http://localhost:3000` em dev).
- **Redirect URLs:** incluir pelo menos (ou um wildcard `https://<domínio>/auth/**`):
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/update-password`
  - `https://<o-teu-dominio-ou-preview>/auth/callback`
  - `https://<o-teu-dominio-ou-preview>/auth/update-password`  
  O email de **recuperação de senha** usa `redirectTo` = `/auth/update-password` (com `?code=` na URL). Essa rota tem de ser **pública** no middleware (já está em `publicPaths`) e **listada** aqui; caso contrário o utilizador é enviado para `/sign-in` sem trocar o código e o link expira (`otp_expired`).

---

## 5. Webhooks

- **Stripe:** endpoint `/api/stripe/webhook` — ver [`FINANCEIRO_STRIPE_E_PRESENCIAL.md`](FINANCEIRO_STRIPE_E_PRESENCIAL.md) e [`STRIPE_KINGDOM_ONLINE.md`](STRIPE_KINGDOM_ONLINE.md).

---

## 6. Domínio personalizado

Passo a passo para **kingdomfight.com** e DNS: [`Deploy_Vercel_kingdomfight.md`](Deploy_Vercel_kingdomfight.md).

---

## 7. Depois do deploy

1. Abrir a URL do projeto e testar login (Supabase Auth / Google conforme configuração).
2. `npm run build` localmente antes de merges para evitar falhas na Vercel.
3. Problemas comuns: [`VERCEL_DEPLOY_TROUBLESHOOTING.md`](VERCEL_DEPLOY_TROUBLESHOOTING.md).

---

## 8. Checklist rápido

- [ ] Repositório correto e push atualizado  
- [ ] Variáveis de ambiente na Vercel (Production)  
- [ ] Build com sucesso  
- [ ] Login e dashboard acessíveis  
- [ ] Webhooks Stripe (se pagamentos online) configurados  

---

*Documentos antigos que referiam Clerk ou um estado fixo de “aguardando deploy” foram substituídos por este guia; detalhes de produto e roadmap em `memory.md` e `ROADMAP_Plataforma_KFS.md`.*
