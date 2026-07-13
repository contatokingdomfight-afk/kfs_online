-- Perfis de critérios de arbitragem (personalizáveis por evento).

CREATE TABLE IF NOT EXISTS "ArbitrationCriteriaSet" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "name" TEXT NOT NULL,
  "criteria" JSONB NOT NULL,
  "isBuiltin" BOOLEAN NOT NULL DEFAULT false,
  "createdByUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "ArbitrationEvent"
  ADD COLUMN IF NOT EXISTS "criteriaSetId" TEXT REFERENCES "ArbitrationCriteriaSet"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD COLUMN IF NOT EXISTS "criteriaSnapshot" JSONB;

ALTER TABLE "ArbitrationRoundEvaluation"
  ADD COLUMN IF NOT EXISTS "criteriaScoresJson" JSONB;

CREATE INDEX IF NOT EXISTS "ArbitrationCriteriaSet_builtin_idx" ON "ArbitrationCriteriaSet" ("isBuiltin");

ALTER TABLE "ArbitrationCriteriaSet" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "arbitration_criteria_set_authenticated" ON "ArbitrationCriteriaSet";
CREATE POLICY "arbitration_criteria_set_authenticated" ON "ArbitrationCriteriaSet" FOR ALL TO authenticated USING (true) WITH CHECK (true);
