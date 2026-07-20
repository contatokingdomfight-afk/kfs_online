-- Metas de negócio do administrador (quantidade ou monetária), com lançamentos manuais.

CREATE TABLE IF NOT EXISTS public."AdminBusinessGoal" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "metricType" TEXT NOT NULL CHECK ("metricType" IN ('QUANTITY', 'MONETARY')),
  "targetValue" NUMERIC(14, 2) NOT NULL CHECK ("targetValue" > 0),
  "currentValue" NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK ("currentValue" >= 0),
  "startDate" DATE NOT NULL,
  "targetEndDate" DATE NOT NULL CHECK ("targetEndDate" >= "startDate"),
  "schoolId" TEXT REFERENCES public."School"("id") ON DELETE SET NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
  "createdByUserId" TEXT NOT NULL REFERENCES public."User"("id") ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."AdminGoalEntry" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "goalId" TEXT NOT NULL REFERENCES public."AdminBusinessGoal"("id") ON DELETE CASCADE,
  "deltaValue" NUMERIC(14, 2) NOT NULL,
  "note" TEXT,
  "recordedAt" DATE NOT NULL DEFAULT CURRENT_DATE,
  "createdByUserId" TEXT NOT NULL REFERENCES public."User"("id") ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_business_goal_school_idx ON public."AdminBusinessGoal" ("schoolId");
CREATE INDEX IF NOT EXISTS admin_business_goal_status_idx ON public."AdminBusinessGoal" ("status");
CREATE INDEX IF NOT EXISTS admin_business_goal_target_end_idx ON public."AdminBusinessGoal" ("targetEndDate");
CREATE INDEX IF NOT EXISTS admin_goal_entry_goal_idx ON public."AdminGoalEntry" ("goalId");

COMMENT ON TABLE public."AdminBusinessGoal" IS 'Metas manuais do backoffice (quantidade ou monetária), globais ou por escola.';
COMMENT ON TABLE public."AdminGoalEntry" IS 'Lançamentos manuais de progresso numa meta de negócio.';

ALTER TABLE public."AdminBusinessGoal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AdminGoalEntry" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kfs_admin_business_goal_all" ON public."AdminBusinessGoal";
CREATE POLICY "kfs_admin_business_goal_all" ON public."AdminBusinessGoal"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "kfs_admin_goal_entry_all" ON public."AdminGoalEntry";
CREATE POLICY "kfs_admin_goal_entry_all" ON public."AdminGoalEntry"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
