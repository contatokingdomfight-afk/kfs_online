# Deploy na Vercel (kingdomfight.com)

A aplicação Next.js está pronta para deploy na Vercel. Segue o passo a passo.

---

## 1. Preparar o repositório

- O código deve estar num repositório Git (GitHub, GitLab ou Bitbucket).
- Garante que o `main` (ou a branch que quiseres usar) está atualizado e que não tens ficheiros sensíveis commitados (`.env` e `client_secret*.json` já estão no `.gitignore`).

---

## 2. Criar projeto na Vercel

1. Entra em [vercel.com](https://vercel.com) e inicia sessão (podes usar “Continue with GitHub” para ligar o repositório).
2. Clica em **“Add New…”** → **“Project”**.
3. **Import** o repositório da KFS (se não aparecer, liga primeiro o GitHub/GitLab na Vercel).
4. Escolhe o repositório e clica **“Import”**.
5. **Configure Project**:
   - **Framework Preset**: Next.js (deve ser detetado).
   - **Root Directory**: deixar em branco (raiz do repo).
   - **Build Command**: `next build` (default).
   - **Output Directory**: default.
   - **Install Command**: `npm install` (default).

Não faças deploy ainda; primeiro configura as variáveis de ambiente.

---

## 3. Variáveis de ambiente (Environment Variables)

Em **Settings** do projeto (ou no passo de import), vai a **Environment Variables** e adiciona as mesmas que tens no `.env` local, para o ambiente **Production** (e, se quiseres, **Preview** para branches):

| Nome | Valor | Notas |
|------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | (o teu URL Supabase) | Obrigatório |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (chave anon) | Obrigatório |
| `SUPABASE_SERVICE_ROLE_KEY` | (service role) | Para ações admin / webhooks |
| `DATABASE_URL` | (connection string Supabase) | Se usares Prisma em build/migrations |
| `CRON_SECRET` | (segredo para /api/cron/...) | Se usares o cron de lembretes |
| `RESEND_API_KEY` | (se usares email) | Opcional |
| `RESEND_FROM_EMAIL` | (email Remetente) | Opcional |
| `STRIPE_SECRET_KEY` | (chave secreta Stripe) | Para pagamentos em produção |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | (chave pública) | Para pagamentos |
| `STRIPE_WEBHOOK_SECRET` | (whsec_... do webhook produção) | Só quando configurares webhook Stripe em produção |

Não precisas de adicionar o `.env` ao repo; preenche cada variável na Vercel e marca para **Production** (e opcionalmente **Preview**).

---

## 4. Primeiro deploy

1. Clica **“Deploy”**.
2. A Vercel faz build e deploy. No fim ficas com um URL tipo `https://kfs-system-xxx.vercel.app`.
3. Testa esse URL (login, dashboard, etc.) para confirmar que está tudo a funcionar.

---

## 5. Domínio kingdomfight.com

1. No projeto na Vercel: **Settings** → **Domains**.
2. Clica **“Add”** e escreve `kingdomfight.com` (e, se quiseres, `www.kingdomfight.com`).
3. A Vercel indica como configurar o DNS (registos CNAME ou A).
4. Na **Hostinger** (ou onde tens o DNS do domínio):
   - Para usar **kingdomfight.com** na Vercel: adiciona um registo **CNAME** ou **A** conforme a Vercel indicar (ex.: CNAME `www` → `cname.vercel-dns.com`, ou A para o root).
   - A Vercel tem um guia por provedor; segue o que aparecer em **Domains** depois de adicionares o domínio.
5. Quando o DNS propagar, a Vercel ativa o SSL (HTTPS) automaticamente.

Depois de o domínio estar ativo, atualiza:

- **Supabase** → Authentication → URL Configuration: **Site URL** = `https://kingdomfight.com`, **Redirect URLs** com `https://kingdomfight.com/auth/callback`.
- **Google Cloud** → Credentials → Authorized JavaScript origins e (se aplicável) redirects com `https://kingdomfight.com`.

---

## 6. Build e Prisma

O projeto usa Prisma (schema); a base de dados está no Supabase. Na Vercel:

- Se não correres migrações no deploy, basta que `prisma generate` corra no build. Por defeito o Next.js não chama o Prisma no build; se um dia precisares, podes usar **Build Command**: `prisma generate && next build`.
- **DATABASE_URL** só é necessária se correres `prisma migrate` ou `prisma db push` a partir da Vercel (o que não é habitual). Para a app em runtime, o Supabase é acedido via `NEXT_PUBLIC_*` e `SUPABASE_SERVICE_ROLE_KEY`.

---

## Resumo

1. Repo no GitHub/GitLab → Import na Vercel.
2. Configurar **Environment Variables** (Supabase, Stripe, Cron, etc.).
3. Deploy → testar no URL `.vercel.app`.
4. **Domains** → adicionar `kingdomfight.com` e configurar DNS na Hostinger.
5. Atualizar Supabase e Google (OAuth) com o URL de produção.

Qualquer dúvida concreta (um erro de build, uma variável, ou um passo na Hostinger), diz em que passo estás e o que aparece no ecrã.
