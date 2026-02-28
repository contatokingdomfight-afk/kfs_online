# 🔐 Configuração Google OAuth - KFS System

## 📋 Visão Geral

Este guia explica como configurar o login com Google na aplicação KFS System usando Supabase.

## ⏱️ Tempo Estimado

- **Configuração:** 10-15 minutos
- **Testes:** 5 minutos

---

## 🎯 Passo 1: Criar Projeto no Google Cloud Console

### 1.1 Aceder ao Google Cloud Console

1. Ir a: https://console.cloud.google.com
2. Fazer login com conta Google
3. Aceitar termos de serviço (se for primeira vez)

### 1.2 Criar Novo Projeto

```
1. Clicar em "Select a project" (topo da página)
2. Clicar em "NEW PROJECT"
3. Preencher:
   - Project name: KFS System
   - Organization: (deixar vazio ou selecionar)
4. Clicar em "CREATE"
5. Aguardar criação do projeto (30-60 segundos)
```

---

## 🔧 Passo 2: Configurar OAuth Consent Screen

### 2.1 Aceder a OAuth Consent Screen

```
1. No menu lateral: APIs & Services → OAuth consent screen
2. Ou ir direto: https://console.cloud.google.com/apis/credentials/consent
```

### 2.2 Configurar Consent Screen

```
1. User Type: External
2. Clicar em "CREATE"

3. Preencher App Information:
   - App name: Kingdom Fight School
   - User support email: contatokingdomfight@gmail.com
   - App logo: (opcional - pode adicionar logo da KFS)

4. Developer contact information:
   - Email addresses: contatokingdomfight@gmail.com

5. Clicar em "SAVE AND CONTINUE"

6. Scopes (deixar padrão):
   - Clicar em "SAVE AND CONTINUE"

7. Test users (adicionar emails de teste):
   - Adicionar: contatokingdomfight@gmail.com
   - Adicionar outros emails de teste se necessário
   - Clicar em "SAVE AND CONTINUE"

8. Summary:
   - Revisar informações
   - Clicar em "BACK TO DASHBOARD"
```

---

## 🔑 Passo 3: Criar OAuth 2.0 Credentials

### 3.1 Aceder a Credentials

```
1. No menu lateral: APIs & Services → Credentials
2. Ou ir direto: https://console.cloud.google.com/apis/credentials
```

### 3.2 Criar OAuth Client ID

```
1. Clicar em "+ CREATE CREDENTIALS"
2. Selecionar: "OAuth client ID"

3. Application type: Web application

4. Name: KFS System Web Client

5. Authorized JavaScript origins:
   - http://localhost:3000 (desenvolvimento)
   - https://seu-dominio.vercel.app (produção)
   - https://kfs-online.vercel.app (se usar este domínio)

6. Authorized redirect URIs:
   - http://localhost:3000/auth/callback (desenvolvimento)
   - https://seu-dominio.vercel.app/auth/callback (produção)
   - https://kfs-online.vercel.app/auth/callback (se usar este domínio)

7. Clicar em "CREATE"
```

### 3.3 Copiar Credenciais

Após criar, verá uma modal com:

```
✅ Client ID: 
   Exemplo: 123456789-abc123def456.apps.googleusercontent.com

✅ Client secret:
   Exemplo: GOCSPX-abc123def456ghi789

📝 Copiar ambos os valores e guardar num local seguro!
```

---

## 🗄️ Passo 4: Configurar Supabase

### 4.1 Aceder ao Supabase Dashboard

```
1. Ir a: https://supabase.com/dashboard
2. Selecionar projeto: iozxildpnugqxzqkxntq
3. Ir a: Authentication → Providers
```

### 4.2 Ativar Google Provider

```
1. Procurar "Google" na lista de providers
2. Clicar para expandir

3. Ativar: Toggle "Enable Sign in with Google" para ON

4. Preencher:
   - Client ID (for OAuth): [colar Client ID do Google]
   - Client Secret (for OAuth): [colar Client Secret do Google]

5. Authorized Client IDs (opcional):
   - Deixar vazio por agora

6. Clicar em "Save"
```

### 4.3 Copiar Callback URL

O Supabase mostra a Callback URL que precisa:

```
✅ Callback URL (for OAuth):
   https://iozxildpnugqxzqkxntq.supabase.co/auth/v1/callback

📝 Esta URL já está configurada automaticamente pelo Supabase
```

---

## 🔐 Passo 5: Configurar Variáveis de Ambiente

### 5.1 Desenvolvimento Local

Adicionar ao ficheiro `.env.local`:

```env
# Google OAuth (opcional - já configurado no Supabase)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456ghi789
```

**Nota:** Estas variáveis são opcionais porque o Supabase já gere o OAuth internamente.

### 5.2 Produção (Vercel)

Se quiser adicionar as variáveis na Vercel:

```
1. Vercel Dashboard → Projeto → Settings → Environment Variables

2. Adicionar:
   Key: NEXT_PUBLIC_GOOGLE_CLIENT_ID
   Value: [seu Client ID]
   Environment: Production, Preview, Development

3. Adicionar:
   Key: GOOGLE_CLIENT_SECRET
   Value: [seu Client Secret]
   Environment: Production, Preview, Development

4. Fazer Redeploy
```

