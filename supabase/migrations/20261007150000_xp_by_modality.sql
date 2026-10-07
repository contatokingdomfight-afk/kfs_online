-- XP por modalidade (fase 4 da graduação).
-- O XP do ranking passa a ser calculado a partir das fontes (presenças, avaliações de performance,
-- avaliações físicas, cursos da plataforma e exames de graduação), cada evento associado a uma
-- modalidade (ou geral, quando não pertence a nenhuma: ex. avaliação física).
-- Athlete.xp (faixa antiga por XP) não é alterado aqui — continua até à migração para graus.

-- 1) Regras de XP (editáveis pelo admin).
CREATE TABLE IF NOT EXISTS "XpRule" (
  "source" TEXT NOT NULL PRIMARY KEY,
  "xp" INTEGER NOT NULL CHECK ("xp" >= 0 AND "xp" <= 10000),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO "XpRule" ("source", "xp") VALUES
  ('ATTENDANCE', 10),         -- por presença confirmada (modalidade da aula)
  ('PERFORMANCE', 5),         -- por ponto da média (1–10) de cada avaliação do treinador → até 50
  ('PHYSICAL', 50),           -- por avaliação física submetida (geral)
  ('COURSE_LESSON', 5),       -- por aula de curso concluída (modalidade do curso ou geral)
  ('COURSE_COMPLETED', 20),   -- bónus por curso concluído
  ('EXAM_PASSED', 100),       -- × número do grau obtido (Branco = 1, …)
  ('EXAM_TAKEN', 25)          -- exame realizado sem aprovação
ON CONFLICT ("source") DO NOTHING;

ALTER TABLE "XpRule" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "xp_rule_read" ON "XpRule";
CREATE POLICY "xp_rule_read" ON "XpRule" FOR SELECT TO authenticated USING (true);

-- 2) Todos os eventos de XP (vista calculada; sem duplicar contadores).
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
WHERE gc.status IN ('PASSED', 'FAILED') AND gc."decidedAt" IS NOT NULL;

-- A vista lê todos os alunos: só acessível via RPCs SECURITY DEFINER e service role.
REVOKE ALL ON "StudentXpEvent" FROM PUBLIC;
REVOKE ALL ON "StudentXpEvent" FROM anon, authenticated;
GRANT SELECT ON "StudentXpEvent" TO service_role;

