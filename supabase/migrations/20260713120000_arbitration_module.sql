-- Módulo de Arbitragem KFS: eventos internos, combates, juízes, avaliações por round.

DO $$ BEGIN
  CREATE TYPE "ArbitrationModality" AS ENUM ('BOXING', 'MUAY_THAI');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ArbitrationFightStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ArbitrationCorner" AS ENUM ('BLUE', 'RED', 'DRAW');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ArbitrationDecisionType" AS ENUM ('UNANIMOUS', 'SPLIT', 'MAJORITY', 'DRAW');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ArbitrationEvent" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "schoolId" TEXT REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "eventDate" DATE,
  "location" TEXT,
  "totalRoundsDefault" INTEGER NOT NULL DEFAULT 3,
  "roundDurationSeconds" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ArbitrationEvent_school_date_idx" ON "ArbitrationEvent" ("schoolId", "eventDate" DESC);

CREATE TABLE IF NOT EXISTS "ArbitrationFight" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "eventId" TEXT NOT NULL REFERENCES "ArbitrationEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "modality" "ArbitrationModality" NOT NULL,
  "category" TEXT NOT NULL,
  "weightClass" TEXT,
  "athleteBlueName" TEXT NOT NULL,
  "athleteRedName" TEXT NOT NULL,
  "athleteBlueId" TEXT REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "athleteRedId" TEXT REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "status" "ArbitrationFightStatus" NOT NULL DEFAULT 'SCHEDULED',
  "totalRounds" INTEGER NOT NULL DEFAULT 3,
  "currentRound" INTEGER NOT NULL DEFAULT 1,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "scheduledAt" TIMESTAMPTZ,
  "startedAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "winner" "ArbitrationCorner",
  "decisionType" "ArbitrationDecisionType",
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ArbitrationFight_event_status_idx" ON "ArbitrationFight" ("eventId", "status", "sortOrder");
CREATE INDEX IF NOT EXISTS "ArbitrationFight_status_idx" ON "ArbitrationFight" ("status", "scheduledAt");

CREATE TABLE IF NOT EXISTS "ArbitrationJudge" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "displayName" TEXT NOT NULL,
  "schoolId" TEXT REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ArbitrationJudge_user_idx" ON "ArbitrationJudge" ("userId") WHERE "userId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "ArbitrationFightJudge" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "fightId" TEXT NOT NULL REFERENCES "ArbitrationFight"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "judgeId" TEXT NOT NULL REFERENCES "ArbitrationJudge"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "judgeNumber" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ArbitrationFightJudge_fight_judgeNumber_key" UNIQUE ("fightId", "judgeNumber"),
  CONSTRAINT "ArbitrationFightJudge_fight_judge_key" UNIQUE ("fightId", "judgeId")
);

CREATE TABLE IF NOT EXISTS "ArbitrationFightRound" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "fightId" TEXT NOT NULL REFERENCES "ArbitrationFight"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "roundNumber" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ArbitrationFightRound_fight_round_key" UNIQUE ("fightId", "roundNumber")
);

CREATE TABLE IF NOT EXISTS "ArbitrationRoundEvaluation" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "roundId" TEXT NOT NULL REFERENCES "ArbitrationFightRound"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "fightJudgeId" TEXT NOT NULL REFERENCES "ArbitrationFightJudge"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "blueOffensiveVolume" SMALLINT,
  "blueStrikePrecision" SMALLINT,
  "blueRingControl" SMALLINT,
  "blueMovement" SMALLINT,
  "blueDefense" SMALLINT,
  "blueTechnique" SMALLINT,
  "redOffensiveVolume" SMALLINT,
  "redStrikePrecision" SMALLINT,
  "redRingControl" SMALLINT,
  "redMovement" SMALLINT,
  "redDefense" SMALLINT,
  "redTechnique" SMALLINT,
  "blueTotal" SMALLINT,
  "redTotal" SMALLINT,
  "suggestedBlueOfficial" SMALLINT,
  "suggestedRedOfficial" SMALLINT,
  "officialBlueScore" SMALLINT,
  "officialRedScore" SMALLINT,
  "isLocked" BOOLEAN NOT NULL DEFAULT false,
  "lockedAt" TIMESTAMPTZ,
  "scoredByUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ArbitrationRoundEvaluation_round_judge_key" UNIQUE ("roundId", "fightJudgeId")
);

