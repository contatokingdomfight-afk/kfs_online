# 🚀 COMECE AQUI - Deploy do KFS System

## ✅ O que já está pronto:

- ✅ Código commitado localmente
- ✅ Migration executada no Supabase (banco atualizado!)
- ✅ Sistema multi-escola funcionando
- ✅ Coaches podem ser alunos

---

## 📋 Próximos Passos (3 etapas simples)

### 1️⃣ Enviar Código para o GitHub (5 minutos)

**Problema atual**: Credenciais do Git incorretas

**Solução mais rápida**: Usar Personal Access Token

#### Como fazer:

1. **Criar token no GitHub:**
   - Acesse: https://github.com/settings/tokens
   - Clique em "Generate new token (classic)"
   - Nome: `KFS Deploy`
   - Marque: ✅ `repo`
   - Clique em "Generate token"
   - **COPIE O TOKEN** (ex: `ghp_abc123xyz...`)

2. **Configurar Git e fazer push:**
   
   Abra o PowerShell nesta pasta e execute:
   
   ```powershell
   # Substitua SEU_TOKEN pelo token que você copiou
   git remote set-url origin https://SEU_TOKEN@github.com/contatokingdomfight-afk/kfs_online.git
   
   # Fazer push
   git push origin main
   ```

3. **Verificar se funcionou:**
   - Acesse: https://github.com/contatokingdomfight-afk/kfs_online
   - Veja se os arquivos foram atualizados

---

### 2️⃣ Deploy na Vercel (10 minutos)

#### 2.1 Criar conta e importar projeto:

1. Acesse: https://vercel.com/signup
2. Faça login com GitHub
3. Clique em "Add New Project"
4. Selecione: `contatokingdomfight-afk/kfs_online`
5. **NÃO clique em Deploy ainda!**

#### 2.2 Configurar Variáveis de Ambiente:

Clique em "Environment Variables" e adicione:

**Supabase** (obrigatório):
```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

**Clerk** (obrigatório):
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

**App** (obrigatório):
```
NEXT_PUBLIC_APP_URL=https://seu-app.vercel.app
NODE_ENV=production
```

**Google OAuth** (se configurado):
```
GOOGLE_CLIENT_ID=seu-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-secret
```

**Stripe** (se configurado):
```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### 2.3 Fazer Deploy:

1. Clique em **"Deploy"**
2. Aguarde 2-5 minutos
3. Anote a URL gerada: `https://kfs-online.vercel.app`

---

### 3️⃣ Testar em Produção (5 minutos)

1. **Acessar a URL do deploy**
2. **Fazer login** com Google
3. **Verificar Dashboard** (deve mostrar stats, missões, progresso)
4. **Acessar Admin** → Escolas
5. **Verificar** se aparece: "Kingdom Fight School - Sede Principal"

---

## 📚 Guias Detalhados

Se precisar de mais detalhes, consulte:

- **Push no GitHub**: `DOCS/RESOLVER_GITHUB_PUSH.md`
- **Deploy Completo**: `DOCS/DEPLOY_VERCEL.md`
- **Sistema Multi-Escola**: `DOCS/SISTEMA_MULTI_ESCOLA.md`
- **Guia Rápido Multi-Escola**: `DOCS/GUIA_RAPIDO_MULTI_ESCOLA.md`

---

## 🆘 Problemas Comuns

### ❌ Push falhou

**Erro**: `Permission denied`

**Solução**: Verifique se copiou o token corretamente e incluiu `https://` antes do token

### ❌ Build falhou na Vercel

**Erro**: `Build failed`

**Solução**: 
1. Verifique se todas as variáveis de ambiente foram adicionadas
2. Teste localmente: `npm run build`
3. Se der erro local, corrija e faça novo commit

### ❌ Login não funciona

**Erro**: `Authentication failed`

**Solução**:
1. Verifique as variáveis `CLERK_SECRET_KEY` e `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
2. No Clerk Dashboard, adicione a URL da Vercel em "Allowed Origins"

### ❌ Escola não aparece

**Erro**: `School not found`

**Solução**: A migration já foi executada! Verifique no Supabase:
1. Acesse: https://supabase.com/dashboard
2. SQL Editor
3. Execute: `SELECT * FROM "School";`
4. Deve retornar: "Kingdom Fight School - Sede Principal"

---

## 🎯 Checklist Rápido

- [ ] Token do GitHub criado
- [ ] Push para GitHub funcionou
- [ ] Conta na Vercel criada
- [ ] Projeto importado na Vercel
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy concluído
- [ ] Login funcionando
- [ ] Dashboard carregando
- [ ] Escola padrão visível

---

## 📞 Onde Obter as Variáveis

### Supabase:
1. https://supabase.com/dashboard
2. Seu projeto → Settings → API
3. Copie: URL, anon key, service_role key

### Clerk:
1. https://dashboard.clerk.com
2. Seu projeto → API Keys
3. Copie: Publishable Key, Secret Key

### Google OAuth:
1. https://console.cloud.google.com
2. APIs & Services → Credentials
3. Copie: Client ID, Client Secret

---

**Boa sorte com o deploy! 🚀**

Se tiver dúvidas, consulte os guias detalhados na pasta `DOCS/`.

**Última atualização**: 28 de Fevereiro de 2026