-- 3) Ranking v2.
-- p_modality definido → ranking da modalidade por XP (XP da modalidade + XP geral).
-- p_modality vazio   → "Pontuação Kingdom" (0–1000): média, pelas modalidades que o aluno treina,
--                      do percentil (mid-rank) do seu XP dentro de cada modalidade. Quem treina
--                      várias modalidades não ganha só por volume.
-- Um aluno "treina" uma modalidade se for a principal, se tiver 4+ presenças confirmadas nela
-- ou se tiver grau atribuído. Sem nenhuma, entra num grupo "GENERAL".
CREATE OR REPLACE FUNCTION public.get_leaderboard_v2(
  p_school_id text DEFAULT NULL,
  p_modality text DEFAULT NULL,
  p_age_bucket text DEFAULT NULL,
  p_limit int DEFAULT 100,
  p_period_start date DEFAULT NULL
)
RETURNS TABLE (
  rank bigint,
  student_id text,
  display_name text,
  score int,
  xp int,
  legacy_xp int,
  athlete_id text,
  is_current_user boolean,
  modalities text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT s.id AS my_student_id, s."schoolId" AS my_school_id
    FROM "Student" s
    INNER JOIN "User" u ON u.id = s."userId"
    WHERE u."authUserId" = auth.uid()::text
    LIMIT 1
  ),
  scope AS (
    SELECT me.my_student_id, COALESCE(NULLIF(TRIM(p_school_id), ''), me.my_school_id) AS school_id
    FROM me
  ),
  pop AS (
    SELECT
      s.id AS student_id,
      COALESCE(u.name, u.email, '') AS display_name,
      s."primaryModality" AS primary_modality,
      a.id AS athlete_id,
      COALESCE(a.xp, 0)::int AS legacy_xp,
      (s.id = sc.my_student_id) AS is_current_user
    FROM "Student" s
    INNER JOIN "User" u ON u.id = s."userId"
    LEFT JOIN "Athlete" a ON a."studentId" = s.id
    LEFT JOIN "StudentProfile" sp ON sp."studentId" = s.id
    CROSS JOIN scope sc
    WHERE s."schoolId" = sc.school_id
      AND s.status::text = 'ATIVO'
      AND (
        NULLIF(TRIM(p_age_bucket), '') IS NULL
        OR (
          sp."dateOfBirth" IS NOT NULL
          AND (
            (NULLIF(TRIM(p_age_bucket), '') = 'KIDS'
              AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, (sp."dateOfBirth")::date))::int BETWEEN 0 AND 12)
            OR (NULLIF(TRIM(p_age_bucket), '') = 'TEENS'
              AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, (sp."dateOfBirth")::date))::int BETWEEN 13 AND 17)
            OR (NULLIF(TRIM(p_age_bucket), '') = 'ADULTS'
              AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, (sp."dateOfBirth")::date))::int BETWEEN 18 AND 49)
            OR (NULLIF(TRIM(p_age_bucket), '') = 'MASTERS'
              AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, (sp."dateOfBirth")::date))::int >= 50)
          )
        )
      )
  ),
  ev AS (
    SELECT e.*
    FROM "StudentXpEvent" e
    JOIN pop p ON p.student_id = e.student_id
    WHERE p_period_start IS NULL OR e.occurred_at >= p_period_start
  ),
  participation AS (
    SELECT p.student_id, p.primary_modality AS modality_code FROM pop p WHERE p.primary_modality IS NOT NULL
    UNION
    SELECT a."studentId", l.modality
    FROM "Attendance" a
    JOIN "Lesson" l ON l.id = a."lessonId"
    JOIN pop p ON p.student_id = a."studentId"
    WHERE a.status::text = 'CONFIRMED' AND NOT a."isExperimental"
    GROUP BY a."studentId", l.modality
    HAVING COUNT(*) >= 4
    UNION
    SELECT sg."studentId", sg."modalityCode"
    FROM "StudentGrade" sg
    JOIN pop p ON p.student_id = sg."studentId"
  ),
  part AS (
    SELECT student_id, modality_code FROM participation
    UNION ALL
    SELECT p.student_id, 'GENERAL' FROM pop p
    WHERE NOT EXISTS (SELECT 1 FROM participation x WHERE x.student_id = p.student_id)
  ),
  general_xp AS (
    SELECT student_id, SUM(xp)::int AS gx FROM ev WHERE modality_code IS NULL GROUP BY student_id
  ),
  mod_xp AS (
    SELECT student_id, modality_code, SUM(xp)::int AS mx FROM ev WHERE modality_code IS NOT NULL GROUP BY student_id, modality_code
  ),
  pm AS (
    SELECT pa.student_id, pa.modality_code, COALESCE(m.mx, 0) + COALESCE(g.gx, 0) AS xp
    FROM part pa
    LEFT JOIN mod_xp m ON m.student_id = pa.student_id AND m.modality_code = pa.modality_code
    LEFT JOIN general_xp g ON g.student_id = pa.student_id
  ),
  -- Percentil mid-rank, encolhido para 0,5 em modalidades com poucos alunos
  -- (pctl' = (n·pctl + 5·0,5) / (n + 5)): ser o melhor de 3 não vale o mesmo que ser o melhor de 40.
  pct_raw AS (
    SELECT
      pm.*,
      COUNT(*) OVER (PARTITION BY pm.modality_code) AS n,
      (
        (RANK() OVER (PARTITION BY pm.modality_code ORDER BY pm.xp) - 1)
        + 0.5 * COUNT(*) OVER (PARTITION BY pm.modality_code, pm.xp)
      )::numeric / COUNT(*) OVER (PARTITION BY pm.modality_code) AS raw_pctl
    FROM pm
  ),
  -- Sem XP na modalidade = 0 (quem não treinou não fica "a meio" à frente de quem treinou pouco).
  pct AS (
    SELECT r.*, CASE WHEN r.xp <= 0 THEN 0 ELSE (r.n * r.raw_pctl + 2.5) / (r.n + 5) END AS pctl FROM pct_raw r
  ),
  total AS (
    SELECT student_id, SUM(xp)::int AS xp FROM ev GROUP BY student_id
  ),
  scored AS (
    SELECT
      p.student_id,
      p.display_name,
      p.athlete_id,
      p.legacy_xp,
      p.is_current_user,
      CASE
        WHEN NULLIF(TRIM(p_modality), '') IS NULL THEN ROUND(AVG(c.pctl) * 1000)::int
        ELSE MAX(c.xp)::int
      END AS score,
      CASE
        WHEN NULLIF(TRIM(p_modality), '') IS NULL THEN COALESCE(MAX(t.xp), 0)
        ELSE MAX(c.xp)::int
      END AS xp,
      ARRAY_AGG(c.modality_code ORDER BY c.modality_code) FILTER (WHERE c.modality_code <> 'GENERAL') AS modalities
    FROM pop p
    JOIN pct c ON c.student_id = p.student_id
      AND (NULLIF(TRIM(p_modality), '') IS NULL OR c.modality_code = NULLIF(TRIM(p_modality), ''))
    LEFT JOIN total t ON t.student_id = p.student_id
    GROUP BY p.student_id, p.display_name, p.athlete_id, p.legacy_xp, p.is_current_user
  ),
  ranked AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY sc.score DESC, sc.xp DESC, sc.display_name)::bigint AS rank,
      sc.*
    FROM scored sc
  )
  SELECT r.rank, r.student_id, r.display_name, r.score, r.xp, r.legacy_xp, r.athlete_id, r.is_current_user, COALESCE(r.modalities, '{}')
  FROM ranked r
  WHERE r.rank <= GREATEST(1, LEAST(COALESCE(NULLIF(p_limit, 0), 100), 500)) OR r.is_current_user
  ORDER BY r.rank;
$$;

COMMENT ON FUNCTION public.get_leaderboard_v2(text, text, text, int, date) IS
  'Ranking v2: com modalidade = XP da modalidade (+ XP geral); sem modalidade = Pontuação Kingdom 0–1000 (média dos percentis por modalidade praticada). Escola default = do aluno autenticado; faixa etária e período opcionais.';

REVOKE ALL ON FUNCTION public.get_leaderboard_v2(text, text, text, int, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_v2(text, text, text, int, date) TO authenticated;

-- 4) Resumo do XP do aluno autenticado (por modalidade e fonte).
CREATE OR REPLACE FUNCTION public.get_my_xp_summary(p_period_start date DEFAULT NULL)
RETURNS TABLE (modality_code text, source text, xp int, events int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.modality_code, e.source, SUM(e.xp)::int, COUNT(*)::int
  FROM "StudentXpEvent" e
  JOIN "Student" s ON s.id = e.student_id
  JOIN "User" u ON u.id = s."userId"
  WHERE u."authUserId" = auth.uid()::text
    AND (p_period_start IS NULL OR e.occurred_at >= p_period_start)
  GROUP BY e.modality_code, e.source;
$$;

REVOKE ALL ON FUNCTION public.get_my_xp_summary(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_xp_summary(date) TO authenticated;
