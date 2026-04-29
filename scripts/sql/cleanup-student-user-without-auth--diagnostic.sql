-- Alunos (User + Student) cujo authUserId não está em auth.users
SELECT
  (SELECT count(*)::int
   FROM public."User" u
   INNER JOIN public."Student" s ON s."userId" = u.id
   WHERE u."authUserId" IS NULL
      OR NOT EXISTS (
        SELECT 1
        FROM auth.users au
        WHERE au.id::text = btrim(u."authUserId")
      )) AS orphan_student_count;

SELECT u.id, u."authUserId", u.email, s.id AS "studentId", u."createdAt"
FROM public."User" u
INNER JOIN public."Student" s ON s."userId" = u.id
WHERE u."authUserId" IS NULL
   OR NOT EXISTS (
     SELECT 1
     FROM auth.users au
     WHERE au.id::text = btrim(u."authUserId")
   )
ORDER BY u."createdAt";
