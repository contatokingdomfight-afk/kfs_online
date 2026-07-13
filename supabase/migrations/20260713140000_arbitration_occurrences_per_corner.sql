-- Ocorrências por canto (azul/vermelho) e desconto explícito no placar oficial.

ALTER TABLE "ArbitrationRoundOccurrence"
  ADD COLUMN IF NOT EXISTS "blueIllegalStrike" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "redIllegalStrike" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "blueVerbalWarning" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "redVerbalWarning" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "bluePointDeduction" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "redPointDeduction" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "blueKnockdown" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "redKnockdown" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "blueCount" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "redCount" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "blueExcessiveHolding" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "redExcessiveHolding" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "blueLackOfAggressiveness" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "redLackOfAggressiveness" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "blueOther" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "redOther" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ArbitrationRoundEvaluation"
  ADD COLUMN IF NOT EXISTS "bluePointDeduction" SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "redPointDeduction" SMALLINT NOT NULL DEFAULT 0;

-- Legado (ocorrência sem atleta): migra para ambos os lados se estava activo
UPDATE "ArbitrationRoundOccurrence" SET
  "blueIllegalStrike" = "illegalStrike",
  "redIllegalStrike" = "illegalStrike"
WHERE "illegalStrike" = true AND "blueIllegalStrike" = false AND "redIllegalStrike" = false;

UPDATE "ArbitrationRoundOccurrence" SET
  "blueVerbalWarning" = "verbalWarning",
  "redVerbalWarning" = "verbalWarning"
WHERE "verbalWarning" = true AND "blueVerbalWarning" = false AND "redVerbalWarning" = false;

UPDATE "ArbitrationRoundOccurrence" SET
  "bluePointDeduction" = "pointDeduction",
  "redPointDeduction" = "pointDeduction"
WHERE "pointDeduction" = true AND "bluePointDeduction" = false AND "redPointDeduction" = false;

UPDATE "ArbitrationRoundOccurrence" SET
  "blueKnockdown" = "knockdown",
  "redKnockdown" = "knockdown"
WHERE "knockdown" = true AND "blueKnockdown" = false AND "redKnockdown" = false;

UPDATE "ArbitrationRoundOccurrence" SET
  "blueCount" = "count",
  "redCount" = "count"
WHERE "count" = true AND "blueCount" = false AND "redCount" = false;

UPDATE "ArbitrationRoundOccurrence" SET
  "blueExcessiveHolding" = "excessiveHolding",
  "redExcessiveHolding" = "excessiveHolding"
WHERE "excessiveHolding" = true AND "blueExcessiveHolding" = false AND "redExcessiveHolding" = false;

UPDATE "ArbitrationRoundOccurrence" SET
  "blueLackOfAggressiveness" = "lackOfAggressiveness",
  "redLackOfAggressiveness" = "lackOfAggressiveness"
WHERE "lackOfAggressiveness" = true AND "blueLackOfAggressiveness" = false AND "redLackOfAggressiveness" = false;

UPDATE "ArbitrationRoundOccurrence" SET
  "blueOther" = "other",
  "redOther" = "other"
WHERE "other" = true AND "blueOther" = false AND "redOther" = false;

ALTER TABLE "ArbitrationRoundOccurrence"
  DROP COLUMN IF EXISTS "illegalStrike",
  DROP COLUMN IF EXISTS "verbalWarning",
  DROP COLUMN IF EXISTS "pointDeduction",
  DROP COLUMN IF EXISTS "knockdown",
  DROP COLUMN IF EXISTS "count",
  DROP COLUMN IF EXISTS "excessiveHolding",
  DROP COLUMN IF EXISTS "lackOfAggressiveness",
  DROP COLUMN IF EXISTS "other";
