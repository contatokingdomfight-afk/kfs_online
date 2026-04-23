# Deploy na Vercel (KFS Online)

> **Última revisão:** 18 abril 2026.  
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

Configurar em **Settings → Environment Variables** da Vercel.

| Área | Exemplos de chaves |
|------|---------------------|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| App / URL | `NEXT_PUBLIC_APP_URL` (opcional; ver `.env.example`) |
| Base de dados | `DATABASE_URL` (Prisma; mesmo projeto Supabase) |
| Email (Resend) | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — ver [`CONFIGURAR_RESEND.md`](CONFIGURAR_RESEND.md) |
| Stripe | **`STRIPE_SECRET_KEY`** (obrigatório; `sk_test_…` ou `sk_live_…`), **`STRIPE_WEBHOOK_SECRET`** (`whsec_…` do mesmo modo test/live), opcional **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** — ver [`STRIPE_KINGDOM_ONLINE.md`](STRIPE_KINGDOM_ONLINE.md). *Não* usar nomes não suportados pelo código (`STRIPE_API_KEY`, `STRIPE_PUBLIC_KEY` como substituto da secreta). |
| Google OAuth | `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (opcional; ver `DOCS/GOOGLE_OAUTH_SETUP.md`) |
| Crons | `CRON_SECRET` (rotas em `app/api/cron/*`) |
| Opcional | `NEXT_PUBLIC_DISABLE_SPEED_INSIGHTS=true` para desativar só o Speed Insights (ver [`OTIMIZACOES_SPEED_INSIGHTS.md`](OTIMIZACOES_SPEED_INSIGHTS.md)) |

Valores exatos: copiar do `.env.local` de desenvolvimento (sem secrets no Git).

### 4.0 Preview por branch (ex.: `dev` → `kfs-sistema-git-dev-…vercel.app`)

Os **URL de deploy por branch** usam o ambiente **Preview** na Vercel, **não** o de Production.

- Se as variáveis estiverem **só** em **Production**, o build até pode passar, mas em runtime o `@supabase/ssr` falha com: *«Your project's URL and API key are required»* — porque `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` **não existem** no bundle do Preview.
- **Correção:** no mesmo ecrã de Environment Variables, para cada chave crítica (no mínimo as da tabela acima que a app usa no servidor e no cliente), marcar também **Preview** (e **Development** se usares `vercel dev`). Podes duplicar os mesmos valores que em Production **ou** apontar para um projeto Supabase de staging, se existir.
- **Branch:** ao editar uma variável, verifica se não está limitada a «só `main`» (ou outra lista). O deploy Preview da branch **`dev`** só herda variáveis que incluam essa branch ou **All branches**.
- As `NEXT_PUBLIC_*` são **gravadas no JavaScript no build**. Depois de guardar variáveis, faz **Redeploy** do deployment Preview; se ainda falhar, **Redeploy** com **Clear build cache** (ou «Redeploy without using cache»), para não reutilizar um bundle antigo sem as chaves.

### 4.1 Supabase Auth — callbacks e recuperação de senha

Em **Authentication → URL Configuration**:

- **Site URL:** URL de produção (ou `http://localhost:3000` em dev).
- **Redirect URLs:** incluir pelo menos (ou um wildcard `https://<domínio>/auth/**`):
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/update-password`
  - `https://<o-teu-dominio-ou-preview>/auth/callback`
  - `https://<o-teu-dominio-ou-preview>/auth/update-password`  
  O email de **recuperação de senha** usa `redirectTo` = `/auth/callback?next=/auth/update-password` (o `?code=` é tratado no callback no servidor). `/auth/callback` e `/auth/update-password` têm de ser **públicos** no middleware (já estão em `publicPaths`) e **listados** aqui; caso contrário o fluxo falha (`otp_expired` ou PKCE).

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
- [ ] Variáveis de ambiente na Vercel (**Production** e **Preview** se usares URLs `*-git-*-*.vercel.app`)  
- [ ] Build com sucesso  
- [ ] Login e dashboard acessíveis  
- [ ] Webhooks Stripe (se pagamentos online) configurados  

---

*Documentos antigos que referiam Clerk ou um estado fixo de “aguardando deploy” foram substituídos por este guia; detalhes de produto e roadmap em `memory.md` e `ROADMAP_Plataforma_KFS.md`.*
