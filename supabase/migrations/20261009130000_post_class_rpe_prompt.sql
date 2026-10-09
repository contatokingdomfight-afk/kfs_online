-- Lembrete «Como foi o treino?» depois da aula (notificação in-app, sino).
-- Corre dentro da base de dados: pg_cron chama a função a cada 15 min (horário de Lisboa na lógica).
-- p_now só serve para testes (por defeito, agora).
-- Regras: aula de hoje terminada há 30 min–3 h; presença confirmada (não experimental); sem nota de
-- esforço do próprio aluno (vazia ou só a estimativa do coach); um lembrete por presença e no máximo
-- um por aluno a cada 3 h (quem faz duas aulas seguidas recebe um só).

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.send_post_class_rpe_prompts(p_now timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  local_now timestamp := p_now AT TIME ZONE 'Europe/Lisbon';
  xp_reward integer := COALESCE((SELECT xp FROM "XpRule" WHERE source = 'EFFORT_RATING'), 0);
  inserted integer;
BEGIN
  WITH candidates AS (
    SELECT DISTINCT ON (a."studentId")
      a.id AS attendance_id,
      a."studentId" AS student_id,
      COALESCE(m.name, l.modality) AS modality_name,
      left(l."startTime", 5) AS start_time
    FROM "Attendance" a
    JOIN "Lesson" l ON l.id = a."lessonId"
    LEFT JOIN "ModalityRef" m ON m.code = l.modality
    WHERE a."occurrenceDate" = local_now::date
      AND a.status::text = 'CONFIRMED'
      AND NOT a."isExperimental"
      AND (a.rpe IS NULL OR a."rpeSource" = 'COACH')
      AND l."endTime" ~ '^\d{1,2}:\d{2}'
      AND local_now::time - (left(l."endTime", 5))::time BETWEEN interval '30 minutes' AND interval '180 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM "Notification" n
        WHERE n.type = 'RPE_PROMPT'
          AND n."studentId" = a."studentId"
          AND (n.href = '/dashboard?rpe=' || a.id OR n.created_at > p_now - interval '3 hours')
      )
    ORDER BY a."studentId", l."endTime" DESC
  )
  INSERT INTO "Notification" (id, "studentId", type, title, body, href, created_at)
  SELECT
    gen_random_uuid()::text,
    c.student_id,
    'RPE_PROMPT',
    'Como foi o treino?',
    c.modality_name || ' ' || c.start_time || ' · dá a tua nota de esforço'
      || CASE WHEN xp_reward > 0 THEN ' (+' || xp_reward || ' XP)' ELSE '' END,
    '/dashboard?rpe=' || c.attendance_id,
    p_now
  FROM candidates c;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.send_post_class_rpe_prompts(timestamptz) FROM PUBLIC, anon, authenticated;

-- (Re)agenda a cada 15 min.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'post-class-rpe-prompts') THEN
    PERFORM cron.unschedule('post-class-rpe-prompts');
  END IF;
  PERFORM cron.schedule('post-class-rpe-prompts', '*/15 * * * *', 'SELECT public.send_post_class_rpe_prompts();');
END $$;
