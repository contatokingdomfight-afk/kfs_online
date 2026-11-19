# Backlog — Contas de spam no registo

Contexto (2026-11-04): bots criam contas com nomes aleatórios (ex.: «cMwoPrHwfRwfpoMParTXMTa») e e-mails de empresas.

## Feito
- Filtro de nome no registo (`lib/auth/suspicious-name.ts`, usado em `SignUpForm.tsx`).
- Contas sem plano com nome suspeito ocultas na lista `/admin/alunos`.

## Pendente (reverificado no código em 2026-11-10)
- 🟡 **Captcha no registo**: código feito em 2026-11-19 (`components/TurnstileWidget.tsx`, ligado a registo, login, recuperação, reenvio e mudança de palavra-passe), **inativo até** haver `NEXT_PUBLIC_TURNSTILE_SITE_KEY` na Vercel e o captcha ligado no Supabase (Auth → Attack Protection → Turnstile, com o segredo). Ligar o Supabase SÓ depois do deploy com a chave. (antes: nada no código) (Cloudflare Turnstile, grátis; Supabase Auth tem suporte nativo). Defesa mais eficaz.
- ✅ **Confirmação de e-mail obrigatória** no Supabase: confirmado ligado em 2026-11-18 (Auth → Sign In / Providers → «Confirm email»).
- O filtro de nome corre só no browser: um bot que chame a API do Supabase diretamente contorna-o. O captcha resolve isto.
- Opcional: apagar de vez (auth + User + Student) contas vazias antigas — hoje só ficam ocultas.
