# Contas de teste (local / staging)

## Criar ou atualizar utilizadores

1. No `.env` ou `.env.local`, define (o script carrega `.env` e depois `.env.local` por cima):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TEST_SEED_PASSWORD` (mínimo 8 caracteres; **não** commits esta password)

2. Garante que existe **pelo menos uma escola ativa** (`School.isActive = true`).

3. Na raiz do repositório:

```bash
npm run seed:test-users
```

O script é **idempotente**: se o email já existir no Auth, atualiza a password e alinha a tabela `User` (e `Student` / `Coach` conforme o perfil).

## Emails fixos

| Perfil | Email |
|--------|--------|
| Admin | `kfs.test.admin@local.test` |
| Coach | `kfs.test.coach@local.test` |
| Aluno (sem plano, para testar aula livre / free tier) | `kfs.test.aluno@local.test` |

A password é sempre a de `TEST_SEED_PASSWORD`.

Login: `/sign-in`.

## Testes automáticos (lógica)

```bash
npm test
```

Cobre o filtro de aulas no dashboard (`lib/dashboard-lesson-filter.ts`), incluindo aulas livres para quem não tem plano.
