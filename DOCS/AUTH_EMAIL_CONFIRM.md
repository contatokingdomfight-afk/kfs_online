# Confirmação de email por `token_hash` (fix do erro no iPhone) — 25 set. 2026

## O problema

Um aluno criou conta num iPhone, recebeu o email de confirmação, clicou no link e caiu num
erro ("Falha ao iniciar sessão. Tenta novamente.") em vez de entrar na plataforma.

**Causa:** o fluxo de confirmação usava PKCE (`exchangeCodeForSession`, em `/auth/callback`),
que exige um "code-verifier" secreto guardado em cookie **no mesmo browser/app que pediu a
conta**. No iPhone isso falha facilmente:
- a app Mail costuma abrir o link numa vista separada da PWA instalada (se o aluno instalou a
  app no ecrã principal) ou do Safari normal — que não tem acesso aos cookies de onde a conta
  foi criada;
- alguns scanners de segurança de email "pré-visitam" o link antes do utilizador clicar, o que
  também pode consumir o código.

PKCE continua correto para o login com Google (troca de código sempre no mesmo separador,
sem trocar de app pelo meio) — o problema é específico de links que chegam por email.

## O que mudou no código

- **`app/auth/confirm/route.ts`** (novo): confirma a conta com `supabase.auth.verifyOtp({ type, token_hash })`
  em vez de trocar um `code`. Não depende de nada guardado no dispositivo — o `token_hash` sozinho
  chega para validar, seja qual for o browser/app que abrir o link.
- `app/sign-up/[[...sign-up]]/SignUpForm.tsx`: `emailRedirectTo` deixa de apontar para
  `/auth/callback` e passa a ser o destino final directamente (ex.: `/onboarding`) — o template de
  email é que constrói o link para `/auth/confirm`.
- `app/auth/forgot-password/actions.ts`: mesma lógica para o reset de password (mesmo padrão
  frágil, mesmo fix).
- `middleware.ts`: `/auth/confirm` adicionado às rotas públicas, com a mesma excepção de não
  tentar refrescar sessão no meio do request (a mesma razão documentada para `/auth/callback` —
  já tinha havido problemas intermitentes de "1.ª tentativa falha, 2.ª funciona" em PWA/mobile).
- `app/sign-in/[[...sign-in]]/SignInForm.tsx`: mensagens de erro mais claras para os novos casos
  (`verify_failed`, `missing_token`) — se o link já foi usado/expirou, diz para tentar login
  directamente (a conta pode já estar confirmada mesmo assim).

## ⚠️ Falta um passo manual na Supabase — sem isto, o fix não tem efeito

Os templates de email da Supabase, por omissão, usam `{{ .ConfirmationURL }}`, que aponta para o
link *deles* (`.../auth/v1/verify?...`) e no fim gera um `code` PKCE — exactamente o que queremos
deixar de usar. É preciso trocar os templates para apontar directamente para `/auth/confirm` com
`{{ .TokenHash }}`.

**Supabase → Authentication → Email Templates:**

### 1. "Confirm signup"

Trocar o `href` do botão/link de `{{ .ConfirmationURL }}` para:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next={{ .RedirectTo }}
```

### 2. "Reset Password"

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next={{ .RedirectTo }}
```

(Os outros templates — Magic Link, Invite, Change Email — podem ficar como estão por agora;
não são usados nesta app. Se um dia passarem a ser usados, o mesmo padrão aplica-se trocando
só o `type` — ver `EmailOtpType` em `@supabase/auth-js`: `signup | invite | magiclink | recovery | email_change | email`.)

## Como confirmar que ficou bem aplicado

1. Depois de gravar os templates, criar uma conta de teste (email real, não descartável — a
   Supabase às vezes rejeita domínios temporários) e confirmar no telemóvel (idealmente um
   iPhone, já que foi onde o problema apareceu) **e** no computador.
2. O link deve abrir directamente `/dashboard` ou `/onboarding` sem passar por `/sign-in` com erro.
3. Repetir para "Esqueci-me da password".
4. Se aparecer `?error=verify_failed` na barra de endereços do `/sign-in`, o template ainda não
   foi trocado (ou foi trocado mas ainda não propagou — a Supabase costuma aplicar de imediato).
