# 🚀 Guia de Deploy na Vercel

## ✅ Status Atual

- ✅ Código commitado localmente
- ✅ Migration executada no Supabase
- ⚠️ Precisa fazer push para o GitHub
- ⏳ Aguardando deploy na Vercel

---

## 📋 Passo 1: Resolver Autenticação do GitHub

O erro `Permission denied` indica que o Git está usando credenciais incorretas. Você tem 2 opções:

### Opção A: Usar GitHub CLI (Recomendado)

```bash
# 1. Instalar GitHub CLI (se não tiver)
# Baixe em: https://cli.github.com/

# 2. Fazer login
gh auth login

# 3. Fazer push
gh repo sync
```

### Opção B: Usar Personal Access Token

1. Vá em: https://github.com/settings/tokens
2. Clique em "Generate new token (classic)"
3. Selecione os scopes: `repo`, `workflow`
4. Copie o token gerado
5. Use o comando:

```bash
git remote set-url origin https://SEU_TOKEN@github.com/contatokingdomfight-afk/kfs_online.git
git push origin main
```

### Opção C: Push via Interface do GitHub

1. Vá em: https://github.com/contatokingdomfight-afk/kfs_online
2. Clique em "Add file" → "Upload files"
3. Arraste os arquivos modificados
4. Commit com a mensagem: "feat: Sistema multi-escola e professores como alunos"

---

## 📋 Passo 2: Deploy na Vercel

### 2.1 Criar Conta na Vercel

1. Acesse: https://vercel.com/signup
2. Faça login com GitHub
3. Autorize o acesso ao repositório `kfs_online`

### 2.2 Importar Projeto

1. No dashboard da Vercel, clique em **"Add New Project"**
2. Selecione o repositório: `contatokingdomfight-afk/kfs_online`
3. Configure o projeto:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (deixar padrão)
   - **Build Command**: `npm run build` (deixar padrão)
   - **Output Directory**: `.next` (deixar padrão)

### 2.3 Configurar Variáveis de Ambiente

Clique em **"Environment Variables"** e adicione:

#### Variáveis Obrigatórias:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

# Clerk (Autenticação)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Google OAuth (se configurado)
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret

# Stripe (se configurado)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=https://seu-app.vercel.app
NODE_ENV=production
```

#### Como Obter as Variáveis:

**Supabase:**
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em: Settings → API
4. Copie: `URL`, `anon key`, `service_role key`

**Clerk:**
1. Acesse: https://dashboard.clerk.com
2. Selecione seu projeto
3. Vá em: API Keys
4. Copie as chaves

### 2.4 Deploy

1. Clique em **"Deploy"**
2. Aguarde o build (2-5 minutos)
3. Vercel vai gerar uma URL: `https://kfs-online.vercel.app`

---

## 📋 Passo 3: Configurar Domínio (Opcional)

1. No dashboard da Vercel, vá em **"Settings"** → **"Domains"**
2. Adicione seu domínio personalizado
3. Configure os DNS conforme instruções da Vercel

---

## 📋 Passo 4: Configurar Webhooks

### Stripe Webhook (se usar pagamentos)

1. Acesse: https://dashboard.stripe.com/webhooks
2. Clique em "Add endpoint"
3. URL: `https://seu-app.vercel.app/api/stripe/webhook`
4. Eventos: Selecione todos os eventos de `invoice` e `subscription`
5. Copie o **Signing Secret** e adicione como `STRIPE_WEBHOOK_SECRET` na Vercel

### Clerk Webhook (se necessário)

1. Acesse: https://dashboard.clerk.com
2. Vá em: Webhooks
3. URL: `https://seu-app.vercel.app/api/webhooks/clerk`
4. Eventos: `user.created`, `user.updated`

---

## 📋 Passo 5: Testar em Produção

### 5.1 Verificar Deploy

1. Acesse a URL do deploy: `https://kfs-online.vercel.app`
2. Teste o login com Google
3. Verifique se o dashboard carrega

### 5.2 Verificar Banco de Dados

1. Faça login como ADMIN
2. Vá em: Admin → Escolas
3. Verifique se a escola padrão aparece: "Kingdom Fight School - Sede Principal"

### 5.3 Criar Dados de Teste

1. Crie uma nova escola
2. Crie um aluno vinculado à nova escola
3. Crie um coach que também seja aluno
4. Verifique se os filtros por escola funcionam

---

## 🔧 Troubleshooting

### Erro: "Build Failed"

**Causa**: Erro de TypeScript ou dependências faltando

**Solução**:
```bash
# Testar build local
npm run build

# Se der erro, corrigir e fazer novo commit
git add .
git commit -m "fix: Corrige erros de build"
git push origin main
```

### Erro: "Database Connection Failed"

**Causa**: Variáveis de ambiente incorretas

**Solução**:
1. Verifique as variáveis na Vercel
2. Certifique-se que `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` estão corretas
3. Redeploy: Settings → Deployments → Redeploy

### Erro: "Authentication Failed"

**Causa**: Clerk não configurado ou URLs incorretas

**Solução**:
1. Verifique as variáveis `CLERK_SECRET_KEY` e `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
2. No Clerk Dashboard, adicione a URL da Vercel em "Allowed Origins"
3. Adicione também em "Redirect URLs"

### Erro: "School not found"

**Causa**: Migration não foi executada

**Solução**:
1. A migration já foi executada no Supabase
2. Verifique se a tabela `School` existe no Supabase
3. Execute: `SELECT * FROM "School";` no SQL Editor

---

## 📊 Checklist Final

- [ ] Código no GitHub atualizado
- [ ] Projeto importado na Vercel
- [ ] Todas as variáveis de ambiente configuradas
- [ ] Deploy concluído com sucesso
- [ ] Login funcionando
- [ ] Dashboard carregando
- [ ] Escola padrão visível no admin
- [ ] Filtros por escola funcionando
- [ ] Coach pode ser criado como aluno

---

## 🎯 Próximos Passos Após Deploy

1. **Configurar domínio personalizado** (ex: `app.kingdomfight.com`)
2. **Adicionar mais escolas** via Admin → Escolas
3. **Migrar dados reais** (alunos, coaches, turmas)
4. **Configurar backups automáticos** no Supabase
5. **Configurar monitoramento** (Vercel Analytics)
6. **Testar performance** e otimizar se necessário

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs na Vercel: Dashboard → Deployments → Logs
2. Verifique os logs no Supabase: Dashboard → Logs
3. Teste localmente com `npm run dev`
4. Consulte a documentação:
   - Vercel: https://vercel.com/docs
   - Next.js: https://nextjs.org/docs
   - Supabase: https://supabase.com/docs

---

**Última atualização**: 28 de Fevereiro de 2026
