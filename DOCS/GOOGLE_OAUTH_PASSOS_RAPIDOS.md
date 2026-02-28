# 🚀 Google OAuth - Passos Rápidos

## Você está aqui: Google Cloud Platform Dashboard

### ✅ Passo 1: Configurar OAuth Consent Screen

1. **No menu lateral esquerdo, procure:**
   ```
   APIs & Services → OAuth consent screen
   ```
   
2. **Ou clique diretamente neste link:**
   ```
   https://console.cloud.google.com/apis/credentials/consent
   ```

3. **Selecionar User Type:**
   - ✅ **External** (para permitir qualquer utilizador Google)
   - Clicar em **"CREATE"**

4. **Preencher App Information:**
   ```
   App name: Kingdom Fight School
   User support email: contatokingdomfight@gmail.com
   App logo: (pode deixar vazio por agora)
   ```

5. **App domain (opcional):**
   ```
   Application home page: https://kfs-online.vercel.app
   (ou deixar vazio por agora)
   ```

6. **Developer contact information:**
   ```
   Email addresses: contatokingdomfight@gmail.com
   ```

7. **Clicar em "SAVE AND CONTINUE"**

8. **Scopes (Permissões):**
   - Deixar padrão (não precisa adicionar nada)
   - Clicar em **"SAVE AND CONTINUE"**

9. **Test users:**
   - Clicar em **"+ ADD USERS"**
   - Adicionar: `contatokingdomfight@gmail.com`
   - Adicionar outros emails de teste se necessário
   - Clicar em **"ADD"**
   - Clicar em **"SAVE AND CONTINUE"**

10. **Summary:**
    - Revisar informações
    - Clicar em **"BACK TO DASHBOARD"**

---

### ✅ Passo 2: Criar OAuth 2.0 Client ID

1. **No menu lateral esquerdo:**
   ```
   APIs & Services → Credentials
   ```

2. **Ou clique diretamente:**
   ```
   https://console.cloud.google.com/apis/credentials
   ```

3. **Criar credenciais:**
   - Clicar em **"+ CREATE CREDENTIALS"** (topo da página)
   - Selecionar: **"OAuth client ID"**

4. **Application type:**
   - Selecionar: **"Web application"**

5. **Name:**
   ```
   KFS System Web Client
   ```

6. **Authorized JavaScript origins:**
   - Clicar em **"+ ADD URI"**
   - Adicionar:
     ```
     http://localhost:3000
     ```
   - Clicar em **"+ ADD URI"** novamente
   - Adicionar (quando tiver domínio):
     ```
     https://kfs-online.vercel.app
     ```

7. **Authorized redirect URIs:**
   - Clicar em **"+ ADD URI"**
   - Adicionar:
     ```
     http://localhost:3000/auth/callback
     ```
   - Clicar em **"+ ADD URI"** novamente
   - Adicionar:
     ```
     https://iozxildpnugqxzqkxntq.supabase.co/auth/v1/callback
     ```
   - Clicar em **"+ ADD URI"** novamente (quando tiver domínio)
   - Adicionar:
     ```
     https://kfs-online.vercel.app/auth/callback
     ```

8. **Clicar em "CREATE"**

9. **Copiar credenciais:**
   - Verá uma modal com:
     - ✅ **Client ID** (começa com números)
     - ✅ **Client secret** (começa com GOCSPX-)
   - **COPIAR AMBOS** e guardar num ficheiro de texto temporário
   - Clicar em **"OK"**

---

### ✅ Passo 3: Configurar no Supabase

1. **Abrir Supabase:**
   ```
   https://supabase.com/dashboard/project/iozxildpnugqxzqkxntq/auth/providers
   ```

2. **Procurar "Google":**
   - Na lista de providers, procurar **"Google"**
   - Clicar para expandir

3. **Ativar:**
   - Toggle **"Enable Sign in with Google"** para **ON**

4. **Preencher:**
   ```
   Client ID (for OAuth): [colar Client ID do Google]
   Client Secret (for OAuth): [colar Client Secret do Google]
   ```

5. **Clicar em "Save"**

---

### ✅ Passo 4: Testar

1. **Iniciar servidor local:**
   ```bash
   cd c:\Users\Oseias\Documents\KFS_System
   npm run dev
   ```

2. **Abrir browser:**
   ```
   http://localhost:3000/sign-in
   ```

3. **Clicar em "Continuar com Google"**

4. **Selecionar conta Google**

5. **Deve redirecionar para /dashboard** ✅

---

## 🔍 Sobre o Aviso de Billing

O aviso que está a ver:
```
"Your app does not have an associated Cloud billing account"
```

**Não precisa de se preocupar!**

- ✅ OAuth é **GRATUITO** até 10,000 utilizadores/dia
- ✅ Não precisa de adicionar cartão de crédito
- ✅ Pode usar normalmente para desenvolvimento e produção

**Quando adicionar billing:**
- Só se precisar de mais de 10,000 logins/dia
- Ou se quiser usar outros serviços do Google Cloud

---

## 📝 Resumo das URLs Importantes

### Desenvolvimento Local:
```
JavaScript origin: http://localhost:3000
Redirect URI: http://localhost:3000/auth/callback
```

### Supabase (sempre necessário):
```
Redirect URI: https://iozxildpnugqxzqkxntq.supabase.co/auth/v1/callback
```

### Produção (quando fizer deploy):
```
JavaScript origin: https://kfs-online.vercel.app
Redirect URI: https://kfs-online.vercel.app/auth/callback
```

---

## ✅ Checklist

```
[ ] OAuth Consent Screen configurado
[ ] Test users adicionados
[ ] OAuth Client ID criado
[ ] Client ID e Secret copiados
[ ] Supabase configurado com credenciais
[ ] Teste local funcionou
```

---

**💡 Dica:** Guarde o Client ID e Client Secret num local seguro. Vai precisar deles para configurar o Supabase!
