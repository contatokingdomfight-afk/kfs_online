-- Peso pós-treino opcional ligado à presença (complementa BodyWeightEntry / RPE).

ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "postWeightKg" NUMERIC(5, 2);
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "postWeightRecordedAt" TIMESTAMPTZ;

COMMENT ON COLUMN "Attendance"."postWeightKg" IS 'Peso corporal (kg) registado após a aula, opcional.';
COMMENT ON COLUMN "Attendance"."postWeightRecordedAt" IS 'Momento do registo de peso pós-treino.';
