-- Graduação por modalidade (fase 1): template de graus configurável pelo admin.
-- Cada modalidade tem um template com N graus; cada grau define o que o aluno precisa para o
-- OBTER: itens avaliados nos 4 eixos (Técnico, Tático, Teórico, Físico), cursos da plataforma,
-- requisitos manuais (ex.: estágio) e tempo mínimo na modalidade.
-- O grau do aluno (StudentGrade) passa a vir do exame de graduação (fases seguintes).

CREATE TABLE IF NOT EXISTS "GraduationTemplate" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "modalityCode" TEXT NOT NULL UNIQUE REFERENCES "ModalityRef"("code") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  -- Um mês conta para o "tempo acumulado" quando o aluno tem pelo menos N presenças na modalidade.
  "monthlyMinAttendances" INTEGER NOT NULL DEFAULT 4 CHECK ("monthlyMinAttendances" BETWEEN 1 AND 31),
  "updatedByUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "GraduationGrade" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "templateId" TEXT NOT NULL REFERENCES "GraduationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "sortOrder" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "subtitle" TEXT,
  "motto" TEXT,
  "objective" TEXT,
  "notes" TEXT,
  "colors" TEXT[] NOT NULL DEFAULT '{}',
  -- Meses mínimos desde o grau anterior; o acumulado é a soma até este grau.
  "minMonths" INTEGER NOT NULL DEFAULT 0 CHECK ("minMonths" >= 0),
  -- Pré-requisitos para ficar "apto para exame" (null = não exigido).
  "minAttendances" INTEGER CHECK ("minAttendances" IS NULL OR "minAttendances" >= 0),
  "minPerformanceAvg" NUMERIC(3,2) CHECK ("minPerformanceAvg" IS NULL OR "minPerformanceAvg" BETWEEN 1 AND 5),
  "physicalAssessmentMaxAgeMonths" INTEGER CHECK ("physicalAssessmentMaxAgeMonths" IS NULL OR "physicalAssessmentMaxAgeMonths" > 0),
  -- Critério de aprovação no exame: média mínima (1–5) em cada eixo.
  "passMinAxisAvg" NUMERIC(3,2) NOT NULL DEFAULT 3 CHECK ("passMinAxisAvg" BETWEEN 1 AND 5),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "GraduationGrade_template_order_key" UNIQUE ("templateId", "sortOrder") DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS "GraduationItem" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "gradeId" TEXT NOT NULL REFERENCES "GraduationGrade"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "axis" TEXT NOT NULL CHECK ("axis" IN ('TECNICO', 'TATICO', 'TEORICO', 'FISICO')),
  "label" TEXT NOT NULL,
  "description" TEXT,
  -- Item crítico: precisa de nota mínima individual no exame, além da média do eixo.
  "isCritical" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "GraduationItem_grade_idx" ON "GraduationItem" ("gradeId", "axis", "sortOrder");

CREATE TABLE IF NOT EXISTS "GraduationGradeCourse" (
  "gradeId" TEXT NOT NULL REFERENCES "GraduationGrade"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "courseId" TEXT NOT NULL REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  -- false = curso recomendado (não bloqueia o exame).
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY ("gradeId", "courseId")
);

-- Requisitos fora da plataforma, validados manualmente pelo admin (ex.: "Ter feito estágio conosco").
CREATE TABLE IF NOT EXISTS "GraduationRequirement" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "gradeId" TEXT NOT NULL REFERENCES "GraduationGrade"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "label" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "GraduationRequirement_grade_idx" ON "GraduationRequirement" ("gradeId", "sortOrder");

-- Histórico de graus do aluno por modalidade; o grau atual é o registo mais recente.
CREATE TABLE IF NOT EXISTS "StudentGrade" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "modalityCode" TEXT NOT NULL REFERENCES "ModalityRef"("code") ON DELETE CASCADE ON UPDATE CASCADE,
  -- RESTRICT: um grau atribuído a alunos não pode ser apagado do template.
  "gradeId" TEXT NOT NULL REFERENCES "GraduationGrade"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "source" TEXT NOT NULL CHECK ("source" IN ('EXAM', 'MIGRATION', 'MANUAL')),
  "awardedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "awardedByUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "StudentGrade_student_modality_idx" ON "StudentGrade" ("studentId", "modalityCode", "awardedAt" DESC);

