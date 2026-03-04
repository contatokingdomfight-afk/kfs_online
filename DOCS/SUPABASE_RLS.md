# RLS (Row Level Security) no Supabase

## Problema

O Security Advisor do Supabase reporta **RLS Disabled in Public**: tabelas no schema `public` expostas ao PostgREST devem ter Row Level Security ativado.

## Solução aplicada

A migração **`supabase/migrations/20260223000000_enable_rls_public_tables.sql`**:

1. **Ativa RLS** em todas as tabelas `public` referenciadas pelo linter.
2. **Políticas mínimas para sync/auth:**
   - **User:** utilizador autenticado pode SELECT, INSERT e UPDATE apenas na sua linha (`authUserId = auth.uid()`).
   - **Student:** pode SELECT e INSERT onde `userId` pertence ao próprio utilizador.
   - **School:** SELECT para utilizadores autenticados (para escolher escola padrão no sync).
3. **Demais tabelas:** políticas separadas para evitar o warning **RLS Policy Always True** (lint 0024):
   - **SELECT:** `allow_authenticated_select` com `USING (true)` (leitura para autenticados).
   - **INSERT / UPDATE / DELETE:** `allow_authenticated_insert/update/delete` com condição `auth.uid() IS NOT NULL` (qualquer utilizador autenticado pode escrever; o controlo por papel ADMIN/COACH/ALUNO continua na aplicação). O cliente **service_role** (admin) ignora RLS.

## Warning: Leaked Password Protection

O Security Advisor pode avisar que a **proteção contra palavras-passe comprometidas** está desativada. Para ativar: **Supabase Dashboard** → **Authentication** → **Settings** (ou **Providers** / **Password**) → ativar **Leaked password protection** (consulta HaveIBeenPwned). [Documentação](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Como aplicar

1. **Supabase Dashboard:** Abre o projeto > **SQL Editor** > New query, cola o conteúdo de `supabase/migrations/20260223000000_enable_rls_public_tables.sql` e executa.
2. **Supabase CLI:** Com o CLI configurado, `supabase db push` ou `supabase migration up` (conforme o teu fluxo de migrações).

## Se os nomes das colunas forem snake_case

Se a tua base tiver colunas em snake_case (ex.: `auth_user_id` em vez de `authUserId`), ajusta as políticas na migração:

- `"authUserId"` → `auth_user_id`
- `"userId"` → `user_id`

e, na política de Student, a subquery: `SELECT id FROM "User" WHERE auth_user_id = auth.uid()`.

## Referência

- [Supabase – Database Linter (0013 rls_disabled_in_public)](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public)
- [Permissive RLS policy (0024)](https://supabase.com/docs/guides/database/database-linter?lint=0024_permissive_rls_policy)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