CREATE TABLE IF NOT EXISTS "ArbitrationRoundOccurrence" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "roundId" TEXT NOT NULL REFERENCES "ArbitrationFightRound"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "fightJudgeId" TEXT NOT NULL REFERENCES "ArbitrationFightJudge"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "illegalStrike" BOOLEAN NOT NULL DEFAULT false,
  "verbalWarning" BOOLEAN NOT NULL DEFAULT false,
  "pointDeduction" BOOLEAN NOT NULL DEFAULT false,
  "knockdown" BOOLEAN NOT NULL DEFAULT false,
  "count" BOOLEAN NOT NULL DEFAULT false,
  "excessiveHolding" BOOLEAN NOT NULL DEFAULT false,
  "lackOfAggressiveness" BOOLEAN NOT NULL DEFAULT false,
  "other" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ArbitrationRoundOccurrence_round_judge_key" UNIQUE ("roundId", "fightJudgeId")
);

CREATE TABLE IF NOT EXISTS "ArbitrationFightResult" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "fightId" TEXT NOT NULL REFERENCES "ArbitrationFight"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "fightJudgeId" TEXT NOT NULL REFERENCES "ArbitrationFightJudge"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "totalBlueOfficial" INTEGER NOT NULL,
  "totalRedOfficial" INTEGER NOT NULL,
  "winner" "ArbitrationCorner" NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ArbitrationFightResult_fight_judge_key" UNIQUE ("fightId", "fightJudgeId")
);

CREATE INDEX IF NOT EXISTS "ArbitrationRoundEvaluation_judge_idx" ON "ArbitrationRoundEvaluation" ("fightJudgeId");
CREATE INDEX IF NOT EXISTS "ArbitrationFightResult_fight_idx" ON "ArbitrationFightResult" ("fightId");

ALTER TABLE "ArbitrationEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArbitrationFight" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArbitrationJudge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArbitrationFightJudge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArbitrationFightRound" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArbitrationRoundEvaluation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArbitrationRoundOccurrence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArbitrationFightResult" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "arbitration_event_authenticated" ON "ArbitrationEvent";
CREATE POLICY "arbitration_event_authenticated" ON "ArbitrationEvent" FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "arbitration_fight_authenticated" ON "ArbitrationFight";
CREATE POLICY "arbitration_fight_authenticated" ON "ArbitrationFight" FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "arbitration_judge_authenticated" ON "ArbitrationJudge";
CREATE POLICY "arbitration_judge_authenticated" ON "ArbitrationJudge" FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "arbitration_fight_judge_authenticated" ON "ArbitrationFightJudge";
CREATE POLICY "arbitration_fight_judge_authenticated" ON "ArbitrationFightJudge" FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "arbitration_fight_round_authenticated" ON "ArbitrationFightRound";
CREATE POLICY "arbitration_fight_round_authenticated" ON "ArbitrationFightRound" FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "arbitration_round_eval_authenticated" ON "ArbitrationRoundEvaluation";
CREATE POLICY "arbitration_round_eval_authenticated" ON "ArbitrationRoundEvaluation" FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "arbitration_round_occ_authenticated" ON "ArbitrationRoundOccurrence";
CREATE POLICY "arbitration_round_occ_authenticated" ON "ArbitrationRoundOccurrence" FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "arbitration_fight_result_authenticated" ON "ArbitrationFightResult";
CREATE POLICY "arbitration_fight_result_authenticated" ON "ArbitrationFightResult" FOR ALL TO authenticated USING (true) WITH CHECK (true);
