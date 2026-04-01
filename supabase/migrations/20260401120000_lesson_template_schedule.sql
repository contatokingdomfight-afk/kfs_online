-- Modelo: uma linha em Lesson por definição (recorrente = weekday + horários; única = date).
-- Ocorrências virtuais na app; cancelamentos por semana em LessonCancellation.
-- Presenças: (lessonId, studentId, occurrenceDate).

ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "weekday" INTEGER;

ALTER TABLE "Lesson" ALTER COLUMN "date" DROP NOT NULL;

-- Validação one-off vs recorrente fica na app (evita falhar com dados legados).

CREATE TABLE IF NOT EXISTS "LessonCancellation" (
  "id" TEXT PRIMARY KEY,
  "lessonId" TEXT NOT NULL REFERENCES "Lesson"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE ("lessonId", "date")
);

CREATE TABLE IF NOT EXISTS "LessonCoach" (
  "lessonId" TEXT NOT NULL REFERENCES "Lesson"("id") ON DELETE CASCADE,
  "coachId" TEXT NOT NULL REFERENCES "Coach"("id") ON DELETE CASCADE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("lessonId", "coachId")
);

CREATE INDEX IF NOT EXISTS "LessonCancellation_lessonId_idx" ON "LessonCancellation" ("lessonId");

INSERT INTO "LessonCoach" ("lessonId", "coachId", "sortOrder")
SELECT "id", "coachId", 0 FROM "Lesson"
WHERE NOT EXISTS (SELECT 1 FROM "LessonCoach" lc WHERE lc."lessonId" = "Lesson"."id")
ON CONFLICT ("lessonId", "coachId") DO NOTHING;

ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "occurrenceDate" DATE;

UPDATE "Attendance" a
SET "occurrenceDate" = l."date"::date
FROM "Lesson" l
WHERE a."lessonId" = l.id
  AND a."occurrenceDate" IS NULL
  AND l."date" IS NOT NULL;

DELETE FROM "Attendance" WHERE "occurrenceDate" IS NULL;

ALTER TABLE "Attendance" ALTER COLUMN "occurrenceDate" SET NOT NULL;

ALTER TABLE "Attendance" DROP CONSTRAINT IF EXISTS "Attendance_lessonId_studentId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_lesson_student_occurrence_unique"
  ON "Attendance" ("lessonId", "studentId", "occurrenceDate");

ALTER TABLE "LessonCancellation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LessonCoach" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_authenticated" ON "LessonCancellation";
CREATE POLICY "allow_authenticated" ON "LessonCancellation" FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_authenticated" ON "LessonCoach";
CREATE POLICY "allow_authenticated" ON "LessonCoach" FOR ALL TO authenticated USING (true) WITH CHECK (true);
