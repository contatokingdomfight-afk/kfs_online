# 📸 Guia Visual - Deploy na Vercel

## 🎯 Passo a Passo com Screenshots

### 1. Aceder à Vercel

```
🌐 Abrir: https://vercel.com
👆 Clicar: "Sign Up" ou "Login"
🔐 Escolher: "Continue with GitHub"
```

### 2. Autorizar GitHub

```
✅ Autorizar Vercel a aceder aos seus repositórios
📝 Pode escolher "All repositories" ou "Only select repositories"
   Recomendado: Selecionar apenas "kfs_system"
```

### 3. Dashboard Vercel

```
📊 Verá o dashboard principal
👆 Clicar: Botão "Add New..." (canto superior direito)
📁 Selecionar: "Project"
```

### 4. Importar Repositório

```
🔍 Procurar: "kfs_system" na lista
   (Se não aparecer, clicar em "Adjust GitHub App Permissions")
📥 Clicar: "Import" ao lado do repositório
```

### 5. Configurar Projeto

```
📋 Formulário de configuração:

┌─────────────────────────────────────────────┐
│ Configure Project                            │
├─────────────────────────────────────────────┤
│                                              │
│ Project Name: kfs-system                    │
│ Framework Preset: Next.js (auto-detected)   │
│ Root Directory: ./                          │
│ Build Command: npm run build               │
│ Output Directory: .next                     │
│                                              │
└─────────────────────────────────────────────┘

⚠️  NÃO clicar em "Deploy" ainda!
```

### 6. Adicionar Variáveis de Ambiente

```
👆 Clicar: "Environment Variables" (expandir secção)

Para cada variável:
┌─────────────────────────────────────────────┐
│ Key: NEXT_PUBLIC_SUPABASE_URL               │
│ Value: https://iozxildpnugqxzqkxntq...      │
│ Environment: ✅ Production                   │
│              ✅ Preview                      │
│              ✅ Development                  │
└─────────────────────────────────────────────┘

👆 Clicar: "Add" para cada variável
```

#### Lista Completa de Variáveis:

```
1️⃣  NEXT_PUBLIC_SUPABASE_URL
2️⃣  NEXT_PUBLIC_SUPABASE_ANON_KEY
3️⃣  SUPABASE_SERVICE_ROLE_KEY
4️⃣  DATABASE_URL
5️⃣  NEXTAUTH_URL
6️⃣  NEXTAUTH_SECRET
7️⃣  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
8️⃣  STRIPE_SECRET_KEY
9️⃣  STRIPE_WEBHOOK_SECRET (adicionar depois)
```

### 7. Iniciar Deploy

```
✅ Todas as variáveis adicionadas?
👆 Clicar: Botão azul "Deploy"

⏳ Aguardar build (2-5 minutos)

Verá:
┌─────────────────────────────────────────────┐
│ 🔨 Building...                              │
│ ├─ Installing dependencies                  │
│ ├─ Running build command                    │
│ └─ Optimizing production build              │
└─────────────────────────────────────────────┘
```

### 8. Deploy Concluído

```
🎉 Verá a mensagem de sucesso:

┌─────────────────────────────────────────────┐
│ 🎊 Congratulations!                         │
│                                              │
│ Your project is now deployed!               │
│                                              │
│ 🌐 https://kfs-system.vercel.app            │
│                                              │
│ [Visit] [View Logs]                         │
└─────────────────────────────────────────────┘

👆 Clicar: "Visit" para ver o site
```

### 9. Configurar Stripe Webhook

```
🌐 Abrir: https://dashboard.stripe.com/webhooks
👆 Clicar: "+ Add endpoint"

┌─────────────────────────────────────────────┐
│ Endpoint URL:                                │
│ https://kfs-system.vercel.app/api/webhooks/stripe │
│                                              │
│ Events to send:                             │
│ ✅ checkout.session.completed                │
└─────────────────────────────────────────────┘

👆 Clicar: "Add endpoint"
📋 Copiar: "Signing secret" (começa com whsec_)
```

### 10. Adicionar Webhook Secret

```
🌐 Voltar à Vercel
👆 Ir a: Settings → Environment Variables
➕ Adicionar nova variável:

┌─────────────────────────────────────────────┐
│ Key: STRIPE_WEBHOOK_SECRET                  │
│ Value: whsec_...                            │
│ Environment: ✅ Production                   │
└─────────────────────────────────────────────┘

👆 Clicar: "Save"
```

### 11. Redeploy

```
👆 Ir a: Deployments
👆 Clicar: "..." no último deployment
👆 Selecionar: "Redeploy"
✅ Confirmar: "Redeploy"

⏳ Aguardar novo build (1-2 minutos)
```

### 12. Configurar Base de Dados

```
💻 No terminal local:

# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Link ao projeto
vercel link

# Pull das variáveis
vercel env pull .env.local

# Executar migração
npx prisma db push

✅ Verá: "Database synchronized successfully"
```

### 13. Verificação Final

```
✅ Checklist de testes:

1. Abrir site: https://kfs-system.vercel.app
2. Testar registo de novo utilizador
3. Fazer login
4. Aceder ao dashboard
5. Testar checkout Stripe (modo teste)
   Cartão teste: 4242 4242 4242 4242
   Data: Qualquer data futura
   CVC: Qualquer 3 dígitos

🎉 Se tudo funcionar, está pronto!
```

## 🔧 Configurações Adicionais (Opcional)

### Domínio Personalizado

```
👆 Ir a: Settings → Domains
➕ Adicionar: seu-dominio.com

Configurar DNS:
┌─────────────────────────────────────────────┐
│ Type: A                                     │
│ Name: @                                     │
│ Value: 76.76.21.21                          │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Type: CNAME                                 │
│ Name: www                                   │
│ Value: cname.vercel-dns.com                 │
└─────────────────────────────────────────────┘
```

### Analytics

```
👆 Ir a: Analytics
👆 Ativar: Vercel Analytics
✅ Gratuito até 100k pageviews/mês
```

### Logs em Tempo Real

```
👆 Ir a: Deployments → [último deploy]
👆 Clicar: "Functions" tab
📊 Ver logs em tempo real
```

## 🆘 Troubleshooting Visual

### Build Falha

```
❌ Erro: "Module not found: Can't resolve 'X'"

Solução:
1. Verificar package.json tem todas as dependências
2. Adicionar script postinstall:
   "postinstall": "prisma generate"
3. Fazer redeploy
```

### Erro 500 em Produção

```
❌ Página mostra erro 500

Solução:
1. Ir a: Deployments → Functions
2. Ver logs de erro
3. Verificar variáveis de ambiente
4. Confirmar DATABASE_URL correto
```

### Variáveis Não Funcionam

```
❌ Variáveis undefined em runtime

Solução:
1. Variáveis públicas devem começar com NEXT_PUBLIC_
2. Fazer redeploy após adicionar variáveis
3. Verificar environment correto (Production)
```

---

**💡 Dica:** Guarde este guia para referência futura. Pode ser útil para outros projetos!
