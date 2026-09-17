-- Adiciona filtro de período opcional ao ranking XP: p_period_start (date).
-- NULL (default) preserva o comportamento atual (XP total / lifetime).
-- Quando definido, ordena por (xp_atual - xp_no_snapshot_anterior_ou_igual_a_p_period_start).
--
-- Postgres trata funções com listas de parâmetros diferentes como overloads distintos —
-- para não manter duas versões de get_leaderboard_filtered em paralelo, esta migração
-- remove a assinatura de 4 argumentos e substitui totalmente pela de 5 argumentos.
DROP FUNCTION IF EXISTS public.get_leaderboard_filtered(text, text, text, int);

CREATE OR REPLACE FUNCTION public.get_leaderboard_filtered(
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
      s."primaryModality" AS primary_modality,
      CASE WHEN p_period_start IS NOT NULL THEN (
        SELECT snap.xp FROM "AthleteXpSnapshot" snap
        WHERE snap."athleteId" = a.id AND snap."snapshotDate" <= p_period_start
        ORDER BY snap."snapshotDate" DESC LIMIT 1
      ) END AS baseline_xp
    FROM "Student" s
    INNER JOIN "User" u ON u.id = s."userId"
    INNER JOIN "Athlete" a ON a."studentId" = s.id
    LEFT JOIN "StudentProfile" sp ON sp."studentId" = s.id
    CROSS JOIN scope sc
    WHERE s."schoolId" = sc.school_id
      AND s.status::text = 'ATIVO'
  ),
  filtered AS (
    SELECT
      r.*,
      CASE WHEN p_period_start IS NULL THEN r.xp
           ELSE GREATEST(0, r.xp - COALESCE(r.baseline_xp, 0))
      END AS ranking_xp
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
      ROW_NUMBER() OVER (ORDER BY f.ranking_xp DESC NULLS LAST)::bigint AS rank,
      f.student_id,
      f.display_name,
      f.ranking_xp AS xp,
      f.athlete_id,
      f.is_current_user
    FROM filtered f
  )
  SELECT r.rank, r.student_id, r.display_name, r.xp, r.athlete_id, r.is_current_user
  FROM ranked r
  ORDER BY r.rank
  LIMIT GREATEST(1, LEAST(COALESCE(NULLIF(p_limit, 0), 100), 500));
$$;

COMMENT ON FUNCTION public.get_leaderboard_filtered(text, text, text, int, date) IS
  'Ranking XP: escola (default = escola do aluno autenticado), modalidade principal opcional, faixa etária opcional (KIDS/TEENS/ADULTS/MASTERS), XP do período opcional (p_period_start; NULL = XP total/lifetime).';

REVOKE ALL ON FUNCTION public.get_leaderboard_filtered(text, text, text, int, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_filtered(text, text, text, int, date) TO authenticated;
