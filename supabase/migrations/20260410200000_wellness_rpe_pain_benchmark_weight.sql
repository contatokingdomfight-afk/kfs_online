-- Pré-treino (sono, hidratação, stress, fadiga), RPE pós-treino, dor, benchmarks, histórico de peso e metas.

CREATE TYPE "WellnessZone" AS ENUM ('GREEN', 'YELLOW', 'RED');

CREATE TABLE "PreLessonWellness" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "studentId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "occurrenceDate" DATE NOT NULL,
  "sleepHours" NUMERIC(4,2) NOT NULL,
  "sleepQuality" SMALLINT NOT NULL,
  "hydrationOk" BOOLEAN NOT NULL,
  "stress" SMALLINT NOT NULL,
  "fatigue" SMALLINT NOT NULL,
  "wellnessZone" "WellnessZone" NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PreLessonWellness_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PreLessonWellness_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PreLessonWellness_student_lesson_occ_unique" UNIQUE ("studentId", "lessonId", "occurrenceDate")
);

COMMENT ON TABLE "PreLessonWellness" IS 'Questionário pré-treino (check-in): sono, hidratação, stress, fadiga e zona verde/amarelo/vermelho.';

ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "rpe" SMALLINT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "rpeRecordedAt" TIMESTAMPTZ;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "countsForGamification" BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN "Attendance"."rpe" IS 'Escala de esforço percebido 1–10 (pós-treino).';
COMMENT ON COLUMN "Attendance"."rpeRecordedAt" IS 'Quando o aluno registou o RPE.';
COMMENT ON COLUMN "Attendance"."countsForGamification" IS 'Se false, esta presença não conta para badges/estatísticas (ex.: wellness vermelho).';

CREATE TABLE "PainSelfReport" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "studentId" TEXT NOT NULL,
  "bodyRegion" TEXT NOT NULL,
  "intensity" SMALLINT NOT NULL,
  "notes" TEXT,
  "reportedAt" DATE NOT NULL DEFAULT CURRENT_DATE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PainSelfReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

COMMENT ON TABLE "PainSelfReport" IS 'Autorrelato de dor por zona corporal (1–10).';

CREATE TABLE "PhysicalBenchmarkEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "studentId" TEXT NOT NULL,
  "benchmarkKey" TEXT NOT NULL,
  "value" NUMERIC NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'reps',
  "recordedAt" DATE NOT NULL DEFAULT CURRENT_DATE,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PhysicalBenchmarkEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

COMMENT ON TABLE "PhysicalBenchmarkEntry" IS 'Testes físicos periódicos (flexões, prancha, etc.).';

CREATE TABLE "BodyWeightEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "studentId" TEXT NOT NULL,
  "weightKg" NUMERIC(5,2) NOT NULL,
  "recordedAt" DATE NOT NULL DEFAULT CURRENT_DATE,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "BodyWeightEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

COMMENT ON TABLE "BodyWeightEntry" IS 'Histórico de peso para tendência e metas.';

ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "weightGoalKg" NUMERIC(5,2);
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "weightGoalTargetDate" DATE;

COMMENT ON COLUMN "StudentProfile"."weightGoalKg" IS 'Meta de peso (kg), opcional.';
COMMENT ON COLUMN "StudentProfile"."weightGoalTargetDate" IS 'Data alvo opcional para a meta de peso.';

ALTER TABLE "PreLessonWellness" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PainSelfReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PhysicalBenchmarkEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BodyWeightEntry" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_authenticated" ON "PreLessonWellness" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "PainSelfReport" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "PhysicalBenchmarkEntry" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "BodyWeightEntry" FOR ALL TO authenticated USING (true) WITH CHECK (true);
