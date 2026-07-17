-- Condições Gerais de Adesão: assinatura digital pelo aluno após escolha do plano.

ALTER TABLE public."InsuranceSettings"
  ADD COLUMN IF NOT EXISTS "membershipAgreementVersion" TEXT NOT NULL DEFAULT '1';

CREATE TABLE IF NOT EXISTS public."StudentMembershipAgreement" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "studentId" TEXT NOT NULL UNIQUE REFERENCES public."Student"("id") ON DELETE CASCADE,
  "agreementSigned" BOOLEAN NOT NULL DEFAULT false,
  "agreementSignedAt" TIMESTAMPTZ,
  "agreementVersion" TEXT,
  "planId" TEXT REFERENCES public."Plan"("id") ON DELETE SET NULL,
  "signatureName" TEXT,
  "signatureIp" TEXT,
  "guardianName" TEXT,
  "isMinor" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public."StudentMembershipAgreement" IS 'Assinatura das Condições Gerais de Adesão (contrato de sócio).';

-- Contas com plano já atribuído: considerar contrato assinado (evita bloquear produção).
INSERT INTO public."StudentMembershipAgreement" (
  "id", "studentId", "agreementSigned", "agreementSignedAt", "agreementVersion", "planId", "signatureName", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  s."id",
  true,
  now(),
  'legacy',
  s."planId",
  'Conta existente (migração)',
  now()
FROM public."Student" s
WHERE s."planId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public."StudentMembershipAgreement" m WHERE m."studentId" = s."id"
  );

ALTER TABLE public."StudentMembershipAgreement" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kfs_student_membership_agreement_select" ON public."StudentMembershipAgreement";
CREATE POLICY "kfs_student_membership_agreement_select" ON public."StudentMembershipAgreement"
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "kfs_student_membership_agreement_write" ON public."StudentMembershipAgreement";
CREATE POLICY "kfs_student_membership_agreement_write" ON public."StudentMembershipAgreement"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
