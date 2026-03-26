-- Aula livre: permite participação/check-in de alunos de qualquer modalidade da escola
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "isOpenClass" boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN "Lesson"."isOpenClass" IS 'Quando true, a aula fica aberta para alunos de qualquer modalidade da escola (mantendo regras de plano/check-in).';