-- Correr ANTES de scripts/sql/delete-test-accounts-20260729.sql para confirmar
-- exatamente quem vai ser apagado. Não apaga nada, é só um SELECT.

WITH test_users AS (
  SELECT id, "authUserId", email, role, name
  FROM public."User"
  WHERE email IN (
    'demo@teste.com',
    'kfs.test.aluno@local.test',
    'kfs.test.experimental@local.test',
    'kfs.test.coach@local.test',
    'kfs.test.admin@local.test'
  )
  OR email LIKE '%@local.test'
),
test_students AS (
  SELECT s.id, s."userId", s."schoolId", s.status, s."planId"
  FROM public."Student" s
  WHERE s."userId" IN (SELECT id FROM test_users)
)
SELECT 'User' AS tabela, email AS detalhe, role::text AS extra FROM test_users
UNION ALL
SELECT 'Student (via User acima)', ts."userId", ts.status::text FROM test_students ts
UNION ALL
SELECT 'Payment', 'count', COUNT(*)::text FROM public."Payment" WHERE "studentId" IN (SELECT id FROM test_students)
UNION ALL
SELECT 'Attendance', 'count', COUNT(*)::text FROM public."Attendance" WHERE "studentId" IN (SELECT id FROM test_students)
UNION ALL
SELECT 'Coach (linked to test user)', 'count', COUNT(*)::text FROM public."Coach" WHERE "userId" IN (SELECT id FROM test_users)
UNION ALL
SELECT 'Lesson taught by test coach (seria apagada em cascata!)', 'count', COUNT(*)::text
  FROM public."Lesson" WHERE "coachId" IN (SELECT id FROM public."Coach" WHERE "userId" IN (SELECT id FROM test_users))
UNION ALL
SELECT 'FamilyGroup billed by test student (bloquearia o DELETE se > 0)', 'count', COUNT(*)::text
  FROM public."FamilyGroup" WHERE "billingStudentId" IN (SELECT id FROM test_students)
UNION ALL
SELECT 'CourseCompletion (sem FK, apagado manualmente)', 'count', COUNT(*)::text
  FROM public."CourseCompletion" WHERE student_id IN (SELECT id FROM test_students)
UNION ALL
SELECT 'StudentGrade (cascata)', 'count', COUNT(*)::text FROM public."StudentGrade" WHERE "studentId" IN (SELECT id FROM test_students)
UNION ALL
SELECT 'GraduationExamCandidate (cascata)', 'count', COUNT(*)::text FROM public."GraduationExamCandidate" WHERE "studentId" IN (SELECT id FROM test_students);