-- RLS: leitura para autenticados; escrita só via service role (actions do admin).
ALTER TABLE "GraduationTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GraduationGrade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GraduationItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GraduationGradeCourse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GraduationRequirement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentGrade" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "graduation_template_read" ON "GraduationTemplate";
CREATE POLICY "graduation_template_read" ON "GraduationTemplate" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "graduation_grade_read" ON "GraduationGrade";
CREATE POLICY "graduation_grade_read" ON "GraduationGrade" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "graduation_item_read" ON "GraduationItem";
CREATE POLICY "graduation_item_read" ON "GraduationItem" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "graduation_grade_course_read" ON "GraduationGradeCourse";
CREATE POLICY "graduation_grade_course_read" ON "GraduationGradeCourse" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "graduation_requirement_read" ON "GraduationRequirement";
CREATE POLICY "graduation_requirement_read" ON "GraduationRequirement" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "student_grade_read" ON "StudentGrade";
CREATE POLICY "student_grade_read" ON "StudentGrade" FOR SELECT TO authenticated USING (true);

-- Guarda o template inteiro numa transação (o editor envia o estado completo).
-- Linhas com id existente são atualizadas, novas são inseridas e as que faltam no payload são apagadas.
-- Apagar um grau já atribuído a alunos falha (FK RESTRICT em StudentGrade).
CREATE OR REPLACE FUNCTION public.save_graduation_template(p_payload JSONB, p_user_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_template_id TEXT;
  v_grade JSONB;
  v_item JSONB;
  v_req JSONB;
  v_course JSONB;
  v_grade_ids TEXT[];
  v_item_ids TEXT[];
  v_req_ids TEXT[];
  v_order INT := 0;
  v_sub_order INT;
BEGIN
  INSERT INTO "GraduationTemplate" ("modalityCode", "name", "isPublished", "monthlyMinAttendances", "updatedByUserId", "updatedAt")
  VALUES (
    p_payload->>'modalityCode',
    p_payload->>'name',
    COALESCE((p_payload->>'isPublished')::BOOLEAN, false),
    COALESCE((p_payload->>'monthlyMinAttendances')::INT, 4),
    p_user_id,
    now()
  )
  ON CONFLICT ("modalityCode") DO UPDATE SET
    "name" = EXCLUDED."name",
    "isPublished" = EXCLUDED."isPublished",
    "monthlyMinAttendances" = EXCLUDED."monthlyMinAttendances",
    "updatedByUserId" = EXCLUDED."updatedByUserId",
    "updatedAt" = now()
  RETURNING "id" INTO v_template_id;

  SELECT COALESCE(array_agg(g->>'id'), '{}') INTO v_grade_ids
  FROM jsonb_array_elements(COALESCE(p_payload->'grades', '[]'::jsonb)) g;

  SELECT COALESCE(array_agg(i->>'id'), '{}') INTO v_item_ids
  FROM jsonb_array_elements(COALESCE(p_payload->'grades', '[]'::jsonb)) g,
       jsonb_array_elements(COALESCE(g->'items', '[]'::jsonb)) i;

  SELECT COALESCE(array_agg(r->>'id'), '{}') INTO v_req_ids
  FROM jsonb_array_elements(COALESCE(p_payload->'grades', '[]'::jsonb)) g,
       jsonb_array_elements(COALESCE(g->'requirements', '[]'::jsonb)) r;

  -- Ids que já existem noutro template não podem ser "roubados" por este payload.
  IF EXISTS (
    SELECT 1 FROM "GraduationGrade" WHERE "id" = ANY (v_grade_ids) AND "templateId" <> v_template_id
  ) OR EXISTS (
    SELECT 1 FROM "GraduationItem" i JOIN "GraduationGrade" gr ON gr."id" = i."gradeId"
    WHERE i."id" = ANY (v_item_ids) AND gr."templateId" <> v_template_id
  ) OR EXISTS (
    SELECT 1 FROM "GraduationRequirement" r JOIN "GraduationGrade" gr ON gr."id" = r."gradeId"
    WHERE r."id" = ANY (v_req_ids) AND gr."templateId" <> v_template_id
  ) THEN
    RAISE EXCEPTION 'graduation_template_foreign_ids';
  END IF;

  DELETE FROM "GraduationGrade" WHERE "templateId" = v_template_id AND NOT ("id" = ANY (v_grade_ids));

  FOR v_grade IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'grades', '[]'::jsonb)) LOOP
    INSERT INTO "GraduationGrade" (
      "id", "templateId", "sortOrder", "name", "subtitle", "motto", "objective", "notes", "colors",
      "minMonths", "minAttendances", "minPerformanceAvg", "physicalAssessmentMaxAgeMonths", "passMinAxisAvg", "updatedAt"
    ) VALUES (
      v_grade->>'id',
      v_template_id,
      v_order,
      v_grade->>'name',
      v_grade->>'subtitle',
      v_grade->>'motto',
      v_grade->>'objective',
      v_grade->>'notes',
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_grade->'colors', '[]'::jsonb))),
      COALESCE((v_grade->>'minMonths')::INT, 0),
      (v_grade->>'minAttendances')::INT,
      (v_grade->>'minPerformanceAvg')::NUMERIC,
      (v_grade->>'physicalAssessmentMaxAgeMonths')::INT,
      COALESCE((v_grade->>'passMinAxisAvg')::NUMERIC, 3),
      now()
    )
    ON CONFLICT ("id") DO UPDATE SET
      "sortOrder" = EXCLUDED."sortOrder",
      "name" = EXCLUDED."name",
      "subtitle" = EXCLUDED."subtitle",
      "motto" = EXCLUDED."motto",
      "objective" = EXCLUDED."objective",
      "notes" = EXCLUDED."notes",
      "colors" = EXCLUDED."colors",
      "minMonths" = EXCLUDED."minMonths",
      "minAttendances" = EXCLUDED."minAttendances",
      "minPerformanceAvg" = EXCLUDED."minPerformanceAvg",
      "physicalAssessmentMaxAgeMonths" = EXCLUDED."physicalAssessmentMaxAgeMonths",
      "passMinAxisAvg" = EXCLUDED."passMinAxisAvg",
      "updatedAt" = now();
    v_order := v_order + 1;

    -- Itens
    DELETE FROM "GraduationItem"
    WHERE "gradeId" = v_grade->>'id' AND NOT ("id" = ANY (v_item_ids));
    v_sub_order := 0;
    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_grade->'items', '[]'::jsonb)) LOOP
      INSERT INTO "GraduationItem" ("id", "gradeId", "axis", "label", "description", "isCritical", "sortOrder")
      VALUES (
        v_item->>'id',
        v_grade->>'id',
        v_item->>'axis',
        v_item->>'label',
        v_item->>'description',
        COALESCE((v_item->>'isCritical')::BOOLEAN, false),
        v_sub_order
      )
      ON CONFLICT ("id") DO UPDATE SET
        "gradeId" = EXCLUDED."gradeId",
        "axis" = EXCLUDED."axis",
        "label" = EXCLUDED."label",
        "description" = EXCLUDED."description",
        "isCritical" = EXCLUDED."isCritical",
        "sortOrder" = EXCLUDED."sortOrder";
      v_sub_order := v_sub_order + 1;
    END LOOP;

    -- Requisitos manuais
    DELETE FROM "GraduationRequirement"
    WHERE "gradeId" = v_grade->>'id' AND NOT ("id" = ANY (v_req_ids));
    v_sub_order := 0;
    FOR v_req IN SELECT * FROM jsonb_array_elements(COALESCE(v_grade->'requirements', '[]'::jsonb)) LOOP
      INSERT INTO "GraduationRequirement" ("id", "gradeId", "label", "sortOrder")
      VALUES (v_req->>'id', v_grade->>'id', v_req->>'label', v_sub_order)
      ON CONFLICT ("id") DO UPDATE SET
        "gradeId" = EXCLUDED."gradeId",
        "label" = EXCLUDED."label",
        "sortOrder" = EXCLUDED."sortOrder";
      v_sub_order := v_sub_order + 1;
    END LOOP;

    -- Cursos (sem referências externas: substitui o conjunto)
    DELETE FROM "GraduationGradeCourse" WHERE "gradeId" = v_grade->>'id';
    FOR v_course IN SELECT * FROM jsonb_array_elements(COALESCE(v_grade->'courses', '[]'::jsonb)) LOOP
      INSERT INTO "GraduationGradeCourse" ("gradeId", "courseId", "isRequired")
      VALUES (v_grade->>'id', v_course->>'courseId', COALESCE((v_course->>'isRequired')::BOOLEAN, true))
      ON CONFLICT ("gradeId", "courseId") DO UPDATE SET "isRequired" = EXCLUDED."isRequired";
    END LOOP;
  END LOOP;

  RETURN v_template_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_graduation_template(JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_graduation_template(JSONB, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_graduation_template(JSONB, TEXT) TO service_role;
