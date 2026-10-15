-- RPE do professor guardado à parte: a nota que conta (rpe) segue a regra de sempre (aluno prevalece),
-- mas a do professor deixa de se perder quando o aluno responde — permite comparar o que o aluno
-- sentiu com o que o professor viu.
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "coachRpe" SMALLINT;
ALTER TABLE "Attendance" DROP CONSTRAINT IF EXISTS "Attendance_coachRpe_check";
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_coachRpe_check" CHECK ("coachRpe" IS NULL OR ("coachRpe" BETWEEN 1 AND 10));

-- Notas do professor que já existem (ainda não substituídas pelo aluno).
UPDATE "Attendance" SET "coachRpe" = "rpe" WHERE "rpeSource" = 'COACH' AND "rpe" IS NOT NULL AND "coachRpe" IS NULL;
