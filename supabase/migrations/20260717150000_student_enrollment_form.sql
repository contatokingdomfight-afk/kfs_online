-- Comprovativo de Adesão (ficha de inscrição) — dados do sócio antes da assinatura do contrato.

ALTER TABLE public."InsuranceSettings"
  ADD COLUMN IF NOT EXISTS "enrollmentFormVersion" TEXT NOT NULL DEFAULT '1';

CREATE TABLE IF NOT EXISTS public."StudentEnrollmentForm" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "studentId" TEXT NOT NULL UNIQUE REFERENCES public."Student"("id") ON DELETE CASCADE,
  "formCompleted" BOOLEAN NOT NULL DEFAULT false,
  "formCompletedAt" TIMESTAMPTZ,
  "formVersion" TEXT,
  "planId" TEXT REFERENCES public."Plan"("id") ON DELETE SET NULL,
  "idDocument" TEXT,
  "taxId" TEXT,
  "addressLine" TEXT,
  "postalCode" TEXT,
  "emergencyContactName" TEXT,
  "emergencyContactRelationship" TEXT,
  "emergencyContactPhone" TEXT,
  "paymentMethod" TEXT,
  "debitIban" TEXT,
  "allergies" TEXT,
  "knownHealthCondition" TEXT,
  "emergencyMedication" TEXT,
  "consentPhoto" BOOLEAN NOT NULL DEFAULT false,
  "consentVideo" BOOLEAN NOT NULL DEFAULT false,
  "consentSocialMedia" BOOLEAN NOT NULL DEFAULT false,
  "consentMarketing" BOOLEAN NOT NULL DEFAULT false,
  "insuranceAccepted" BOOLEAN NOT NULL DEFAULT false,
  "membershipStartDate" DATE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public."StudentEnrollmentForm" IS 'Comprovativo de Adesão — ficha de inscrição do sócio.';
COMMENT ON COLUMN public."StudentEnrollmentForm"."paymentMethod" IS 'DEBIT_DIRECT | OTHER';

INSERT INTO public."StudentEnrollmentForm" (
  "id", "studentId", "formCompleted", "formCompletedAt", "formVersion", "planId", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  m."studentId",
  true,
  COALESCE(m."agreementSignedAt", now()),
  'legacy',
  m."planId",
  now()
FROM public."StudentMembershipAgreement" m
WHERE m."agreementSigned" = true
  AND NOT EXISTS (
    SELECT 1 FROM public."StudentEnrollmentForm" f WHERE f."studentId" = m."studentId"
  );

ALTER TABLE public."StudentEnrollmentForm" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kfs_student_enrollment_form_select" ON public."StudentEnrollmentForm";
CREATE POLICY "kfs_student_enrollment_form_select" ON public."StudentEnrollmentForm"
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "kfs_student_enrollment_form_write" ON public."StudentEnrollmentForm";
CREATE POLICY "kfs_student_enrollment_form_write" ON public."StudentEnrollmentForm"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
