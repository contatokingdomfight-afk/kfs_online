# 🚀 Guia de Deploy na Vercel - KFS System

## Passo 1: Aceder à Vercel

1. Aceda a [https://vercel.com](https://vercel.com)
2. Faça login com a sua conta GitHub (OseiasBeu)
3. Autorize a Vercel a aceder aos seus repositórios

## Passo 2: Criar Novo Projeto

1. Clique em **"Add New..."** → **"Project"**
2. Procure pelo repositório **`kfs_system`**
3. Clique em **"Import"**

## Passo 3: Configurar o Projeto

### Framework Preset
- **Framework:** Next.js (deve ser detectado automaticamente)
- **Root Directory:** `.` (deixar como está)
- **Build Command:** `npm run build` (automático)
- **Output Directory:** `.next` (automático)

### Node.js Version
- Recomendado: **18.x** ou **20.x**

## Passo 4: Configurar Variáveis de Ambiente

Clique em **"Environment Variables"** e adicione as seguintes variáveis:

### 🔐 Supabase (Base de Dados)
```
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_do_supabase
```

**Como obter:**
1. Aceda ao [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione o projeto `iozxildpnugqxzqkxntq`
3. Vá a **Settings** → **API**
4. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### 🗄️ Database (Prisma)
```
DATABASE_URL=sua_connection_string_do_supabase
```

**Como obter:**
1. No Supabase Dashboard → **Settings** → **Database**
2. Em **Connection String** → **URI**
3. Copie a string (formato: `postgresql://postgres:[PASSWORD]@...`)
4. Substitua `[PASSWORD]` pela sua password real

### 💳 Stripe (Pagamentos)
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Como obter:**
1. Aceda ao [Stripe Dashboard](https://dashboard.stripe.com)
2. Vá a **Developers** → **API keys**
3. Copie:
   - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY`
4. Para o Webhook Secret:
   - Vá a **Developers** → **Webhooks**
   - Clique em **"Add endpoint"**
   - URL: `https://seu-dominio.vercel.app/api/webhooks/stripe`
   - Eventos: Selecione `checkout.session.completed`
   - Copie o **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### 🔑 NextAuth (Autenticação)
```
NEXTAUTH_URL=https://seu-dominio.vercel.app
NEXTAUTH_SECRET=gere_um_secret_aleatorio
```

**Como gerar NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```
Ou use: [https://generate-secret.vercel.app/32](https://generate-secret.vercel.app/32)

### 🌐 Google OAuth (Opcional)
```
GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret
```

**Como obter:**
1. Aceda ao [Google Cloud Console](https://console.cloud.google.com)
2. Crie um projeto ou selecione existente
3. Vá a **APIs & Services** → **Credentials**
4. Clique em **"Create Credentials"** → **"OAuth 2.0 Client ID"**
5. Configure:
   - **Application type:** Web application
   - **Authorized redirect URIs:** `https://seu-dominio.vercel.app/api/auth/callback/google`
6. Copie o **Client ID** e **Client Secret**

### 📧 Resend (Email - Opcional)
```
RESEND_API_KEY=re_...
```

**Como obter:**
1. Aceda a [https://resend.com](https://resend.com)
2. Faça login e vá a **API Keys**
3. Crie uma nova API key

## Passo 5: Deploy

1. Após configurar todas as variáveis, clique em **"Deploy"**
2. Aguarde 2-5 minutos enquanto a Vercel faz o build
3. Quando terminar, verá **"Congratulations!"** 🎉

## Passo 6: Configurar Base de Dados

Após o primeiro deploy, precisa executar as migrações do Prisma:

### Opção A: Via Vercel CLI (Recomendado)
```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Link ao projeto
vercel link

# Executar migração
vercel env pull .env.local
npx prisma db push
```

### Opção B: Via Supabase SQL Editor
1. Aceda ao Supabase Dashboard
2. Vá a **SQL Editor**
3. Execute o schema do Prisma manualmente

## Passo 7: Configurar Domínio (Opcional)

1. Na Vercel, vá a **Settings** → **Domains**
2. Adicione o seu domínio personalizado
3. Configure os DNS conforme indicado

## Passo 8: Configurar Webhooks do Stripe

1. Volte ao Stripe Dashboard → **Webhooks**
2. Edite o endpoint criado anteriormente
3. Atualize a URL para: `https://seu-dominio-real.vercel.app/api/webhooks/stripe`

## ✅ Verificação Final

Teste as seguintes funcionalidades:

- [ ] Login/Registo funciona
- [ ] Dashboard carrega corretamente
- [ ] Conexão à base de dados funciona
- [ ] Stripe checkout funciona (modo teste)
- [ ] Google OAuth funciona (se configurado)

## 🔄 Deployments Automáticos

A partir de agora, cada push para o branch `main` no GitHub irá:
1. Trigger um novo deploy automático na Vercel
2. Executar os testes (se configurados)
3. Fazer deploy da nova versão

## 🐛 Troubleshooting

### Build falha com erro de Prisma
```bash
# Adicione ao package.json > scripts:
"postinstall": "prisma generate"
```

### Erro de conexão à base de dados
- Verifique se o `DATABASE_URL` está correto
- Confirme que o IP da Vercel está na whitelist do Supabase

### Erro 500 em produção
- Verifique os logs na Vercel: **Deployments** → **[seu deploy]** → **Functions**
- Confirme que todas as variáveis de ambiente estão configuradas

## 📚 Recursos Úteis

- [Documentação Vercel](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

**Nota:** Guarde este ficheiro como referência. Pode precisar dele para futuros deploys ou troubleshooting.
