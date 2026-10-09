-- Carga de treino: nota de esforço (RPE) dada pelo aluno vale XP; o coach pode preencher o RPE na aula.
-- "rpeSource" distingue quem deu a nota: só a do próprio aluno dá XP (EFFORT_RATING).

ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "rpeSource" TEXT;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Attendance_rpeSource_check') THEN
    ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_rpeSource_check" CHECK ("rpeSource" IN ('STUDENT', 'COACH'));
  END IF;
END $$;
COMMENT ON COLUMN "Attendance"."rpeSource" IS 'Quem registou o RPE: STUDENT (dá XP) ou COACH (estimativa do treinador).';

-- Notas já existentes foram todas dadas pelos alunos.
UPDATE "Attendance" SET "rpeSource" = 'STUDENT' WHERE rpe IS NOT NULL AND "rpeSource" IS NULL;

INSERT INTO "XpRule" ("source", "xp") VALUES ('EFFORT_RATING', 5) ON CONFLICT ("source") DO NOTHING;

CREATE OR REPLACE VIEW "StudentXpEvent" AS
WITH rules AS (SELECT "source", "xp" FROM "XpRule")
SELECT
  a."studentId" AS student_id,
  l.modality AS modality_code,
  'ATTENDANCE'::text AS source,
  (SELECT xp FROM rules WHERE source = 'ATTENDANCE') AS xp,
  (a."occurrenceDate")::timestamptz AS occurred_at
FROM "Attendance" a
JOIN "Lesson" l ON l.id = a."lessonId"
WHERE a.status::text = 'CONFIRMED'
  AND NOT a."isExperimental"
  AND a."countsForGamification"

UNION ALL
SELECT
  at."studentId",
  e.modality,
  'PERFORMANCE',
  ROUND(avg_score * (SELECT xp FROM rules WHERE source = 'PERFORMANCE'))::int,
  e.created_at
FROM "AthleteEvaluation" e
JOIN "Athlete" at ON at.id = e."athleteId"
CROSS JOIN LATERAL (
  SELECT AVG(v::numeric) AS avg_score
  FROM jsonb_each_text(COALESCE(e.scores, '{}'::jsonb)) AS j(k, v)
  WHERE v ~ '^[0-9]+(\.[0-9]+)?$' AND v::numeric BETWEEN 1 AND 10
) s
WHERE s.avg_score IS NOT NULL

UNION ALL
SELECT
  p."studentId",
  NULL,
  'PHYSICAL',
  (SELECT xp FROM rules WHERE source = 'PHYSICAL'),
  (p."assessedAt")::timestamptz
FROM "StudentPhysicalAssessment" p
WHERE p.status = 'SUBMITTED'

UNION ALL
SELECT
  up.student_id,
  c.modality,
  'COURSE_LESSON',
  (SELECT xp FROM rules WHERE source = 'COURSE_LESSON'),
  up.completed_at::timestamptz
FROM "CourseUnitProgress" up
JOIN "CourseUnit" cu ON cu.id = up.unit_id
JOIN "CourseModule" cm ON cm.id = cu.module_id
JOIN "Course" c ON c.id = cm.course_id

UNION ALL
SELECT
  mp.student_id,
  c.modality,
  'COURSE_LESSON',
  (SELECT xp FROM rules WHERE source = 'COURSE_LESSON'),
  mp.completed_at::timestamptz
FROM "CourseProgress" mp
JOIN "CourseModule" cm ON cm.id = mp.module_id
JOIN "Course" c ON c.id = cm.course_id

UNION ALL
SELECT
  cc.student_id,
  c.modality,
  'COURSE_COMPLETED',
  (SELECT xp FROM rules WHERE source = 'COURSE_COMPLETED'),
  cc.completed_at::timestamptz
FROM "CourseCompletion" cc
JOIN "Course" c ON c.id = cc.course_id

UNION ALL
SELECT
  gc."studentId",
  ev."modalityCode",
  CASE WHEN gc.status = 'PASSED' THEN 'EXAM_PASSED' ELSE 'EXAM_TAKEN' END,
  CASE
    WHEN gc.status = 'PASSED' THEN (g."sortOrder" + 1) * (SELECT xp FROM rules WHERE source = 'EXAM_PASSED')
    ELSE (SELECT xp FROM rules WHERE source = 'EXAM_TAKEN')
  END,
  gc."decidedAt"
FROM "GraduationExamCandidate" gc
JOIN "GraduationExamEvent" ev ON ev.id = gc."eventId"
JOIN "GraduationGrade" g ON g.id = gc."gradeId"
WHERE gc.status IN ('PASSED', 'FAILED') AND gc."decidedAt" IS NOT NULL

UNION ALL
SELECT
  a."studentId",
  l.modality,
  'EFFORT_RATING',
  (SELECT xp FROM rules WHERE source = 'EFFORT_RATING'),
  (a."occurrenceDate")::timestamptz
FROM "Attendance" a
JOIN "Lesson" l ON l.id = a."lessonId"
WHERE a.status::text = 'CONFIRMED'
  AND NOT a."isExperimental"
  AND a.rpe IS NOT NULL
  AND COALESCE(a."rpeSource", 'STUDENT') = 'STUDENT';

REVOKE ALL ON "StudentXpEvent" FROM PUBLIC;
REVOKE ALL ON "StudentXpEvent" FROM anon, authenticated;
GRANT SELECT ON "StudentXpEvent" TO service_role;
