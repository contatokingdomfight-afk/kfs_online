-- Nota de cansaço (RPE) com meios pontos + foco da aula marcado pelo coach.
--
-- 1) Attendance.rpe e Attendance.coachRpe: SMALLINT → NUMERIC(3,1), só valores 1, 1,5, 2 … 10.
--    As views que usam estas colunas (ex.: "StudentXpEvent") são guardadas, apagadas e recriadas
--    com as mesmas opções e permissões. DROP sem CASCADE: se outra view depender delas, a migração
--    falha em vez de apagar coisas em silêncio.
-- 2) LessonOccurrenceFocus: até 2 focos (Técnica, Tática, Sparring, Físico) por aula num dia.

BEGIN;

DO $$
DECLARE
  v RECORD;
  g RECORD;
  saved JSONB := '[]'::jsonb;
  item JSONB;
BEGIN
  FOR v IN
    SELECT DISTINCT c.oid, n.nspname, c.relname, c.reloptions, pg_get_viewdef(c.oid, true) AS def
    FROM pg_depend d
    JOIN pg_rewrite r ON r.oid = d.objid
    JOIN pg_class c ON c.oid = r.ev_class
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
    WHERE d.refobjid = 'public."Attendance"'::regclass
      AND a.attname IN ('rpe', 'coachRpe')
      AND c.relkind = 'v'
  LOOP
    saved := saved || jsonb_build_object(
      'schema', v.nspname,
      'name', v.relname,
      'opts', COALESCE(array_to_string(v.reloptions, ', '), ''),
      'def', v.def,
      'grants', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('grantee', grantee, 'priv', privilege_type))
        FROM information_schema.role_table_grants
        WHERE table_schema = v.nspname AND table_name = v.relname
      ), '[]'::jsonb)
    );
    EXECUTE format('DROP VIEW %I.%I', v.nspname, v.relname);
  END LOOP;

  ALTER TABLE public."Attendance" DROP CONSTRAINT IF EXISTS "Attendance_coachRpe_check";
  ALTER TABLE public."Attendance" DROP CONSTRAINT IF EXISTS "Attendance_rpe_check";
  ALTER TABLE public."Attendance" ALTER COLUMN "rpe" TYPE NUMERIC(3,1) USING "rpe"::numeric;
  ALTER TABLE public."Attendance" ALTER COLUMN "coachRpe" TYPE NUMERIC(3,1) USING "coachRpe"::numeric;
  ALTER TABLE public."Attendance" ADD CONSTRAINT "Attendance_rpe_check"
    CHECK ("rpe" IS NULL OR ("rpe" BETWEEN 1 AND 10 AND "rpe" * 2 = trunc("rpe" * 2)));
  ALTER TABLE public."Attendance" ADD CONSTRAINT "Attendance_coachRpe_check"
    CHECK ("coachRpe" IS NULL OR ("coachRpe" BETWEEN 1 AND 10 AND "coachRpe" * 2 = trunc("coachRpe" * 2)));

  FOR item IN SELECT * FROM jsonb_array_elements(saved)
  LOOP
    EXECUTE format('CREATE VIEW %I.%I', item->>'schema', item->>'name')
      || CASE WHEN item->>'opts' = '' THEN '' ELSE ' WITH (' || (item->>'opts') || ')' END
      || ' AS ' || (item->>'def');
    FOR g IN SELECT * FROM jsonb_to_recordset(item->'grants') AS x(grantee TEXT, priv TEXT)
    LOOP
      EXECUTE format('GRANT %s ON %I.%I TO %I', g.priv, item->>'schema', item->>'name', g.grantee);
    END LOOP;
  END LOOP;
END $$;

COMMENT ON COLUMN public."Attendance"."rpe" IS 'Cansaço do treino (corpo e cabeça), 1–10 em meios pontos. Conta para a carga e o XP.';

CREATE TABLE IF NOT EXISTS public."LessonOccurrenceFocus" (
  "lessonId" TEXT NOT NULL REFERENCES public."Lesson"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "occurrenceDate" DATE NOT NULL,
  "focus" TEXT[] NOT NULL,
  "setByUserId" TEXT REFERENCES public."User"(id) ON DELETE SET NULL ON UPDATE CASCADE,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("lessonId", "occurrenceDate"),
  CONSTRAINT "LessonOccurrenceFocus_focus_check" CHECK (
    cardinality("focus") BETWEEN 1 AND 2
    AND "focus" <@ ARRAY['TECHNIQUE', 'TACTICS', 'SPARRING', 'PHYSICAL']::TEXT[]
  )
);

-- Só o servidor (service role) lê e escreve.
ALTER TABLE public."LessonOccurrenceFocus" ENABLE ROW LEVEL SECURITY;

COMMIT;
