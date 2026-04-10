-- Faixa exibida e tempo mínimo na faixa antes de promover (além do XP).
-- displayBeltIndex alinhado com lib/belts getBeltIndexFromXp; lastBeltPromotionAt = "entrada" na faixa atual para a trava temporal.

ALTER TABLE "Athlete" ADD COLUMN IF NOT EXISTS "displayBeltIndex" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Athlete" ADD COLUMN IF NOT EXISTS "lastBeltPromotionAt" TIMESTAMPTZ;

UPDATE "Athlete"
SET
  "lastBeltPromotionAt" = NOW(),
  "displayBeltIndex" = CASE
    WHEN COALESCE("xp", 0) <= 0 THEN 0
    ELSE FLOOR(LN((COALESCE("xp", 0)::FLOAT8 / 1000.0) + 1) / LN(2))::INT
  END
WHERE "lastBeltPromotionAt" IS NULL;
