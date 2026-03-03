# Configurar Resend (emails – app + convites Supabase)

O Resend envia os emails da app (confirmação de presença, lembretes) e pode ser usado pelo Supabase para os **emails de convite** (remetente em vez de `noreply@mail.app.supabase.io`). Plano gratuito: 3000 emails/mês.

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
