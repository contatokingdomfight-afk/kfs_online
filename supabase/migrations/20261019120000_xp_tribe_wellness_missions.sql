-- Missões novas de XP: publicação com foto na Tribo (15 XP) e registo de bem-estar (5 XP), 1 por dia cada.
-- Sem XP retroativo: só contam a partir de 2026-10-19. A vista é redefinida a partir da definição em produção.

INSERT INTO "XpRule" ("source", "xp") VALUES ('TRIBE_POST', 15), ('WELLNESS_CHECKIN', 5) ON CONFLICT ("source") DO NOTHING;

CREATE OR REPLACE VIEW "StudentXpEvent" AS
SELECT * FROM (
WITH rules AS (
         SELECT "XpRule".source,
            "XpRule".xp
           FROM "XpRule"
        )
 SELECT a."studentId" AS student_id,
    l.modality AS modality_code,
    'ATTENDANCE'::text AS source,
    ( SELECT rules.xp
           FROM rules
          WHERE rules.source = 'ATTENDANCE'::text) AS xp,
    a."occurrenceDate"::timestamp with time zone AS occurred_at
   FROM "Attendance" a
     JOIN "Lesson" l ON l.id = a."lessonId"
  WHERE a.status::text = 'CONFIRMED'::text AND NOT a."isExperimental" AND a."countsForGamification"
UNION ALL
 SELECT at."studentId" AS student_id,
    e.modality AS modality_code,
    'PERFORMANCE'::text AS source,
    round(s.avg_score * (( SELECT rules.xp
           FROM rules
          WHERE rules.source = 'PERFORMANCE'::text))::numeric)::integer AS xp,
    e.created_at AS occurred_at
   FROM "AthleteEvaluation" e
     JOIN "Athlete" at ON at.id = e."athleteId"
     CROSS JOIN LATERAL ( SELECT avg(j.v::numeric) AS avg_score
           FROM jsonb_each_text(COALESCE(e.scores, '{}'::jsonb)) j(k, v)
          WHERE j.v ~ '^[0-9]+(\.[0-9]+)?$'::text AND j.v::numeric >= 1::numeric AND j.v::numeric <= 10::numeric) s
  WHERE s.avg_score IS NOT NULL
UNION ALL
 SELECT p."studentId" AS student_id,
    NULL::text AS modality_code,
    'PHYSICAL'::text AS source,
    ( SELECT rules.xp
           FROM rules
          WHERE rules.source = 'PHYSICAL'::text) AS xp,
    p."assessedAt"::timestamp with time zone AS occurred_at
   FROM "StudentPhysicalAssessment" p
  WHERE p.status = 'SUBMITTED'::text
UNION ALL
 SELECT up.student_id,
    c.modality AS modality_code,
    'COURSE_LESSON'::text AS source,
    ( SELECT rules.xp
           FROM rules
          WHERE rules.source = 'COURSE_LESSON'::text) AS xp,
    up.completed_at::timestamp with time zone AS occurred_at
   FROM "CourseUnitProgress" up
     JOIN "CourseUnit" cu ON cu.id = up.unit_id
     JOIN "CourseModule" cm ON cm.id = cu.module_id
     JOIN "Course" c ON c.id = cm.course_id
UNION ALL
 SELECT mp.student_id,
    c.modality AS modality_code,
    'COURSE_LESSON'::text AS source,
    ( SELECT rules.xp
           FROM rules
          WHERE rules.source = 'COURSE_LESSON'::text) AS xp,
    mp.completed_at::timestamp with time zone AS occurred_at
   FROM "CourseProgress" mp
     JOIN "CourseModule" cm ON cm.id = mp.module_id
     JOIN "Course" c ON c.id = cm.course_id
UNION ALL
 SELECT cc.student_id,
    c.modality AS modality_code,
    'COURSE_COMPLETED'::text AS source,
    ( SELECT rules.xp
           FROM rules
          WHERE rules.source = 'COURSE_COMPLETED'::text) AS xp,
    cc.completed_at::timestamp with time zone AS occurred_at
   FROM "CourseCompletion" cc
     JOIN "Course" c ON c.id = cc.course_id
UNION ALL
 SELECT gc."studentId" AS student_id,
    ev."modalityCode" AS modality_code,
        CASE
            WHEN gc.status = 'PASSED'::text THEN 'EXAM_PASSED'::text
            ELSE 'EXAM_TAKEN'::text
        END AS source,
        CASE
            WHEN gc.status = 'PASSED'::text THEN (g."sortOrder" + 1) * (( SELECT rules.xp
               FROM rules
              WHERE rules.source = 'EXAM_PASSED'::text))
            ELSE ( SELECT rules.xp
               FROM rules
              WHERE rules.source = 'EXAM_TAKEN'::text)
        END AS xp,
    gc."decidedAt" AS occurred_at
   FROM "GraduationExamCandidate" gc
     JOIN "GraduationExamEvent" ev ON ev.id = gc."eventId"
     JOIN "GraduationGrade" g ON g.id = gc."gradeId"
  WHERE (gc.status = ANY (ARRAY['PASSED'::text, 'FAILED'::text])) AND gc."decidedAt" IS NOT NULL
UNION ALL
 SELECT a."studentId" AS student_id,
    l.modality AS modality_code,
    'EFFORT_RATING'::text AS source,
    ( SELECT rules.xp
           FROM rules
          WHERE rules.source = 'EFFORT_RATING'::text) AS xp,
    a."occurrenceDate"::timestamp with time zone AS occurred_at
   FROM "Attendance" a
     JOIN "Lesson" l ON l.id = a."lessonId"
  WHERE a.status::text = 'CONFIRMED'::text AND NOT a."isExperimental" AND a.rpe IS NOT NULL AND COALESCE(a."rpeSource", 'STUDENT'::text) = 'STUDENT'::text
) base
UNION ALL
SELECT * FROM (
 -- Publicação com foto na Tribo: 1 por dia (dia de Lisboa), só a partir de 2026-10-19 (sem XP retroativo).
 SELECT DISTINCT ON (s.id, ((p."createdAt" AT TIME ZONE 'Europe/Lisbon')::date))
    s.id AS student_id,
    NULL::text AS modality_code,
    'TRIBE_POST'::text AS source,
    ( SELECT r.xp FROM "XpRule" r WHERE r.source = 'TRIBE_POST'::text) AS xp,
    p."createdAt" AS occurred_at
   FROM "TribePost" p
     JOIN "Student" s ON s."userId" = p."authorUserId"
  WHERE p.status::text = 'ACTIVE'::text
    AND p."createdAt" >= '2026-10-19 00:00:00+01'::timestamptz
    AND EXISTS (SELECT 1 FROM "TribePostMedia" m WHERE m."postId" = p.id AND COALESCE(m."mimeType", 'image/') LIKE 'image/%')
) tribe
UNION ALL
SELECT * FROM (
 -- Registo de bem-estar (sono, stress, fadiga): 1 por dia, só a partir de 2026-10-19.
 SELECT DISTINCT ON (w."studentId", w."occurrenceDate")
    w."studentId" AS student_id,
    NULL::text AS modality_code,
    'WELLNESS_CHECKIN'::text AS source,
    ( SELECT r.xp FROM "XpRule" r WHERE r.source = 'WELLNESS_CHECKIN'::text) AS xp,
    w."occurrenceDate"::timestamp with time zone AS occurred_at
   FROM "PreLessonWellness" w
  WHERE w."occurrenceDate" >= '2026-10-19'::date) wellness;
