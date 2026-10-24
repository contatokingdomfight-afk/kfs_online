-- Graduação: (1) prontidão manual do admin por aluno/modalidade; (2) exame para um grau acima do próximo
-- (salto de grau). Leitura e escrita só via service role (actions do servidor) — sem políticas.

-- (1) Decisão manual que se sobrepõe aos requisitos automáticos:
--     READY = pode fazer exame mesmo sem cumprir tudo; NOT_READY = ainda não, mesmo cumprindo os números.
--     Sem linha = automático. validUntil (opcional): depois desse dia volta a automático.
CREATE TABLE IF NOT EXISTS "StudentGraduationReadiness" (
  "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "modalityCode" TEXT NOT NULL REFERENCES "ModalityRef"("code") ON DELETE CASCADE ON UPDATE CASCADE,
  "status" TEXT NOT NULL CHECK ("status" IN ('READY', 'NOT_READY')),
  -- Mostrado ao aluno.
  "reason" TEXT NOT NULL CHECK (length(trim("reason")) > 0),
  "validUntil" DATE,
  "setByUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("studentId", "modalityCode")
);

ALTER TABLE "StudentGraduationReadiness" ENABLE ROW LEVEL SECURITY;

-- (2) Salto de grau: a convocatória pode ser para um grau acima do próximo (gradeId = grau-alvo).
--     skipReason preenchido = salto decidido pelo admin (requisitos do grau-alvo dispensados).
ALTER TABLE "GraduationExamCandidate" ADD COLUMN IF NOT EXISTS "skipReason" TEXT;

-- Ao aprovar com salto, os graus intermédios ficam registados com origem SKIPPED (não dão XP:
-- o XP do exame vem de GraduationExamCandidate, uma vez por exame).
ALTER TABLE "StudentGrade" DROP CONSTRAINT IF EXISTS "StudentGrade_source_check";
ALTER TABLE "StudentGrade" ADD CONSTRAINT "StudentGrade_source_check" CHECK ("source" IN ('EXAM', 'MIGRATION', 'MANUAL', 'SKIPPED'));
