-- Tema da semana pode apontar para uma aula específica da biblioteca (CourseUnit),
-- além do curso inteiro e/ou de um link de vídeo avulso. Os três podem coexistir.
ALTER TABLE "WeekTheme" ADD COLUMN IF NOT EXISTS "unit_id" TEXT REFERENCES "CourseUnit"("id") ON DELETE SET NULL;

COMMENT ON COLUMN "WeekTheme"."unit_id" IS 'Aula específica (CourseUnit) do curso associado, para levar o aluno direto à aula em vez de só ao curso.';
