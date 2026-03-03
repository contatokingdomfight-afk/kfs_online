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
| Texto do email (assunto e corpo) | Supabase → **Authentication** → **Email Templates** → **Invite user** |
| Remetente (nome e email) | Supabase → **Project Settings** → **Auth** → **SMTP Settings** (Custom SMTP) |

Depois de guardar, envia um novo convite (Admin → Alunos → Convidar aluno) para testar.
