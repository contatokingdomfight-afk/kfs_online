# Login Google + domínio na Hostinger (produção)

Quando a app estiver em produção no teu domínio (ex.: `https://app.kingdomfight.com` ou `https://kingdomfight.com`), configura o seguinte.

---

## 1. Ficheiro do Google (client_secret_xxx.json)

- **A app não usa este ficheiro.** O login com Google é feito pelo Supabase; só precisas dos valores que vêm dentro dele.
- Abre o ficheiro (só na tua máquina) e copia:
  - `client_id` → cola no Supabase (Authentication → Providers → Google → **Client ID**).
  - `client_secret` → cola no Supabase no campo **Client Secret**.
- **Apaga o ficheiro da raiz do projeto** (ou guarda-o fora do projeto, ex.: numa pasta “Segredos” no PC). Assim evitas que seja commitado por engano. O `.gitignore` já ignora `client_secret*.json`, mas é mais seguro não ter o ficheiro na pasta do código.
- Se já tiveres colado o Client ID e Client Secret no Supabase, podes apagar o ficheiro.

---

## 2. Domínio na Hostinger

Domínio: **kingdomfight.com**

### 2.1 Google Cloud Console (GCP)

1. **APIs & Services** → **Credentials** → clica no teu **OAuth 2.0 Client ID** (Web application).
2. Em **Authorized JavaScript origins**, clica **+ Add URI** e adiciona:
   - `https://kingdomfight.com`  
   (se a app correr num subdomínio, ex.: app.kingdomfight.com, adiciona também `https://app.kingdomfight.com`)
3. **Authorized redirect URIs**: aqui fica só o **Callback URL do Supabase** (ex.: `https://xxxxx.supabase.co/auth/v1/callback`). Esse URL já serve para desenvolvimento e produção.
4. Guarda (**Save**).

### 2.2 Supabase

1. **Authentication** → **URL Configuration**.
2. **Site URL**: `https://kingdomfight.com` (ou `https://app.kingdomfight.com` se a app estiver num subdomínio).
3. Em **Redirect URLs**, adiciona:
   - `https://kingdomfight.com/auth/callback`  
   (e, se usares subdomínio: `https://app.kingdomfight.com/auth/callback`)
4. Guarda.

### 2.3 Hostinger (deploy da app)

- A app Next.js tem de estar a correr nesse domínio (ex.: Vercel/Netlify/Railway apontando para o domínio, ou servidor na Hostinger com Node/Next).
- Na Hostinger, no domínio ou subdomínio que quiseres usar, aponta para o deploy (ex.: CNAME para o Vercel, ou configuração do servidor onde a app está).
- Garante que o site está em **HTTPS** (a Hostinger costuma dar SSL; ativa se ainda não estiver).

---

## Resumo

| Onde        | O que fazer |
|------------|-------------|
| **Projeto** | Apagar o ficheiro `client_secret_xxx.json` da raiz (ou guardar fora do projeto). Usar só os valores no Supabase. |
| **GCP**     | Authorized JavaScript origins → adicionar `https://kingdomfight.com` (e `https://app.kingdomfight.com` se usares subdomínio). |
| **Supabase** | Site URL = `https://kingdomfight.com`; Redirect URLs incluir `https://kingdomfight.com/auth/callback`. |
| **Hostinger** | Domínio/subdomínio a apontar para onde a app está em produção; HTTPS ativo. |

Depois disto, “Entrar com Google” passa a funcionar também no teu domínio.
