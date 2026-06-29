-- Seguro coletivo anual, termo de responsabilidade (waiver) e tipos de pagamento (mensalidade vs seguro).

CREATE TYPE public."PaymentType" AS ENUM ('TUITION', 'INSURANCE');

ALTER TABLE public."Payment"
  ADD COLUMN IF NOT EXISTS "paymentType" public."PaymentType" NOT NULL DEFAULT 'TUITION',
  ADD COLUMN IF NOT EXISTS "referenceYear" TEXT;

COMMENT ON COLUMN public."Payment"."paymentType" IS 'TUITION = mensalidade (referenceMonth); INSURANCE = seguro anual (referenceYear).';
COMMENT ON COLUMN public."Payment"."referenceYear" IS 'Ano civil YYYY quando paymentType = INSURANCE.';

CREATE UNIQUE INDEX IF NOT EXISTS payment_tuition_student_month_unique
  ON public."Payment" ("studentId", "referenceMonth")
  WHERE "paymentType" = 'TUITION' AND "referenceMonth" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payment_insurance_student_year_unique
  ON public."Payment" ("studentId", "referenceYear")
  WHERE "paymentType" = 'INSURANCE' AND "referenceYear" IS NOT NULL;

CREATE TABLE IF NOT EXISTS public."InsuranceSettings" (
  "id" TEXT PRIMARY KEY DEFAULT 'global',
  "annualAmount" NUMERIC(10, 2) NOT NULL DEFAULT 0,
  "policyReference" TEXT,
  "waiverVersion" TEXT NOT NULL DEFAULT '1',
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public."InsuranceSettings" ("id", "annualAmount", "waiverVersion")
VALUES ('global', 0, '1')
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS public."StudentWaiver" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "studentId" TEXT NOT NULL UNIQUE REFERENCES public."Student"("id") ON DELETE CASCADE,
  "waiverSigned" BOOLEAN NOT NULL DEFAULT false,
  "waiverSignedAt" TIMESTAMPTZ,
  "waiverVersion" TEXT,
  "signatureName" TEXT,
  "signatureIp" TEXT,
  "guardianName" TEXT,
  "isMinor" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."StudentInsuranceCoverage" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "studentId" TEXT NOT NULL UNIQUE REFERENCES public."Student"("id") ON DELETE CASCADE,
  "covered" BOOLEAN NOT NULL DEFAULT false,
  "coverageStartDate" DATE,
  "coverageEndDate" DATE,
  "policyReference" TEXT,
  "notes" TEXT,
  "lastRenewedAt" TIMESTAMPTZ,
  "lastRenewedByUserId" TEXT REFERENCES public."User"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contas existentes: considerar waiver já assinado (evita bloquear produção).
INSERT INTO public."StudentWaiver" (
  "id", "studentId", "waiverSigned", "waiverSignedAt", "waiverVersion", "signatureName", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  s."id",
  true,
  now(),
  'legacy',
  'Conta existente (migração)',
  now()
FROM public."Student" s
WHERE NOT EXISTS (
  SELECT 1 FROM public."StudentWaiver" w WHERE w."studentId" = s."id"
);

ALTER TABLE public."InsuranceSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StudentWaiver" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StudentInsuranceCoverage" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kfs_insurance_settings_select" ON public."InsuranceSettings";
CREATE POLICY "kfs_insurance_settings_select" ON public."InsuranceSettings"
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "kfs_insurance_settings_write" ON public."InsuranceSettings";
CREATE POLICY "kfs_insurance_settings_write" ON public."InsuranceSettings"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "kfs_student_waiver_select" ON public."StudentWaiver";
CREATE POLICY "kfs_student_waiver_select" ON public."StudentWaiver"
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "kfs_student_waiver_write" ON public."StudentWaiver";
CREATE POLICY "kfs_student_waiver_write" ON public."StudentWaiver"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "kfs_student_insurance_select" ON public."StudentInsuranceCoverage";
CREATE POLICY "kfs_student_insurance_select" ON public."StudentInsuranceCoverage"
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "kfs_student_insurance_write" ON public."StudentInsuranceCoverage";
CREATE POLICY "kfs_student_insurance_write" ON public."StudentInsuranceCoverage"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
