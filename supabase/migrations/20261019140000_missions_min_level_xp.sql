-- Missões por nível: «faixa mínima» (beltIndex) passa a «nível mínimo» (minLevel, níveis numéricos de lib/levels.ts).
-- O XP das missões (prémios automáticos de dimensão e missões concluídas) passa a contar no XP oficial,
-- incluindo os prémios já ganhos. A vista é redefinida a partir da definição em produção.

ALTER TABLE "MissionTemplate" ADD COLUMN IF NOT EXISTS "minLevel" INTEGER;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MissionTemplate_minLevel_check') THEN
    ALTER TABLE "MissionTemplate" ADD CONSTRAINT "MissionTemplate_minLevel_check" CHECK ("minLevel" IS NULL OR "minLevel" >= 1);
  END IF;
END $$;

-- Conversão faixa → nível (mesma tabela de lib/levels.ts: beltIndexToMinLevel).
UPDATE "MissionTemplate" SET "minLevel" = CASE "beltIndex"
  WHEN 0 THEN 1 WHEN 1 THEN 2 WHEN 2 THEN 3 WHEN 3 THEN 4 WHEN 4 THEN 5 WHEN 5 THEN 6
  WHEN 6 THEN 8 WHEN 7 THEN 9 WHEN 8 THEN 10 WHEN 9 THEN 11 WHEN 10 THEN 12 WHEN 11 THEN 15 WHEN 12 THEN 20
  ELSE 20 + 5 * ("beltIndex" - 12) END
WHERE "beltIndex" IS NOT NULL AND "minLevel" IS NULL;

CREATE OR REPLACE VIEW "StudentXpEvent" AS
SELECT * FROM (
SELECT base.student_id,
    base.modality_code,
    base.source,
    base.xp,
    base.occurred_at
   FROM ( WITH rules AS (
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
          WHERE a.status::text = 'CONFIRMED'::text AND NOT a."isExperimental" AND a.rpe IS NOT NULL AND COALESCE(a."rpeSource", 'STUDENT'::text) = 'STUDENT'::text) base
UNION ALL
 SELECT tribe.student_id,
    tribe.modality_code,
    tribe.source,
    tribe.xp,
    tribe.occurred_at
   FROM ( SELECT DISTINCT ON (s.id, ((p."createdAt" AT TIME ZONE 'Europe/Lisbon'::text)::date)) s.id AS student_id,
            NULL::text AS modality_code,
            'TRIBE_POST'::text AS source,
            ( SELECT r.xp
                   FROM "XpRule" r
                  WHERE r.source = 'TRIBE_POST'::text) AS xp,
            p."createdAt" AS occurred_at
           FROM "TribePost" p
             JOIN "Student" s ON s."userId" = p."authorUserId"
          WHERE p.status::text = 'ACTIVE'::text AND p."createdAt" >= '2026-10-18 23:00:00+00'::timestamp with time zone AND (EXISTS ( SELECT 1
                   FROM "TribePostMedia" m
                  WHERE m."postId" = p.id AND COALESCE(m."mimeType", 'image/'::text) ~~ 'image/%'::text))) tribe
UNION ALL
 SELECT wellness.student_id,
    wellness.modality_code,
    wellness.source,
    wellness.xp,
    wellness.occurred_at
   FROM ( SELECT DISTINCT ON (w."studentId", w."occurrenceDate") w."studentId" AS student_id,
            NULL::text AS modality_code,
            'WELLNESS_CHECKIN'::text AS source,
            ( SELECT r.xp
                   FROM "XpRule" r
                  WHERE r.source = 'WELLNESS_CHECKIN'::text) AS xp,
            w."occurrenceDate"::timestamp with time zone AS occurred_at
           FROM "PreLessonWellness" w
          WHERE w."occurrenceDate" >= '2026-10-19'::date) wellness
) base
UNION ALL
-- Prémios automáticos de missões de dimensão (ex.: «Subir Técnico para 7»).
SELECT at."studentId" AS student_id, NULL::text AS modality_code, 'MISSION'::text AS source,
  COALESCE(ma."xpAwarded", 0)::int AS xp, ma."createdAt"::timestamptz AS occurred_at
FROM "AthleteMissionAward" ma
JOIN "Athlete" at ON at.id = ma."athleteId"
WHERE at."studentId" IS NOT NULL AND COALESCE(ma."xpAwarded", 0) > 0
UNION ALL
-- Missões de modelo concluídas.
SELECT at."studentId", NULL::text, 'MISSION'::text,
  COALESCE(mc."xpAwarded", 0)::int, mc."completedAt"::timestamptz
FROM "AthleteMissionCompletion" mc
JOIN "Athlete" at ON at.id = mc."athleteId"
WHERE at."studentId" IS NOT NULL AND COALESCE(mc."xpAwarded", 0) > 0;
