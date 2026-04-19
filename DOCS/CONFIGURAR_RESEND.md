# Configurar Resend (emails – app + Auth Supabase)

O Resend envia pela app (**confirmação de presença** e **lembretes de aulas de amanhã**, com layout HTML de marca em `lib/notifications/email.ts`) e, via **SMTP no Supabase**, os emails de **Auth** (convite, recuperar palavra-passe, magic link, etc.). Plano gratuito: ~3000 emails/mês.

Secções úteis mais abaixo: **§6** fluxo «esqueci-me da senha»; **§6.5** armadilhas Resend; **§7** entrega (spam, DMARC); **§8** onde personalizar a aparência (Supabase templates vs código da app).

---

## 1. Criar conta no Resend

1. Vai a [resend.com](https://resend.com) e clica em **Sign up**.
2. Regista-te com email ou Google/GitHub.
3. Confirma o email se for pedido.

---

## 2. Obter a API Key

1. No dashboard: [resend.com/api-keys](https://resend.com/api-keys).
2. Clica em **Create API Key**.
3. Dá um nome (ex.: `KFS Production` ou `KFS Dev`).
4. Escolhe permissão **Sending access** (envio).
5. Clica em **Add** e **copia a chave** (começa por `re_`). Só é mostrada uma vez.

Guarda a chave num sítio seguro. Vais usá-la no `.env` e no Supabase.

---

## 3. Domínio de envio (remetente)

Tens duas opções:

### Opção A: Testar primeiro (sem domínio próprio)

O Resend permite enviar **só para o teu próprio email** usando o domínio deles:

- **From:** `Kingdom Fight School <onboarding@resend.dev>`

Isto já está como fallback no código. Basta definires `RESEND_API_KEY` no `.env` (podes omitir `RESEND_FROM_EMAIL`). Para **produção** ou para enviar a qualquer pessoa, precisas do Opção B.

### Opção B: Usar o teu domínio (ex.: kingdomfight.com)

1. No Resend: [resend.com/domains](https://resend.com/domains).
2. Clica em **Add Domain**.
3. Introduz o domínio (ex.: `kingdomfight.com`).
4. O Resend mostra registos DNS (SPF, DKIM, etc.). Adiciona-os no teu fornecedor de domínio (onde compraste o domínio ou onde está o DNS).
5. Quando o domínio estiver **Verified**, podes enviar com qualquer endereço `@kingdomfight.com`, por exemplo:
   - `noreply@kingdomfight.com`
   - `Kingdom Fight School <noreply@kingdomfight.com>`

---

## 4. Variáveis de ambiente na app

No teu ficheiro `.env` (na raiz do projeto, nunca commitar):

```env
# Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=Kingdom Fight School <noreply@teudominio.com>
```

- Se ainda não tiveres domínio verificado, podes usar só `RESEND_API_KEY`; a app usa `onboarding@resend.dev` (envio apenas para o teu email em teste).
- Se tiveres domínio: usa em `RESEND_FROM_EMAIL` um email desse domínio (ex.: `noreply@kingdomfight.com`).

Se fizeres deploy na Vercel, adiciona as mesmas variáveis em **Project → Settings → Environment Variables**.

---

## 5. Usar o Resend no Supabase (emails de convite)

Para os convites de aluno saírem com remetente **Kingdom Fight School** em vez de **Supabase Auth**:

1. Abre o [Dashboard Supabase](https://supabase.com/dashboard) → teu projeto.
2. **Project Settings** (engrenagem) → **Auth** → **SMTP Settings**.
3. Ativa **Enable Custom SMTP** e preenche:

| Campo          | Valor |
|----------------|--------|
| **Sender name**  | `Kingdom Fight School` |
| **Sender email** | O mesmo que em `RESEND_FROM_EMAIL`, ex. `noreply@kingdomfight.com`. Se estiveres em teste sem domínio, usa `onboarding@resend.dev` (só recebes em ti). |
| **Host**         | `smtp.resend.com` |
| **Port**         | `465` |
| **Username**     | `resend` |
| **Password**     | A tua **API Key** do Resend (a mesma que está em `RESEND_API_KEY`) |

4. Guarda. Os próximos convites (e outros emails de Auth) passam a ser enviados pelo Resend.

Referência: [Resend – Send with Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp).

---

## Resumo rápido

| Passo | Onde | O quê |
|-------|------|--------|
| 1 | resend.com | Criar conta |
| 2 | resend.com/api-keys | Criar API Key e copiar |
| 3 | resend.com/domains | (Opcional) Adicionar e verificar domínio |
| 4 | `.env` do projeto (e Vercel) | `RESEND_API_KEY` e `RESEND_FROM_EMAIL` |
| 5 | Supabase → Auth → SMTP Settings | Custom SMTP com host `smtp.resend.com`, user `resend`, password = API key |

Depois de configurar, envia um convite (Admin → Convidar aluno) para testar o email de convite.

---

## 6. «Esqueci a senha» não envia email ou dá erro

O fluxo usa `resetPasswordForEmail` na app; o **email** é enviado pelo **Supabase Auth** com o SMTP que configuraste (ex.: Resend). A variável `RESEND_FROM_EMAIL` na Vercel **não** basta sozinha: o SMTP no Supabase tem de estar correto e a **URL de redirect** tem de estar na lista permitida.

### 6.1 SMTP no Supabase

1. **Authentication → Providers → Email**: confirma que **Email** está ativo.
2. **Project Settings → Auth → SMTP Settings**: **Enable Custom SMTP** guardado sem erros; faz **Send test email** se existir, ou testa de novo o reset.
3. No **Resend**: domínio do **Sender email** do Supabase está **Verified**; a API key usada na password do SMTP não expirou.

### 6.2 Redirect URLs (causa muito comum de falha)

O Supabase exige que o `redirectTo` que a app envia exista na allowlist.

1. Vai a **Authentication → URL Configuration**.
2. **Site URL**: URL pública principal (ex.: `https://teudominio.com`).
3. **Redirect URLs**: adiciona **todas** as variantes que os utilizadores usam, por exemplo:
   - `https://teudominio.com/auth/callback**`
   - `https://www.teudominio.com/auth/callback**` (se usares `www`)
   - `https://*.vercel.app/auth/callback**` (previews / deploy Vercel)
4. O sufixo `**` no Supabase permite query strings (`?next=...`).

Se o erro na página for do tipo *redirect url not allowed* ou *invalid*, o `redirectTo` exacto aparece nos **logs da Vercel** (server action) e tem de ser coberto por uma destas linhas.

### 6.3 URL base na Vercel

Define **`NEXT_PUBLIC_APP_URL`** = `https://teudominio.com` (sem barra final) em **Production**, como rede de segurança quando os headers não trazem o host certo.

### 6.4 Outros

- **Spam / promoções**: verifica a pasta de spam.
- **Email não existe em `auth.users`**: por desenho o Supabase pode responder como sucesso sem enviar mail (anti-enumeração). Testa com uma conta que exista no projeto certo.
- **Projeto errado**: `NEXT_PUBLIC_SUPABASE_URL` / anon key na Vercel têm de ser do **mesmo** projeto onde está o utilizador e o SMTP.

### 6.5 Resend — detalhes que muita gente falha

1. **`onboarding@resend.dev` (sem domínio próprio)**  
   O Resend **só entrega** mailings desse remetente para endereços **autorizados** (conta Resend + eventualmente “Audience” / testes). **Não** serve para enviar recuperação de senha a **qualquer** email de aluno. Para produção: **domínio verificado** em [resend.com/domains](https://resend.com/domains) e **Sender email** no Supabase = um endereço `@teudominio.com` desse domínio.

2. **Domínio “Verified” mas remetente errado**  
   O **Sender email** no Supabase tem de ser exatamente um endereço **permitido** nesse domínio (ex. `noreply@…`). Sem subdomínio wildcard automático: se só verificaste `kingdomfight.com`, `mail.kingdomfight.com` é outro caso.

3. **Porta / encriptação**  
   Documentação Resend: porta **465** com SSL. Se o datacenter ou rede bloquear 465, experimenta na UI do Supabase (se existir opção) **587 + STARTTLS**, conforme [Resend SMTP](https://resend.com/docs/send-with-supabase-smtp). Valores incorretos → falha na ligação SMTP (vê logs no Supabase, não aparece envio “bonito” no Resend).

4. **Password do SMTP = API Key**  
   Tem de ser a key **completa** (`re_…`), sem espaços antes/depois, mesma key com permissão de **envio**. Se regeneraste a key no Resend e só atualizaste o `.env` da Vercel mas **não** o campo Password do SMTP no Supabase, o Auth continua a falhar.

5. **Onde ver o erro real**  
   - **Supabase:** *Logs* → filtrar por **Auth** / *Auth logs* (ou *Edge* se aplicável) no momento em que clicas em “Esqueci a senha”.  
   - **Resend:** *Emails* / *Logs* — se **não** aparecer nenhuma tentativa, o problema é **antes** (SMTP Supabase → Resend: credenciais, porta, firewall). Se aparecer como *bounced* / *failed*, abre o evento e lê o motivo.

6. **Plano / limites**  
   Raro no arranque, mas conta suspensa ou limite esgotado pode bloquear envios; o Resend costuma mostrar no dashboard.

Referência oficial: [Send emails using Supabase with SMTP](https://resend.com/docs/send-with-supabase-smtp) e credenciais SMTP em [resend.com/settings/smtp](https://resend.com/settings/smtp).

---

## 7. Evitar spam (entregar na caixa de entrada)

Não existe botão “nunca ir para spam”, mas estes passos **aumentam** a probabilidade de ir para a caixa principal:

### 7.1 DNS e domínio (o mais importante)

1. No Resend, em **Domains**, confirma que o domínio está **Verified** e que **todos** os registos pedidos estão **OK** (SPF, DKIM — o Resend mostra o estado).
2. **DMARC** (recomendado): adiciona um registo TXT em `_dmarc.teudominio.com` (o Resend ou o teu DNS podem sugerir; podes começar com política permissiva e relatórios):
   - Exemplo inicial: `v=DMARC1; p=none; rua=mailto:postmaster@teudominio.com`  
   Depois de validares que o envio está alinhado, podes endurecer (`p=quarantine` / `p=reject`) com cuidado para não bloquear mail legítimo de outros sistemas no mesmo domínio.
3. O **From** (app + Supabase SMTP) deve ser um endereço **desse domínio verificado** — evita misturar domínio A no painel e domínio B no email.

### 7.2 Reputação e conteúdo

- Domínio **novo**: nos primeiros dias o Gmail/Outlook podem ser mais desconfiados; volume baixo e consistente ajuda.
- Evita assuntos genéricos em excesso de maiúsculas ou muitos `!!!`; para reset de senha o template do Supabase costuma ser aceitável.
- Links no email devem apontar para **o teu domínio** (o que já fazes com redirect correto), não para URLs encurtadas suspeitas.

### 7.3 Utilizadores

- Pedir **“Não é spam” / Mover para principal”** e, em Gmail, **adicionar remetente aos contactos** melhora o sinal para esse utilizador.
- Em contexto escola: um email curto na primeira semana (“Os nossos emails vêm de noreply@…”) reduz marcações erradas.

### 7.4 Ferramentas (opcional)

- [Google Postmaster Tools](https://postmaster.google.com/) — se muitos alunos usam Gmail, dá visão de reputação do domínio/IP de envio (via Resend).

---

## 8. Aparência dos emails (mais “bonitos”)

Há **dois sítios** — não confundir:

### 8.1 Supabase Auth (convite, recuperar senha, magic link, confirmação)

Editas **só no Dashboard**: **Authentication → Email Templates**. Cada tipo de email tem o seu template (Invite, Reset password, **Confirm signup**, etc.). Podes usar **HTML** com estilos **inline** — exemplos em [SUPABASE_EMAIL_CONVITE.md](SUPABASE_EMAIL_CONVITE.md) (convite na secção 1; **registo público** na secção **1b** com HTML de marca) e as variáveis oficiais por template (ex. `{{ .ConfirmationURL }}`).

- Mantém **um botão** com link claro + **link em texto** por baixo (clientes que não mostram HTML).
- Cores da marca: podes usar o vermelho `#c1121f` nos botões/bordas para alinhar com a app.

### 8.2 Emails enviados pela app (Resend no código)

**Confirmação de presença** e **lembretes de aulas** são montados em `lib/notifications/email.ts`: layout com cabeçalho da marca, cartão branco e rodapé. Para mudar o visual, edita essa função `wrapTransactionalEmail` e o HTML interior de cada `send…`.

---

*Referência cruzada: [INDEX.md](INDEX.md), [memory.md](memory.md) — abril 2026.*
