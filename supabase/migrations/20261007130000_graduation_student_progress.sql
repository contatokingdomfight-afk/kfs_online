-- Graduação (fase 2): progresso do aluno.
-- 1) A média de performance das avaliações dos treinadores usa a escala 1–10 (radar), não 1–5.
-- 2) Registo dos requisitos manuais cumpridos por aluno (ex.: "Ter feito estágio conosco"),
--    validados pelo admin.

ALTER TABLE "GraduationGrade" DROP CONSTRAINT IF EXISTS "GraduationGrade_minPerformanceAvg_check";
ALTER TABLE "GraduationGrade" ALTER COLUMN "minPerformanceAvg" TYPE NUMERIC(4,2);
ALTER TABLE "GraduationGrade" ADD CONSTRAINT "GraduationGrade_minPerformanceAvg_check"
  CHECK ("minPerformanceAvg" IS NULL OR "minPerformanceAvg" BETWEEN 1 AND 10);

CREATE TABLE IF NOT EXISTS "StudentGraduationRequirement" (
  "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "requirementId" TEXT NOT NULL REFERENCES "GraduationRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "fulfilledAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "fulfilledByUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  PRIMARY KEY ("studentId", "requirementId")
);

ALTER TABLE "StudentGraduationRequirement" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_graduation_requirement_read" ON "StudentGraduationRequirement";
CREATE POLICY "student_graduation_requirement_read" ON "StudentGraduationRequirement" FOR SELECT TO authenticated USING (true);
