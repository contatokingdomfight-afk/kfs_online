# ✅ Checklist Rápido - Deploy Vercel

## Antes de começar
- [ ] Conta GitHub ativa (OseiasBeu)
- [ ] Repositório `kfs_system` no GitHub (✅ já está!)
- [ ] Conta Supabase com projeto criado
- [ ] Conta Stripe (modo teste)

## Deploy na Vercel

### 1. Conectar GitHub
- [ ] Ir a [vercel.com](https://vercel.com)
- [ ] Login com GitHub
- [ ] Autorizar acesso aos repositórios

### 2. Importar Projeto
- [ ] Clicar em "Add New" → "Project"
- [ ] Selecionar `kfs_system`
- [ ] Clicar em "Import"

### 3. Variáveis de Ambiente (OBRIGATÓRIAS)

#### Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `DATABASE_URL`

#### NextAuth
- [ ] `NEXTAUTH_URL` (https://seu-projeto.vercel.app)
- [ ] `NEXTAUTH_SECRET` (gerar com: `openssl rand -base64 32`)

#### Stripe
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET` (configurar depois do deploy)

### 4. Deploy
- [ ] Clicar em "Deploy"
- [ ] Aguardar build (2-5 min)
- [ ] Verificar se deploy foi bem-sucedido

### 5. Pós-Deploy

#### Base de Dados
- [ ] Executar `npx prisma db push` (via Vercel CLI ou Supabase)
- [ ] Verificar se tabelas foram criadas

#### Stripe Webhook
- [ ] Ir ao Stripe Dashboard → Webhooks
- [ ] Criar endpoint: `https://seu-projeto.vercel.app/api/webhooks/stripe`
- [ ] Selecionar evento: `checkout.session.completed`
- [ ] Copiar Signing Secret
- [ ] Adicionar à Vercel como `STRIPE_WEBHOOK_SECRET`
- [ ] Fazer redeploy

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
