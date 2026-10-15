-- Histórico do ranking: um registo por semana (posição e pontuação de cada aluno) para mostrar
-- «subiste N lugares esta semana». O registo é feito pelo cron diário xp-snapshot (só cria se a
-- semana ainda não tem registo).
CREATE TABLE IF NOT EXISTS "RankSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "weekStart" DATE NOT NULL,
  "schoolId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "rank" INTEGER NOT NULL,
  "score" INTEGER NOT NULL,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("weekStart", "schoolId", "studentId")
);
CREATE INDEX IF NOT EXISTS "RankSnapshot_week_school_idx" ON "RankSnapshot" ("weekStart", "schoolId");
ALTER TABLE "RankSnapshot" ENABLE ROW LEVEL SECURITY;

-- get_leaderboard_v2 passa a funcionar sem utilizador autenticado (cron / service role): com
-- p_school_id definido devolve o ranking dessa escola, sem linha «is_current_user».
CREATE OR REPLACE FUNCTION public.get_leaderboard_v2(p_school_id text DEFAULT NULL::text, p_modality text DEFAULT NULL::text, p_age_bucket text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_period_start date DEFAULT NULL::date)
 RETURNS TABLE(rank bigint, student_id text, display_name text, score integer, xp integer, legacy_xp integer, athlete_id text, is_current_user boolean, modalities text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH me AS (
    SELECT s.id AS my_student_id, s."schoolId" AS my_school_id
    FROM "Student" s
    INNER JOIN "User" u ON u.id = s."userId"
    WHERE u."authUserId" = auth.uid()::text
    LIMIT 1
  ),
  scope AS (
    SELECT me.my_student_id, COALESCE(NULLIF(TRIM(p_school_id), ''), me.my_school_id) AS school_id
    FROM (SELECT 1) one LEFT JOIN me ON true
  ),
  pop AS (
    SELECT
      s.id AS student_id,
      COALESCE(u.name, u.email, '') AS display_name,
      s."primaryModality" AS primary_modality,
      a.id AS athlete_id,
      COALESCE(a.xp, 0)::int AS legacy_xp,
      (s.id = sc.my_student_id) AS is_current_user,
      (u.role::text = 'ADMIN') AS is_admin
    FROM "Student" s
    INNER JOIN "User" u ON u.id = s."userId"
    LEFT JOIN "Athlete" a ON a."studentId" = s.id
    LEFT JOIN "StudentProfile" sp ON sp."studentId" = s.id
    CROSS JOIN scope sc
    WHERE s."schoolId" = sc.school_id
      AND s.status::text = 'ATIVO'
      AND (u.role::text <> 'ADMIN' OR s.id = sc.my_student_id)
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
    SELECT pa.student_id, pa.modality_code, COALESCE(m.mx, 0) + COALESCE(g.gx, 0) AS xp, pp.is_admin
    FROM part pa
    JOIN pop pp ON pp.student_id = pa.student_id
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
    WHERE NOT pm.is_admin
  ),
  -- Sem XP na modalidade = 0 (quem não treinou não fica "a meio" à frente de quem treinou pouco).
  pct AS (
    SELECT r.*, CASE WHEN r.xp <= 0 THEN 0 ELSE (r.n * r.raw_pctl + 2.5) / (r.n + 5) END AS pctl FROM pct_raw r
    UNION ALL
    -- Contas de admin: pontuadas contra os alunos reais, sem entrarem no cálculo deles.
    SELECT a.student_id, a.modality_code, a.xp, a.is_admin, b.n, COALESCE(b.raw_pctl, 0.5),
      CASE WHEN a.xp <= 0 THEN 0 ELSE (b.n * COALESCE(b.raw_pctl, 0.5) + 2.5) / (b.n + 5) END
    FROM pm a
    CROSS JOIN LATERAL (
      SELECT COUNT(*) AS n,
        (COUNT(*) FILTER (WHERE x.xp < a.xp) + 0.5 * COUNT(*) FILTER (WHERE x.xp = a.xp))::numeric / NULLIF(COUNT(*), 0) AS raw_pctl
      FROM pm x WHERE x.modality_code = a.modality_code AND NOT x.is_admin
    ) b
    WHERE a.is_admin
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
      p.is_admin,
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
    GROUP BY p.student_id, p.display_name, p.athlete_id, p.legacy_xp, p.is_current_user, p.is_admin
  ),
  ranked AS (
    SELECT
      -- Admins ficam fora da lista (rank 0): vêem a sua pontuação, mas não alteram as posições dos alunos.
      CASE WHEN sc.is_admin THEN 0::bigint
        ELSE ROW_NUMBER() OVER (PARTITION BY sc.is_admin ORDER BY sc.score DESC, sc.xp DESC, sc.display_name)::bigint
      END AS rank,
      sc.*
    FROM scored sc
  )
  SELECT r.rank, r.student_id, r.display_name, r.score, r.xp, r.legacy_xp, r.athlete_id, r.is_current_user, COALESCE(r.modalities, '{}')
  FROM ranked r
  WHERE r.rank <= GREATEST(1, LEAST(COALESCE(NULLIF(p_limit, 0), 100), 500)) OR r.is_current_user
  ORDER BY r.rank;
$function$;
