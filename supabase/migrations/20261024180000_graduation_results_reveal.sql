-- Graduação: resultados revelados numa data definida por dia de exame. A decisão do coach/admin fica
-- guardada mas só é aplicada (grau, XP, ranking, notificação, página do resultado) na data de revelação.
-- Sem data definida, os resultados ficam escondidos até alguém a pôr ou carregar em «Revelar agora».

-- Data/hora a partir da qual os resultados deste dia de exame ficam visíveis aos alunos (null = escondidos).
ALTER TABLE "GraduationExamEvent" ADD COLUMN IF NOT EXISTS "resultsRevealAt" TIMESTAMPTZ;

ALTER TABLE "GraduationExamCandidate"
  -- Quando o resultado foi revelado ao aluno (null = decidido mas ainda escondido, ou por decidir).
  ADD COLUMN IF NOT EXISTS "revealedAt" TIMESTAMPTZ,
  -- Graus a atribuir na revelação, por ordem: [{ "gradeId", "source", "notes" }] (o último é o grau final).
  ADD COLUMN IF NOT EXISTS "pendingGrades" JSONB;

-- Resultados já decididos antes desta funcionalidade: ficam revelados (já eram visíveis).
UPDATE "GraduationExamCandidate"
SET "revealedAt" = "decidedAt"
WHERE "status" IN ('PASSED', 'FAILED', 'ABSENT') AND "decidedAt" IS NOT NULL AND "revealedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "GraduationExamCandidate_unrevealed_idx"
  ON "GraduationExamCandidate" ("eventId")
  WHERE "revealedAt" IS NULL AND "status" IN ('PASSED', 'FAILED', 'ABSENT');

-- XP: um exame só conta depois de revelado. Redefine a vista a partir da definição em produção,
-- acrescentando a condição ao bloco dos exames (e mantendo as opções da vista).
DO $$
DECLARE
  def TEXT;
  opts TEXT[];
  old_where CONSTANT TEXT := $q$WHERE (gc.status = 'PASSED'::text OR gc.status = 'FAILED'::text AND gc.mode = 'GRADE'::text) AND gc."decidedAt" IS NOT NULL$q$;
  new_where CONSTANT TEXT := $q$WHERE (gc.status = 'PASSED'::text OR gc.status = 'FAILED'::text AND gc.mode = 'GRADE'::text) AND gc."decidedAt" IS NOT NULL AND gc."revealedAt" IS NOT NULL$q$;
BEGIN
  def := pg_get_viewdef('"StudentXpEvent"'::regclass, true);
  IF position('gc."revealedAt"' IN def) > 0 THEN
    RETURN;
  END IF;
  IF position(old_where IN def) = 0 THEN
    RAISE EXCEPTION 'StudentXpEvent: bloco dos exames não encontrado como esperado';
  END IF;
  SELECT reloptions INTO opts FROM pg_class WHERE oid = '"StudentXpEvent"'::regclass;
  EXECUTE 'CREATE OR REPLACE VIEW "StudentXpEvent"'
    || CASE WHEN opts IS NULL THEN '' ELSE ' WITH (' || array_to_string(opts, ', ') || ')' END
    || ' AS ' || replace(def, old_where, new_where);
END $$;