---

## ✅ Passo 6: Testar Configuração

### 6.1 Desenvolvimento Local

```bash
# Iniciar servidor
npm run dev

# Abrir browser
http://localhost:3000/sign-in
```

### 6.2 Testar Login

```
1. Clicar no botão "Continuar com Google"
2. Selecionar conta Google
3. Aceitar permissões
4. Deve ser redirecionado para /dashboard
```

### 6.3 Verificar Utilizador no Supabase

```
1. Supabase Dashboard → Authentication → Users
2. Deve ver novo utilizador com:
   - Email da conta Google
   - Provider: google
   - Created at: data/hora atual
```

---

## 🔍 Troubleshooting

### Erro: "redirect_uri_mismatch"

**Causa:** URL de redirect não está autorizada no Google Cloud Console

**Solução:**
```
1. Google Cloud Console → Credentials
2. Editar OAuth 2.0 Client
3. Adicionar URL correto em "Authorized redirect URIs"
4. Aguardar 5 minutos para propagar
```

### Erro: "access_denied"

**Causa:** Utilizador não está na lista de test users

**Solução:**
```
1. Google Cloud Console → OAuth consent screen
2. Adicionar email em "Test users"
3. Ou publicar app (mudar de Testing para Production)
```

### Erro: "invalid_client"

**Causa:** Client ID ou Secret incorretos no Supabase

**Solução:**
```
1. Verificar credenciais no Google Cloud Console
2. Copiar novamente Client ID e Secret
3. Atualizar no Supabase → Authentication → Providers → Google
4. Clicar em "Save"
```

### Login funciona mas não cria utilizador

**Causa:** Trigger do Supabase pode não estar a funcionar

**Solução:**
```
1. Verificar se trigger existe:
   Supabase → Database → Functions → handle_new_user

2. Se não existir, criar trigger:
   Ver ficheiro: prisma/schema.prisma (comentários no topo)

3. Ou criar manualmente no SQL Editor
```

---

## 📊 Fluxo Completo do OAuth

```
1. Utilizador clica em "Continuar com Google"
   ↓
2. App redireciona para Google OAuth
   ↓
3. Utilizador faz login no Google
   ↓
4. Google redireciona para Supabase callback
   ↓
5. Supabase valida e cria sessão
   ↓
6. Supabase redireciona para /auth/callback
   ↓
7. App troca code por session
   ↓
8. App redireciona para /dashboard
   ↓
9. Utilizador está autenticado ✅
```

---

## 🔒 Segurança

### Boas Práticas

1. **Nunca commitar secrets:**
   ```bash
   # .gitignore já inclui:
   .env
   .env.local
   .env*.local
   ```

2. **Usar variáveis de ambiente:**
   - Client ID pode ser público (NEXT_PUBLIC_*)
   - Client Secret DEVE ser privado

3. **Restringir URLs:**
   - Apenas adicionar URLs necessárias
   - Usar HTTPS em produção

4. **Monitorizar acessos:**
   - Google Cloud Console → APIs & Services → Dashboard
   - Ver quotas e uso

---

## 📝 Checklist de Configuração

```
Antes de começar:
[ ] Conta Google ativa
[ ] Acesso ao Google Cloud Console
[ ] Acesso ao Supabase Dashboard

Google Cloud Console:
[ ] Projeto criado
[ ] OAuth consent screen configurado
[ ] OAuth 2.0 Client ID criado
[ ] Client ID e Secret copiados

Supabase:
[ ] Google provider ativado
[ ] Client ID configurado
[ ] Client Secret configurado
[ ] Configuração salva

Testes:
[ ] Login com Google funciona em dev
[ ] Utilizador criado no Supabase
[ ] Redirecionamento para dashboard funciona
[ ] Logout funciona
```

---

## 🔗 Links Úteis

### Google Cloud
- **Console:** https://console.cloud.google.com
- **Credentials:** https://console.cloud.google.com/apis/credentials
- **OAuth Consent:** https://console.cloud.google.com/apis/credentials/consent
- **Documentação:** https://developers.google.com/identity/protocols/oauth2

### Supabase
- **Dashboard:** https://supabase.com/dashboard/project/iozxildpnugqxzqkxntq
- **Auth Settings:** https://supabase.com/dashboard/project/iozxildpnugqxzqkxntq/auth/providers
- **Documentação:** https://supabase.com/docs/guides/auth/social-login/auth-google

---

## 💡 Dicas

1. **Desenvolvimento Local:**
   - Use `http://localhost:3000` (não `127.0.0.1`)
   - Adicione ambos se necessário

2. **Múltiplos Ambientes:**
   - Crie OAuth Clients separados para dev/prod
   - Ou adicione todas as URLs no mesmo client

3. **Test Users:**
   - Adicione emails de toda a equipa
   - Ou publique app para remover restrição

4. **Monitorização:**
   - Verifique logs no Google Cloud Console
   - Verifique logs no Supabase Dashboard

---

**📅 Última Atualização:** 2026-02-28  
**👤 Projeto:** KFS System  
**🔗 Repositório:** https://github.com/contatokingdomfight-afk/kfs_online
