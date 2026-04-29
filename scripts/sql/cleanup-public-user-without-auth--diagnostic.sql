-- Diagnóstico: contas public."User" sem correspondência em auth.users.
SELECT
  (SELECT count(*)::int
   FROM public."User" u
   WHERE u."authUserId" IS NULL
      OR NOT EXISTS (
        SELECT 1
        FROM auth.users au
        WHERE au.id::text = btrim(u."authUserId")
      )) AS orphan_user_count;

SELECT u.id, u."authUserId", u.email, u.role, u."createdAt"
FROM public."User" u
WHERE u."authUserId" IS NULL
   OR NOT EXISTS (
     SELECT 1
     FROM auth.users au
     WHERE au.id::text = btrim(u."authUserId")
   )
ORDER BY u."createdAt";
