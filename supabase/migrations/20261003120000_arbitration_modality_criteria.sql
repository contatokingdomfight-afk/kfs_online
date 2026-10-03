-- Arbitragem: suporta Kickboxing como modalidade e critérios por combate (em vez de só por evento),
-- para permitir eventos com combates de modalidades diferentes, cada um com o seu perfil de pontuação.

ALTER TYPE "ArbitrationModality" ADD VALUE IF NOT EXISTS 'KICKBOXING';

ALTER TABLE "ArbitrationCriteriaSet"
  ADD COLUMN IF NOT EXISTS "modalityCode" TEXT;

ALTER TABLE "ArbitrationFight"
  ADD COLUMN IF NOT EXISTS "criteriaSetId" TEXT REFERENCES "ArbitrationCriteriaSet"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD COLUMN IF NOT EXISTS "criteriaSnapshot" JSONB;

-- Combates já existentes herdam o snapshot do evento (até aqui, era o único nível de critérios).
UPDATE "ArbitrationFight" f
SET "criteriaSetId" = e."criteriaSetId",
    "criteriaSnapshot" = e."criteriaSnapshot"
FROM "ArbitrationEvent" e
WHERE f."eventId" = e."id"
  AND f."criteriaSnapshot" IS NULL;

CREATE INDEX IF NOT EXISTS "ArbitrationFight_criteriaSet_idx" ON "ArbitrationFight" ("criteriaSetId") WHERE "criteriaSetId" IS NOT NULL;
