-- Graduação: exame de nivelamento (aluno vindo de outra escola). O avaliador vai grau a grau,
-- desde o próximo grau do aluno, e avança enquanto ele cumprir o critério; o admin escolhe no
-- fim o grau a atribuir. Leitura e escrita só via service role (actions do servidor).

ALTER TABLE "GraduationExamCandidate"
  -- GRADE = exame normal (gradeId = grau-alvo); PLACEMENT = nivelamento (gradeId = último grau a ser
  -- avaliado; o grau atribuído fica em placementAwardedGradeId).
  ADD COLUMN IF NOT EXISTS "mode" TEXT NOT NULL DEFAULT 'GRADE' CHECK ("mode" IN ('GRADE', 'PLACEMENT')),
  -- Primeiro grau avaliado no nivelamento (o próximo grau do aluno quando foi definido).
  ADD COLUMN IF NOT EXISTS "placementStartGradeId" TEXT REFERENCES "GraduationGrade"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  -- Grau máximo a avaliar (opcional).
  ADD COLUMN IF NOT EXISTS "placementMaxGradeId" TEXT REFERENCES "GraduationGrade"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  -- Historial do aluno (ex.: «3 anos na Academia X»).
  ADD COLUMN IF NOT EXISTS "placementNote" TEXT,
  -- Grau atribuído na decisão (null = sem grau novo).
  ADD COLUMN IF NOT EXISTS "placementAwardedGradeId" TEXT REFERENCES "GraduationGrade"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  -- Motivo quando o grau atribuído é diferente da proposta da plataforma.
  ADD COLUMN IF NOT EXISTS "placementDecisionNote" TEXT;

ALTER TABLE "GraduationExamCandidate" DROP CONSTRAINT IF EXISTS "GraduationExamCandidate_placement_check";
ALTER TABLE "GraduationExamCandidate" ADD CONSTRAINT "GraduationExamCandidate_placement_check"
  CHECK ("mode" = 'GRADE' OR "placementStartGradeId" IS NOT NULL);

-- Graus abaixo do atribuído num nivelamento ficam com origem PLACEMENT («obtido por nivelamento»).
ALTER TABLE "StudentGrade" DROP CONSTRAINT IF EXISTS "StudentGrade_source_check";
ALTER TABLE "StudentGrade" ADD CONSTRAINT "StudentGrade_source_check"
  CHECK ("source" IN ('EXAM', 'MIGRATION', 'MANUAL', 'SKIPPED', 'PLACEMENT'));

-- XP: um nivelamento sem grau atribuído (FAILED) não dá o XP de «exame feito»; aprovado dá o XP
-- normal de exame aprovado pelo grau ATRIBUÍDO. Redefine a vista a partir da definição em produção,
-- trocando só a condição e o grau do bloco dos exames (e mantendo as opções da vista).
DO $$
DECLARE
  def TEXT;
  opts TEXT[];
  old_where CONSTANT TEXT := $q$WHERE (gc.status = ANY (ARRAY['PASSED'::text, 'FAILED'::text])) AND gc."decidedAt" IS NOT NULL$q$;
  new_where CONSTANT TEXT := $q$WHERE (gc.status = 'PASSED'::text OR gc.status = 'FAILED'::text AND gc.mode = 'GRADE'::text) AND gc."decidedAt" IS NOT NULL$q$;
  old_join CONSTANT TEXT := $q$JOIN "GraduationGrade" g ON g.id = gc."gradeId"$q$;
  new_join CONSTANT TEXT := $q$JOIN "GraduationGrade" g ON g.id = COALESCE(gc."placementAwardedGradeId", gc."gradeId")$q$;
BEGIN
  def := pg_get_viewdef('"StudentXpEvent"'::regclass, true);
  IF position('gc.mode' IN def) > 0 THEN
    RETURN;
  END IF;
  IF position(old_where IN def) = 0
     OR (length(def) - length(replace(def, old_join, ''))) / length(old_join) <> 1 THEN
    RAISE EXCEPTION 'StudentXpEvent: bloco dos exames não encontrado como esperado';
  END IF;
  SELECT reloptions INTO opts FROM pg_class WHERE oid = '"StudentXpEvent"'::regclass;
  EXECUTE 'CREATE OR REPLACE VIEW "StudentXpEvent"'
    || CASE WHEN opts IS NULL THEN '' ELSE ' WITH (' || array_to_string(opts, ', ') || ')' END
    || ' AS ' || replace(replace(def, old_where, new_where), old_join, new_join);
END $$;
