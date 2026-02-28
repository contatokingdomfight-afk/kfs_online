# 🔧 Usar OAuth Client Existente - Google Cloud

## ✅ Você já tem um OAuth Client ID criado!

**Nome:** Web client 1  
**Tipo:** Web application  
**Client ID:** 1013705431415-4t4...

---

## 📋 Passo a Passo

### 1. Editar o OAuth Client

Na página de Credentials onde está agora:

1. **Localizar "Web client 1"** na lista de OAuth 2.0 Client IDs

2. **Clicar no nome** "Web client 1" (ou no ícone de lápis ✏️)

3. **Vai abrir a página de edição**

---

### 2. Adicionar Authorized JavaScript Origins

Na secção **"Authorized JavaScript origins"**:

1. **Verificar se já existe:**
   - `http://localhost:3000`
   
2. **Se não existir, adicionar:**
   - Clicar em **"+ ADD URI"**
   - Colar: `http://localhost:3000`
   - Pressionar Enter

3. **Adicionar também (para produção futura):**
   - Clicar em **"+ ADD URI"**
   - Colar: `https://kfs-online.vercel.app`
   - Pressionar Enter

---

### 3. Adicionar Authorized Redirect URIs

Na secção **"Authorized redirect URIs"**:

**IMPORTANTE:** Precisa adicionar 3 URIs:

1. **Para desenvolvimento local:**
   - Clicar em **"+ ADD URI"**
   - Colar: `http://localhost:3000/auth/callback`
   - Pressionar Enter

2. **Para Supabase (OBRIGATÓRIO):**
   - Clicar em **"+ ADD URI"**
   - Colar: `https://iozxildpnugqxzqkxntq.supabase.co/auth/v1/callback`
   - Pressionar Enter
   - ⚠️ **Esta é a mais importante!**

3. **Para produção (quando fizer deploy):**
   - Clicar em **"+ ADD URI"**
   - Colar: `https://kfs-online.vercel.app/auth/callback`
   - Pressionar Enter

---

### 4. Salvar Alterações

1. **Clicar em "SAVE"** (no fundo da página)

2. **Aguardar confirmação** (pode demorar alguns segundos)

---

### 5. Copiar Credenciais

Após salvar, ainda na página de edição:

1. **Procurar no topo da página:**
   - **Client ID:** `1013705431415-4t4...` (número completo)
   - **Client secret:** `GOCSPX-...` (começa com GOCSPX-)

2. **Copiar ambos:**
   - Pode clicar no ícone de copiar 📋 ao lado de cada um
   - Ou selecionar e copiar manualmente

3. **Guardar num ficheiro de texto temporário:**
   ```
   Client ID: 1013705431415-4t4...
   Client Secret: GOCSPX-...
   ```

---

### 6. Configurar no Supabase

1. **Abrir Supabase:**
   ```
   https://supabase.com/dashboard/project/iozxildpnugqxzqkxntq/auth/providers
   ```

2. **Procurar "Google"** na lista de providers

3. **Clicar para expandir**

4. **Ativar:**
   - Toggle **"Enable Sign in with Google"** para **ON**

5. **Preencher:**
   ```
   Client ID (for OAuth): [colar Client ID completo]
   Client Secret (for OAuth): [colar Client Secret]
   ```

6. **Clicar em "Save"**

---

### 7. Testar

1. **Iniciar servidor:**
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

## 📝 Resumo das URIs Necessárias

### Authorized JavaScript origins:
```
✅ http://localhost:3000
✅ https://kfs-online.vercel.app
```

### Authorized redirect URIs:
```
✅ http://localhost:3000/auth/callback
✅ https://iozxildpnugqxzqkxntq.supabase.co/auth/v1/callback  ⭐ OBRIGATÓRIA
✅ https://kfs-online.vercel.app/auth/callback
```

---

## ⚠️ IMPORTANTE

A URI do Supabase é **OBRIGATÓRIA**:
```
https://iozxildpnugqxzqkxntq.supabase.co/auth/v1/callback
```

Sem ela, o login com Google **NÃO VAI FUNCIONAR**!

---

## 🔍 Troubleshooting

### Erro: "redirect_uri_mismatch"

**Causa:** URI não está na lista de Authorized redirect URIs

**Solução:**
1. Voltar ao Google Cloud Console
2. Editar "Web client 1"
3. Adicionar a URI em falta
4. Salvar
5. Aguardar 5 minutos para propagar
6. Tentar novamente

---

## ✅ Checklist

```
[ ] OAuth Client "Web client 1" editado
[ ] JavaScript origins adicionadas
[ ] Redirect URIs adicionadas (incluindo Supabase!)
[ ] Alterações salvas
[ ] Client ID e Secret copiados
[ ] Supabase configurado
[ ] Teste local funcionou
```

---

**💡 Próximo Passo:** Editar "Web client 1" e adicionar as URIs!
