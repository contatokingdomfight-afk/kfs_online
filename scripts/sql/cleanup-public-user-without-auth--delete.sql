-- Apaga public."User" cujo authUserId não existe em auth.users.
-- Correr antes: scripts/sql/cleanup-public-user-without-auth--diagnostic.sql
-- Requisito: ligação com acesso a auth.users. Backup ou staging recomendado.
BEGIN;

DELETE FROM public."User" u
WHERE u."authUserId" IS NULL
   OR NOT EXISTS (
     SELECT 1
     FROM auth.users au
     WHERE au.id::text = btrim(u."authUserId")
   );

COMMIT;
