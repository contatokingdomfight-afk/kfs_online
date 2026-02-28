# Login com Google (Supabase) – Passo a passo completo

O login com Google está implementado nas páginas **Entrar** e **Criar conta**. Este guia explica como configurar tudo **desde zero** no Google Cloud Platform (GCP) e no Supabase.

---

## Parte 1: Google Cloud Platform (GCP)

### 1.1 Entrar e criar projeto

1. Abre o **[Google Cloud Console](https://console.cloud.google.com/)** e inicia sessão com a conta Google que queres usar (ex.: email da escola).
2. No topo da página, clica no **seletor de projeto** (onde diz “Select a project” ou o nome do projeto atual).
3. Clica em **“New Project”** (Novo projeto).
4. Preenche:
   - **Project name**: por exemplo `Kingdom Fight School` ou `KFS Login`.
   - **Organization**: pode ficar “No organization” se for conta pessoal.
5. Clica em **“Create”** (Criar) e espera alguns segundos. Quando aparecer “Creating project…”, não feches a página.
6. Quando terminar, o novo projeto fica selecionado. Confirma no topo que estás nesse projeto.

---

### 1.2 Configurar o ecrã de consentimento OAuth

O Google exige que configures o “ecrã de consentimento” antes de criares as credenciais de login.

1. No menu lateral, vai a **“APIs & Services”** → **“OAuth consent screen”** (ou em português: **APIs e serviços** → **Ecrã de consentimento OAuth**).
2. Escolhe o tipo de utilizador:
   - **External** (Externo) – para qualquer pessoa com uma conta Google (alunos, professores, etc.). Recomendado para a KFS.
   - Clica **“Create”** (Criar).
3. **Passo 1 – App information**:
   - **App name**: `Kingdom Fight School` (ou o nome que quiseres).
   - **User support email**: escolhe o teu email (ex.: contato da escola).
   - **App logo**: opcional, podes saltar.
   - **App domain**: opcional; podes deixar em branco por agora.
   - **Developer contact information**: o teu email.
   - Clica **“Save and Continue”**.
4. **Passo 2 – Scopes**:
   - Por defeito já vêm os scopes básicos (email, profile, openid). Clica **“Save and Continue”**.
5. **Passo 3 – Test users** (só aparece se a app estiver em “Testing”):
   - Enquanto a app estiver em modo **Testing**, só as contas que adicionares aqui podem fazer login. Podes adicionar os emails de teste (ex.: o teu e de um aluno).
   - Ou deixa vazio e adiciona depois; podes também publicar a app mais tarde (Passo 4) para permitir qualquer conta Google.
   - Clica **“Save and Continue”**.
6. **Passo 4 – Summary**: revê e clica **“Back to Dashboard”**.

Fica assim configurado o ecrã que o utilizador vê quando clica em “Entrar com Google”.

---

### 1.3 Criar credenciais OAuth (Client ID e Secret)

1. No menu lateral: **“APIs & Services”** → **“Credentials”** (Credenciais).
2. Clica em **“+ Create Credentials”** (Criar credenciais) e escolhe **“OAuth client ID”**.
3. Se aparecer um aviso a dizer que precisas de configurar o ecrã de consentimento, volta ao passo 1.2 e completa até ao fim.
4. Em **“Application type”** (Tipo de aplicação), escolhe **“Web application”**.
5. **Name**: por exemplo `KFS Web Client` ou `Kingdom Fight School – Login`.
6. **Authorized JavaScript origins** (Origens JavaScript autorizadas):
   - Clica **“+ Add URI”** e adiciona:
     - `http://localhost:3000` (desenvolvimento)
   - Se já tiveres domínio em produção, adiciona também:
     - `https://teudominio.com` (substitui pelo teu domínio real)
7. **Authorized redirect URIs** (URIs de redirecionamento autorizados):
   - Aqui entra o URL que o **Supabase** usa para receber a resposta do Google.
   - Abre o **Supabase Dashboard** (ver Parte 2 abaixo) e vai a **Authentication** → **Providers** → **Google**. O Supabase mostra lá o **Callback URL** (algo como `https://xxxxxxxx.supabase.co/auth/v1/callback`).
   - Copia esse URL e, no GCP, em **Authorized redirect URIs**, clica **“+ Add URI”** e cola exatamente esse URL (ex.: `https://iozxildpnugqxzqkxntq.supabase.co/auth/v1/callback`).
8. Clica **“Create”** (Criar).
9. Aparece um popup com:
   - **Client ID** (começa por algo como `xxxxx.apps.googleusercontent.com`)
   - **Client secret**
   - Clica em **“Copy”** para cada um e guarda-os num sítio seguro (vais colá-los no Supabase no passo seguinte). Ou deixa o popup aberto e passa à Parte 2.

---

## Parte 2: Supabase

### 2.1 Ativar o provider Google e colar as chaves

1. Abre o **[Supabase Dashboard](https://supabase.com/dashboard)** e entra no projeto da Kingdom Fight School.
2. No menu lateral: **Authentication** → **Providers**.
3. Encontra **Google** e clica para abrir as opções.
4. Ativa o provider (toggle **Enable Sign in with Google**).
5. Cola o **Client ID** (do passo 1.3 do GCP) no campo **Client ID**.
6. Cola o **Client Secret** no campo **Client Secret**.
7. Clica **“Save”** (Guardar).

O **Callback URL** que o Supabase mostra nesta página é o que deves usar no GCP em **Authorized redirect URIs** (já referido na Parte 1.3).

---

### 2.2 URLs de redirecionamento (Redirect URLs)

Para o Supabase redirecionar o utilizador de volta para a tua app após o login:

1. No Supabase: **Authentication** → **URL Configuration**.
2. **Site URL**:
   - Em desenvolvimento: `http://localhost:3000`
   - (Em produção, mais tarde: `https://teudominio.com`)
3. Em **Redirect URLs**, clica **“Add URL”** e adiciona:
   - `http://localhost:3000/auth/callback`
   - Quando tiveres produção: `https://teudominio.com/auth/callback`
4. Guarda.

---

## Resumo rápido

| Onde | O que fazer |
|------|-------------|
| **GCP** | Criar projeto → OAuth consent screen → Credentials → OAuth client ID (Web application) |
| **GCP** | Authorized redirect URIs = URL do Supabase (Auth → Providers → Google → Callback URL) |
| **Supabase** | Auth → Providers → Google: ativar e colar Client ID + Client Secret |
| **Supabase** | Auth → URL Configuration: Redirect URLs com `.../auth/callback` |

Depois disto, ao clicar em **“Entrar com Google”** em `/sign-in` ou `/sign-up`, o utilizador é enviado para o Google e, após autorizar, volta para a app e fica com sessão iniciada (e o registo em User/Student é criado ou atualizado pelo `syncUser`).

---

## Modo “Testing” vs “In production” (GCP)

- Enquanto o ecrã de consentimento estiver em **Testing**, só as contas que adicionares em **Test users** (OAuth consent screen → Test users) podem fazer login.
- Para qualquer pessoa com conta Google poder entrar, tens de ir a **OAuth consent screen** e clicar em **“Publish App”** (Publicar app). O Google pode pedir uma verificação se pedires permissões sensíveis; para apenas email e perfil básico, muitas vezes não é necessário.
