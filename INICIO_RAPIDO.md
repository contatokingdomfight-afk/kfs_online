# ⚡ Início Rápido - Deploy na Vercel

## 🎯 Objetivo
Fazer deploy da aplicação KFS System na Vercel em **menos de 30 minutos**.

## 📋 Pré-requisitos

Antes de começar, certifique-se que tem:

- ✅ Conta GitHub (OseiasBeu)
- ✅ Repositório `kfs_system` no GitHub (já está!)
- ✅ Conta Supabase com projeto criado
- ✅ Conta Stripe (modo teste)
- ✅ 20-30 minutos disponíveis

## 🚀 Passo a Passo (Resumido)

### 1. Preparar Informações (5 min)

Abra estes dashboards e tenha-os prontos:

```
🗄️  Supabase: https://supabase.com/dashboard/project/iozxildpnugqxzqkxntq
    → Settings → API (copiar URL e keys)
    → Settings → Database (copiar connection string)

💳 Stripe: https://dashboard.stripe.com
    → Developers → API keys (copiar publishable e secret)
```

### 2. Gerar NEXTAUTH_SECRET (1 min)

```bash
cd c:\Users\Oseias\Documents\KFS_System
node scripts/generate-nextauth-secret.js
```

Copie o valor gerado e guarde-o.

### 3. Deploy na Vercel (10 min)

```
1. Ir a: https://vercel.com
2. Login com GitHub
3. Add New → Project
4. Importar: kfs_system
5. Adicionar variáveis (ver secção abaixo)
6. Clicar em "Deploy"
7. Aguardar 2-5 minutos
```

### 4. Variáveis de Ambiente Mínimas

Cole estas variáveis na Vercel (Environment Variables):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://iozxildpnugqxzqkxntq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[copiar do Supabase]
SUPABASE_SERVICE_ROLE_KEY=[copiar do Supabase]
DATABASE_URL=[copiar do Supabase, formato: postgresql://...]

# NextAuth
NEXTAUTH_URL=https://kfs-system.vercel.app
NEXTAUTH_SECRET=[valor gerado no passo 2]

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[copiar do Stripe]
STRIPE_SECRET_KEY=[copiar do Stripe]
```

**Nota:** `STRIPE_WEBHOOK_SECRET` será configurado depois.

### 5. Configurar Stripe Webhook (5 min)

Após o deploy:

```
1. Copiar URL do projeto: https://kfs-system.vercel.app
2. Ir a: Stripe → Developers → Webhooks
3. Add endpoint: https://kfs-system.vercel.app/api/webhooks/stripe
4. Selecionar evento: checkout.session.completed
5. Copiar Signing Secret (whsec_...)
6. Voltar à Vercel → Settings → Environment Variables
7. Adicionar: STRIPE_WEBHOOK_SECRET=[valor copiado]
8. Fazer Redeploy
```

### 6. Configurar Base de Dados (5 min)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login e link
vercel login
vercel link

# Pull variáveis e migrar
vercel env pull .env.local
npx prisma db push
```

### 7. Testar (5 min)

```
✅ Abrir: https://kfs-system.vercel.app
✅ Criar conta de teste
✅ Fazer login
✅ Verificar dashboard
✅ Testar checkout Stripe:
   Cartão: 4242 4242 4242 4242
   Data: 12/34
   CVC: 123
```

## 📁 Ficheiros de Ajuda

Se precisar de mais detalhes, consulte:

| Ficheiro | Quando Usar |
|----------|-------------|
| `VERCEL_CHECKLIST.md` | Checklist completo |
| `GUIA_VISUAL_VERCEL.md` | Guia passo a passo visual |
| `VERCEL_DEPLOY.md` | Documentação completa |
| `VARIAVEIS_AMBIENTE_VERCEL.txt` | Lista de todas as variáveis |
| `LINKS_IMPORTANTES.md` | Links úteis |

## 🆘 Problemas Comuns

### Build falha com erro de Prisma
```json
// Adicionar ao package.json → scripts:
"postinstall": "prisma generate"
```
Depois fazer redeploy.

### Erro 500 em produção
1. Ir a: Vercel → Deployments → Functions
2. Ver logs de erro
3. Verificar se todas as variáveis estão configuradas

### Variáveis não funcionam
1. Confirmar que variáveis públicas começam com `NEXT_PUBLIC_`
2. Fazer redeploy após adicionar variáveis
3. Verificar environment correto (Production)

## ✅ Checklist Final

- [ ] Deploy concluído com sucesso
- [ ] Todas as variáveis configuradas
- [ ] Stripe webhook configurado
- [ ] Base de dados migrada
- [ ] Testes básicos funcionam
- [ ] Login/registo funciona
- [ ] Dashboard carrega
- [ ] Checkout Stripe funciona

## 🎉 Próximos Passos

Após o deploy bem-sucedido:

1. **Domínio Personalizado** (opcional)
   - Vercel → Settings → Domains
   - Adicionar seu domínio

2. **Google OAuth** (opcional)
   - Configurar no Google Cloud Console
   - Adicionar variáveis GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET

3. **Email** (opcional)
   - Configurar Resend
   - Adicionar RESEND_API_KEY

4. **Monitoring**
   - Ativar Vercel Analytics
   - Configurar Sentry (opcional)

## 📞 Suporte

Dúvidas? Consulte a documentação completa:
- `VERCEL_DEPLOY.md` - Guia completo
- `GUIA_VISUAL_VERCEL.md` - Guia visual

---

**💡 Dica:** Guarde este ficheiro como referência rápida para futuros deploys!
