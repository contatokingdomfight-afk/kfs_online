# Checklist – Deploy Vercel (KFS Online)

> **Março 2026:** Repo típico **`kfs_online`** · Next **15** · Node **20** · ver **`VARIAVEIS_AMBIENTE_VERCEL.txt`**.

## Antes de começar
- [ ] Conta GitHub
- [ ] Repositório **`kfs_online`** (ou fork) no GitHub
- [ ] Conta Supabase
- [ ] Conta Stripe (teste)

## Deploy na Vercel

### 1. Conectar GitHub
- [ ] Ir a [vercel.com](https://vercel.com)
- [ ] Login com GitHub
- [ ] Autorizar acesso aos repositórios

### 2. Importar projeto
- [ ] Add New → Project
- [ ] Selecionar **`kfs_online`** (ou o repo correto)
- [ ] Framework: Next.js; **Node.js 20**

### 3. Variáveis de ambiente (mínimo)

#### Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `DATABASE_URL`

#### Cron
- [ ] `CRON_SECRET` (protege `/api/cron/*`; ver `vercel.json`)

#### NextAuth (opcional / legado)
- [ ] `NEXTAUTH_URL` / `NEXTAUTH_SECRET` — só se usares esta stack

#### Stripe
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET` (após deploy; URL **`/api/stripe/webhook`**)

### 4. Deploy
- [ ] Clicar em "Deploy"
- [ ] Aguardar build (2-5 min)
- [ ] Verificar se deploy foi bem-sucedido

### 5. Pós-Deploy

#### Base de Dados
- [ ] Executar `npx prisma db push` (via Vercel CLI ou Supabase)
- [ ] Verificar se tabelas foram criadas

#### Stripe Webhook
- [ ] Stripe → Webhooks → Add endpoint
- [ ] URL: `https://seu-projeto.vercel.app/api/stripe/webhook`
- [ ] Eventos conforme necessidade (ex.: pagamentos de subscrição / checkout)
- [ ] Copiar signing secret → `STRIPE_WEBHOOK_SECRET` na Vercel
- [ ] Redeploy

### 6. Testes Finais
- [ ] Abrir site em produção
- [ ] Testar login/registo
- [ ] Verificar dashboard
- [ ] Testar checkout Stripe (modo teste)

## 🚨 Problemas Comuns

### Build falha
```bash
# Adicionar ao package.json:
"postinstall": "prisma generate"
```

### Erro de conexão DB
- Verificar `DATABASE_URL` correto
- Confirmar IP Vercel na whitelist Supabase

### Variáveis não aparecem
- Fazer redeploy após adicionar variáveis
- Verificar se estão em "Production"

## 📞 Suporte
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Stripe Docs: https://stripe.com/docs

---

**Tempo estimado:** 15-30 minutos (primeira vez)
