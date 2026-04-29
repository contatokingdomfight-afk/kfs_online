-- Apaga public."User" que têm registo de aluno (public."Student") e cujo
-- authUserId não existe em auth.users. Não remove coaches/admins sem auth.
-- Correr diagnóstico: join User + Student com o mesmo filtro (SELECT).
BEGIN;

DELETE FROM public."User" u
WHERE EXISTS (SELECT 1 FROM public."Student" s WHERE s."userId" = u.id)
  AND (
    u."authUserId" IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM auth.users au
      WHERE au.id::text = btrim(u."authUserId")
    )
  );

COMMIT;
