ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "isCrossModality" BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN "Attendance"."isCrossModality" IS 'Check-in avulso: aluno de outra modalidade/plano, marcado manualmente pelo professor.';
