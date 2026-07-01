-- Normaliza alunos em planos «família» (incl. cópias manuais) e cria grupos em falta.

UPDATE public."Student" s
SET "planId" = 'plan-familia'
FROM public."Plan" p
WHERE p.id = s."planId"
  AND s."planId" <> 'plan-familia'
  AND (p.id = 'plan-familia' OR p.name ILIKE '%famil%');

INSERT INTO public."FamilyGroup" (
  id,
  name,
  "billingStudentId",
  "planId",
  "maxMembers",
  "schoolId",
  "isActive"
)
SELECT
  gen_random_uuid()::text,
  NULL,
  s.id,
  'plan-familia',
  4,
  s."schoolId",
  true
FROM public."Student" s
INNER JOIN public."Plan" p ON p.id = s."planId"
WHERE (p.id = 'plan-familia' OR p.name ILIKE '%famil%')
  AND s."schoolId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public."FamilyGroupMember" m WHERE m."studentId" = s.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public."FamilyGroup" g WHERE g."billingStudentId" = s.id AND g."isActive" = true
  );

INSERT INTO public."FamilyGroupMember" (
  id,
  "familyGroupId",
  "studentId",
  role
)
SELECT
  gen_random_uuid()::text,
  g.id,
  g."billingStudentId",
  'TITULAR'
FROM public."FamilyGroup" g
WHERE g."planId" = 'plan-familia'
  AND g."isActive" = true
  AND NOT EXISTS (
    SELECT 1 FROM public."FamilyGroupMember" m
    WHERE m."familyGroupId" = g.id AND m."studentId" = g."billingStudentId"
  );
