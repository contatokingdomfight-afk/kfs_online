# Email de convite (Supabase Auth)

O convite de aluno é enviado pelo **Supabase Auth**. O texto do email e o **remetente** configuram-se no **Dashboard do Supabase**, não no código da aplicação.

---

## Fazer de graça (sem servidor SMTP teu)

- **Só melhorar o texto do email** (assunto e corpo em português) → **100% grátis**. Editas apenas o template no Supabase (secção 1 abaixo). O remetente continua a ser o do Supabase (`noreply@mail.app.supabase.io`), mas o conteúdo fica profissional em português.
- **Mudar também o remetente** → Não precisas de instalar nem configurar nenhum servidor. Usas um serviço com **plano gratuito** (ex.: Resend) e preenches os dados SMTP dele no Supabase. O Resend tem [plano gratuito](https://resend.com/pricing) (ex.: 3000 emails/mês); crias conta, obténs a API key e colas em **Auth → SMTP Settings**. Nada corre no teu servidor.

---

## 1. Melhorar o texto do email (template “Invite user”)

1. Abre o [Dashboard Supabase](https://supabase.com/dashboard) → o teu projeto.
2. Menu lateral: **Authentication** → **Email Templates**.
3. Escolhe o template **“Invite user”**.

### Assunto (Subject)

Substitui por:

```
Convite para a plataforma Kingdom Fight School
```

### Corpo (Body) – HTML

Substitui o conteúdo por algo como:

```html
<h2>Bem-vindo à Kingdom Fight School</h2>
<p>Foste convidado(a) para criar uma conta na plataforma da escola.</p>
<p>Clica no botão abaixo para definir a tua palavra-passe e aceder:</p>
<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Aceitar convite e criar conta</a></p>
<p style="color: #6b7280; font-size: 14px;">Se o botão não funcionar, copia e cola este link no browser:<br>{{ .ConfirmationURL }}</p>
<p>Até já no tatami,<br>Equipa Kingdom Fight School</p>
```

Guarda as alterações.

---

## 1b. «Confirm signup» (criação de conta em `/sign-up`)

O email em inglês *Confirm your signup* / *Confirm your mail* é o template **Confirm signup** (às vezes **Confirm your email** no painel). **Não está no repositório:** o HTML e o assunto editam-se no mesmo sítio que o convite.

1. Supabase Dashboard → **Authentication** → **Email Templates**.
2. Escolhe **Confirm signup** (ou equivalente).
3. **Subject:** por exemplo `Confirma o teu registo — Kingdom Fight School`.
4. **Body (HTML):** usa estilos **inline** (muitos clientes ignoram `<style>` no `<head>`). Variável do link: `{{ .ConfirmationURL }}` (igual ao convite).

Exemplo alinhado à cor da app (`#c1121f`):

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 12px;font-family:system-ui,-apple-system,sans-serif;">
  <tr><td align="center">
    <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <tr><td style="height:4px;background:#c1121f;"></td></tr>
      <tr><td style="padding:28px 24px;">
        <h1 style="margin:0 0 12px;font-size:20px;color:#111827;">Confirma o teu email</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#374151;">Obrigado por te registares na Kingdom Fight School. Clica no botão abaixo para ativares a tua conta.</p>
        <p style="margin:0 0 20px;">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 22px;background:#c1121f;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Confirmar email</a>
        </p>
        <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">Se o botão não funcionar, copia e cola este link no browser:<br><span style="word-break:break-all;">{{ .ConfirmationURL }}</span></p>
      </td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">Kingdom Fight School</p>
  </td></tr>
</table>
```

Para **inglês**, troca apenas os textos visíveis; mantém `{{ .ConfirmationURL }}`. Documentação oficial das variáveis por template: [Supabase — Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates).

**Nota:** emails da **app** (presença, lembretes de aulas) usam HTML em `lib/notifications/email.ts` (`wrapTransactionalEmail`); isso **não** aplica ao signup — continua a ser este template no Dashboard.

---

## 2. Remetente: configurar SMTP (deixar de usar noreply@mail.app.supabase.io)

Por predefinição o Supabase envia com **Supabase Auth &lt;noreply@mail.app.supabase.io&gt;**. Para usares o teu domínio (ex.: **Kingdom Fight School &lt;noreply@kingdomfight.com&gt;**), configura **Custom SMTP** no projeto.

### Opção A: Resend (grátis no plano free – sem servidor)

O [Resend](https://resend.com) tem plano gratuito (ex.: 3000 emails/mês). Não precisas de servidor: crias conta, obténs a API key e preenches o formulário SMTP no Supabase. **Guia passo a passo:** [CONFIGURAR_RESEND.md](CONFIGURAR_RESEND.md).

1. **Resend:** [Domains](https://resend.com/domains) – confirma que o domínio de envio (ex. `kingdomfight.com`) está verificado.
2. **Supabase:** Dashboard → **Project Settings** (ícone engrenagem) → **Auth** → secção **SMTP Settings**.
3. Ativa **Enable Custom SMTP** e preenche:
   - **Sender email:** o mesmo que usas em `RESEND_FROM_EMAIL`, ex. `noreply@kingdomfight.com`
   - **Sender name:** `Kingdom Fight School`
   - **Host:** `smtp.resend.com`
   - **Port:** `465` (SSL) ou `587` (TLS)
   - **Username:** `resend`
   - **Password:** a tua **Resend API Key** (a mesma que está em `RESEND_API_KEY`)

4. Guarda. Os próximos convites (e outros emails de Auth) passam a sair com **Kingdom Fight School &lt;noreply@kingdomfight.com&gt;** (ou o email que definiste).

Documentação Resend + Supabase: [Send emails using Supabase with SMTP](https://resend.com/docs/send-with-supabase-smtp).

### Opção B: Outro fornecedor SMTP

Supabase aceita qualquer SMTP (Brevo, SendGrid, Postmark, AWS SES, etc.). Em **Auth → SMTP Settings** preenche host, porto, utilizador e palavra-passe do teu fornecedor e o email/nome do remetente.

---

## Resumo

| O que queres mudar | Onde |
|--------------------|------|
| Texto do email (assunto e corpo) | Supabase → **Authentication** → **Email Templates** — **Invite user**, **Confirm signup**, **Reset password**, **Magic link**, etc. |
| Remetente (nome e email) | Supabase → **Project Settings** → **Auth** → **SMTP Settings** (Custom SMTP) |

Depois de guardar, testa: **convite** (Admin → Alunos → Convidar aluno) ou **registo** (página `/sign-up` com confirmação de email ativa).

**Outros templates Auth** (ex. **recuperar palavra-passe**): mesmo sítio — **Email Templates**; o link usa normalmente `{{ .ConfirmationURL }}`. Checklist de redirects e SMTP: **`DOCS/CONFIGURAR_RESEND.md`** (§6 e seguintes). **Emails só da app** (presença confirmada, lembretes de aulas): código em `lib/notifications/email.ts`, não neste painel.

---

*Referência cruzada: [INDEX.md](INDEX.md), [memory.md](memory.md), [CONFIGURAR_RESEND.md](CONFIGURAR_RESEND.md) — abril 2026.*
