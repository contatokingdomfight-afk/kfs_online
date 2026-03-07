-- Envergadura (reach) do aluno em cm – útil para artes marciais
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "reachCm" numeric;
COMMENT ON COLUMN "StudentProfile"."reachCm" IS 'Envergadura (reach) em cm.';
