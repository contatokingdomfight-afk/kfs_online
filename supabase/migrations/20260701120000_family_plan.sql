-- Plano Família: grupo com titular de faturação e membros dependentes.

INSERT INTO public."Plan" (
  id,
  name,
  description,
  "priceMonthly",
  "schoolId",
  "includesDigitalAccess",
  "modalityScope",
  "isActive",
  "createdAt",
  "updatedAt",
  "stripePriceId",
  includes_performance_tracking,
  includes_check_in,
  max_check_ins_per_day,
  includes_exclusive_benefits
) VALUES (
  'plan-familia',
  'Kingdom Família',
  'Pacote familiar com acesso equivalente ao Kingdom Presencial MMA: todas as modalidades, biblioteca digital, performance e check-in ilimitado. Mensalidade única no titular; gestão na secretaria.',
  150.00,
  'default-school-001',
  true,
  'ALL',
  true,
  now(),
  now(),
  NULL,
  true,
  true,
  NULL,
  false
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "priceMonthly" = EXCLUDED."priceMonthly",
  "includesDigitalAccess" = EXCLUDED."includesDigitalAccess",
  "modalityScope" = EXCLUDED."modalityScope",
  includes_performance_tracking = EXCLUDED.includes_performance_tracking,
  includes_check_in = EXCLUDED.includes_check_in,
  max_check_ins_per_day = EXCLUDED.max_check_ins_per_day,
  includes_exclusive_benefits = EXCLUDED.includes_exclusive_benefits,
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = now();

CREATE TABLE IF NOT EXISTS public."FamilyGroup" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT,
  "billingStudentId" TEXT NOT NULL REFERENCES public."Student"("id") ON DELETE RESTRICT,
  "planId" TEXT NOT NULL DEFAULT 'plan-familia' REFERENCES public."Plan"("id") ON DELETE RESTRICT,
  "maxMembers" INTEGER NOT NULL CHECK ("maxMembers" >= 2),
  "schoolId" TEXT NOT NULL REFERENCES public."School"("id") ON DELETE RESTRICT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."FamilyGroupMember" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "familyGroupId" TEXT NOT NULL REFERENCES public."FamilyGroup"("id") ON DELETE CASCADE,
  "studentId" TEXT NOT NULL UNIQUE REFERENCES public."Student"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL CHECK ("role" IN ('TITULAR', 'MEMBER')),
  "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS family_group_member_group_idx ON public."FamilyGroupMember" ("familyGroupId");
CREATE INDEX IF NOT EXISTS family_group_billing_student_idx ON public."FamilyGroup" ("billingStudentId");

ALTER TABLE public."Payment"
  ADD COLUMN IF NOT EXISTS "familyGroupId" TEXT REFERENCES public."FamilyGroup"("id") ON DELETE SET NULL;

COMMENT ON COLUMN public."Payment"."familyGroupId" IS 'Preenchido quando a mensalidade TUITION é cobrança do pacote familiar (titular).';

ALTER TABLE public."FamilyGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FamilyGroupMember" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kfs_family_group_select" ON public."FamilyGroup";
CREATE POLICY "kfs_family_group_select" ON public."FamilyGroup"
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "kfs_family_group_write" ON public."FamilyGroup";
CREATE POLICY "kfs_family_group_write" ON public."FamilyGroup"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "kfs_family_group_member_select" ON public."FamilyGroupMember";
CREATE POLICY "kfs_family_group_member_select" ON public."FamilyGroupMember"
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "kfs_family_group_member_write" ON public."FamilyGroupMember";
CREATE POLICY "kfs_family_group_member_write" ON public."FamilyGroupMember"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
