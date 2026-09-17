-- Snapshot diário de XP por atleta, para permitir ranking "por período" (XP ganho desde X)
-- sem reescrever os pontos de escrita de XP existentes (course-watch-xp, xp-missions, missions, referral-rewards).
-- Escrito pelo cron /api/cron/xp-snapshot (service role, ignora RLS); as políticas abaixo são defesa em profundidade.

CREATE TABLE IF NOT EXISTS "AthleteXpSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "athleteId" TEXT NOT NULL REFERENCES "Athlete"("id") ON DELETE CASCADE,
  "xp" INTEGER NOT NULL,
  "snapshotDate" DATE NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "AthleteXpSnapshot_athleteId_snapshotDate_key" UNIQUE ("athleteId", "snapshotDate")
);

CREATE INDEX IF NOT EXISTS "AthleteXpSnapshot_athleteId_date_idx" ON "AthleteXpSnapshot" ("athleteId", "snapshotDate" DESC);

ALTER TABLE "AthleteXpSnapshot" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kfs_xp_snapshot_select" ON "AthleteXpSnapshot";
CREATE POLICY "kfs_xp_snapshot_select" ON "AthleteXpSnapshot" FOR SELECT TO authenticated
  USING (public.kfs_owns_athlete("athleteId") OR public.kfs_is_staff());

DROP POLICY IF EXISTS "kfs_xp_snapshot_write" ON "AthleteXpSnapshot";
CREATE POLICY "kfs_xp_snapshot_write" ON "AthleteXpSnapshot" FOR ALL TO authenticated
  USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());

COMMENT ON TABLE "AthleteXpSnapshot" IS 'Snapshot diário de Athlete.xp; base para ranking por período (XP ganho desde uma data) sem ledger transacional.';
