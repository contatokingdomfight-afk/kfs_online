ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "statusChangedAt" TIMESTAMPTZ;
COMMENT ON COLUMN "Student"."statusChangedAt" IS 'Última mudança de status (para churn real); nulo = nunca mudou desde esta migração.';
