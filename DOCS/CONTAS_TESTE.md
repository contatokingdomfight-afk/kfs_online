# Contas de teste (local / staging)

Relacionado: **`DOCS/ROADMAP_Plataforma_KFS.md`** (secção 18 – testes e seed), **`DOCS/GUIA_TESTE_VALIDACAO_PERFIS.md`** (validação manual por perfil).

## Criar ou atualizar utilizadores

1. No `.env` ou `.env.local`, define (o script carrega **`.env` primeiro** e depois **`.env.local`** com override):
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
| Aluno demo (plano + Athlete, para visita guiada / investidor) | `kfs.demo.investidor@local.test` |

A password das três primeiras contas é a de `TEST_SEED_PASSWORD`. A conta **demo investidor** usa `INVESTOR_DEMO_PASSWORD` se estiver definida; caso contrário usa também `TEST_SEED_PASSWORD`.

Login: `/sign-in`.

Guarda o ficheiro (Ctrl+S) antes de correr o comando — o terminal só lê o que está **gravado em disco**.

## Testes automáticos (lógica)

```bash
npm test
```

Cobre o filtro de aulas no dashboard (`lib/dashboard-lesson-filter.ts`), incluindo aulas livres para quem não tem plano.

---

*Referência cruzada: [INDEX.md](INDEX.md), [memory.md](memory.md) — março 2026.*
