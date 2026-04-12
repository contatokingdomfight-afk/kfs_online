-- Ranking por XP com filtros opcionais: escola, modalidade principal, faixa etária (data de nascimento).
-- SECURITY DEFINER: o caller só precisa estar autenticado; qualquer escola ativa pode ser listada
-- (comparação entre unidades da rede). Apenas alunos ATIVOS com Athlete entram no ranking.

ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "primaryModality" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "dateOfBirth" DATE;

CREATE OR REPLACE FUNCTION public.get_leaderboard_filtered(
  p_school_id text DEFAULT NULL,
  p_modality text DEFAULT NULL,
  p_age_bucket text DEFAULT NULL,
  p_limit int DEFAULT 100
)
RETURNS TABLE (
  rank bigint,
  student_id text,
  display_name text,
  xp int,
  athlete_id text,
  is_current_user boolean
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
    SELECT
      me.my_student_id,
      COALESCE(NULLIF(TRIM(p_school_id), ''), me.my_school_id) AS school_id
    FROM me
  ),
  raw AS (
    SELECT
      s.id AS student_id,
      COALESCE(u.name, u.email, '') AS display_name,
      COALESCE(a.xp, 0)::int AS xp,
      a.id AS athlete_id,
      (s.id = sc.my_student_id) AS is_current_user,
      sp."dateOfBirth" AS dob,
      s."primaryModality" AS primary_modality
    FROM "Student" s
    INNER JOIN "User" u ON u.id = s."userId"
    INNER JOIN "Athlete" a ON a."studentId" = s.id
    LEFT JOIN "StudentProfile" sp ON sp."studentId" = s.id
    CROSS JOIN scope sc
    WHERE s."schoolId" = sc.school_id
      AND s.status::text = 'ATIVO'
  ),
  filtered AS (
    SELECT *
    FROM raw r
    WHERE (
        NULLIF(TRIM(p_modality), '') IS NULL
        OR r.primary_modality = NULLIF(TRIM(p_modality), '')
      )
      AND (
        NULLIF(TRIM(p_age_bucket), '') IS NULL
        OR (
          r.dob IS NOT NULL
          AND (
            (NULLIF(TRIM(p_age_bucket), '') = 'KIDS'
              AND (EXTRACT(YEAR FROM AGE(CURRENT_DATE, (r.dob)::date))::int BETWEEN 0 AND 12))
            OR (NULLIF(TRIM(p_age_bucket), '') = 'TEENS'
              AND (EXTRACT(YEAR FROM AGE(CURRENT_DATE, (r.dob)::date))::int BETWEEN 13 AND 17))
            OR (NULLIF(TRIM(p_age_bucket), '') = 'ADULTS'
              AND (EXTRACT(YEAR FROM AGE(CURRENT_DATE, (r.dob)::date))::int BETWEEN 18 AND 49))
            OR (NULLIF(TRIM(p_age_bucket), '') = 'MASTERS'
              AND (EXTRACT(YEAR FROM AGE(CURRENT_DATE, (r.dob)::date))::int >= 50))
          )
        )
      )
  ),
  ranked AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY f.xp DESC NULLS LAST)::bigint AS rank,
      f.student_id,
      f.display_name,
      f.xp,
      f.athlete_id,
      f.is_current_user
    FROM filtered f
  )
  SELECT r.rank, r.student_id, r.display_name, r.xp, r.athlete_id, r.is_current_user
  FROM ranked r
  ORDER BY r.rank
  LIMIT GREATEST(1, LEAST(COALESCE(NULLIF(p_limit, 0), 100), 500));
$$;

COMMENT ON FUNCTION public.get_leaderboard_filtered(text, text, text, int) IS
  'Ranking XP: escola (default = escola do aluno autenticado), modalidade principal opcional, faixa etária opcional (KIDS/TEENS/ADULTS/MASTERS).';

REVOKE ALL ON FUNCTION public.get_leaderboard_filtered(text, text, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_filtered(text, text, text, int) TO authenticated;
