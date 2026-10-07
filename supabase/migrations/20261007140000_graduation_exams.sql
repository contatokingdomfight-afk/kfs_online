-- Graduação (fase 3): eventos de exame, convocatória, avaliação e resultado.
-- O exame é cumulativo: itens novos do grau avaliados um a um; graus anteriores com uma nota
-- por eixo (revisão) + os itens críticos dos graus anteriores individualmente.
-- Leitura e escrita só via service role (actions do servidor) — sem políticas para authenticated.

CREATE TABLE IF NOT EXISTS "GraduationExamEvent" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "modalityCode" TEXT NOT NULL REFERENCES "ModalityRef"("code") ON DELETE CASCADE ON UPDATE CASCADE,
  "title" TEXT NOT NULL,
  "scheduledAt" TIMESTAMPTZ NOT NULL,
  "location" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK ("status" IN ('SCHEDULED', 'COMPLETED', 'CANCELLED')),
  "createdByUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "GraduationExamEvent_modality_date_idx" ON "GraduationExamEvent" ("modalityCode", "scheduledAt" DESC);

CREATE TABLE IF NOT EXISTS "GraduationExamCandidate" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "eventId" TEXT NOT NULL REFERENCES "GraduationExamEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  -- Grau a que o aluno se propõe (o próximo no momento da convocatória).
  "gradeId" TEXT NOT NULL REFERENCES "GraduationGrade"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "status" TEXT NOT NULL DEFAULT 'CONVOKED' CHECK ("status" IN ('CONVOKED', 'PASSED', 'FAILED', 'ABSENT')),
  "feedback" TEXT,
  -- Resumo calculado no momento da decisão (médias por eixo, itens críticos), imune a edições futuras do template.
  "result" JSONB,
  "decidedAt" TIMESTAMPTZ,
  "decidedByUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "studentGradeId" TEXT REFERENCES "StudentGrade"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "GraduationExamCandidate_event_student_key" UNIQUE ("eventId", "studentId")
);

CREATE INDEX IF NOT EXISTS "GraduationExamCandidate_student_idx" ON "GraduationExamCandidate" ("studentId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "GraduationExamScore" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "candidateId" TEXT NOT NULL REFERENCES "GraduationExamCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "examinerUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  -- Id do item (NEW / REVIEW_ITEM) ou "review:<EIXO>" (REVIEW_AXIS).
  "scoreKey" TEXT NOT NULL,
  "section" TEXT NOT NULL CHECK ("section" IN ('NEW', 'REVIEW_ITEM', 'REVIEW_AXIS')),
  "axis" TEXT NOT NULL CHECK ("axis" IN ('TECNICO', 'TATICO', 'TEORICO', 'FISICO')),
  -- Cópia do texto do item no momento do exame (o template pode mudar depois).
  "label" TEXT NOT NULL,
  "isCritical" BOOLEAN NOT NULL DEFAULT false,
  "score" SMALLINT CHECK ("score" IS NULL OR "score" BETWEEN 1 AND 5),
  "comment" TEXT,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "GraduationExamScore_candidate_examiner_key" UNIQUE ("candidateId", "examinerUserId", "scoreKey")
);

CREATE INDEX IF NOT EXISTS "GraduationExamScore_candidate_idx" ON "GraduationExamScore" ("candidateId");

ALTER TABLE "GraduationExamEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GraduationExamCandidate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GraduationExamScore" ENABLE ROW LEVEL SECURITY;
