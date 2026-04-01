-- Leaderboard por XP na mesma escola do utilizador autenticado.
-- RLS impede SELECT em User/Student de terceiros; esta função SECURITY DEFINER
-- devolve apenas alunos ATIVOS da escola do caller, com registo Athlete, ordenados por XP.

CREATE OR REPLACE FUNCTION public.get_leaderboard_my_school(p_limit int DEFAULT 100)
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
    SELECT s.id AS my_student_id, s."schoolId" AS school_id
    FROM "Student" s
    INNER JOIN "User" u ON u.id = s."userId"
    WHERE u."authUserId" = auth.uid()::text
    LIMIT 1
  ),
  ranked AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY COALESCE(a.xp, 0) DESC NULLS LAST)::bigint AS rank,
      s.id AS student_id,
      COALESCE(u.name, u.email, '') AS display_name,
      COALESCE(a.xp, 0)::int AS xp,
      a.id AS athlete_id,
      (s.id = me.my_student_id) AS is_current_user
    FROM "Student" s
    INNER JOIN "User" u ON u.id = s."userId"
    INNER JOIN "Athlete" a ON a."studentId" = s.id
    CROSS JOIN me
    WHERE s."schoolId" = me.school_id
      AND s.status::text = 'ATIVO'
  )
  SELECT r.rank, r.student_id, r.display_name, r.xp, r.athlete_id, r.is_current_user
  FROM ranked r
  ORDER BY r.rank
  LIMIT GREATEST(1, LEAST(COALESCE(NULLIF(p_limit, 0), 100), 500));
$$;

COMMENT ON FUNCTION public.get_leaderboard_my_school(int) IS
  'Ranking XP por escola (só a escola do aluno autenticado). Usado em /dashboard/rank.';

REVOKE ALL ON FUNCTION public.get_leaderboard_my_school(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_my_school(int) TO authenticated; -- service_role inclui bypass
