-- Sistema de indicação de amigos: um aluno partilha o link `/aula-experimental?ref=<studentId>`,
-- um amigo faz a aula experimental através dele e, se o amigo se tornar aluno pagante, o
-- indicador ganha XP (sempre) e um crédito na mensalidade seguinte (só para quem paga
-- presencial — quem paga por Stripe não tem hoje forma segura de aplicar desconto automático
-- sem mexer em cupões reais, por isso fica só com o XP).

ALTER TABLE public."TrialClass"
  ADD COLUMN IF NOT EXISTS "referredByStudentId" TEXT REFERENCES public."Student"("id") ON DELETE SET NULL;

ALTER TABLE public."Student"
  ADD COLUMN IF NOT EXISTS "referredByStudentId" TEXT REFERENCES public."Student"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "referralRewardGrantedAt" TIMESTAMPTZ;

COMMENT ON COLUMN public."Student"."referredByStudentId" IS
  'Aluno que indicou este (via link de aula experimental) — null se não veio de indicação.';
COMMENT ON COLUMN public."Student"."referralRewardGrantedAt" IS
  'Quando a recompensa de indicação foi atribuída ao indicador (guarda de idempotência — só uma vez por indicado).';

CREATE TABLE IF NOT EXISTS public."ReferralCredit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES public."Student"("id") ON DELETE CASCADE,
  "amount" NUMERIC(10,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "referredStudentId" TEXT REFERENCES public."Student"("id") ON DELETE SET NULL,
  "consumedAt" TIMESTAMPTZ,
  "consumedPaymentId" TEXT REFERENCES public."Payment"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public."ReferralCredit" IS
  'Créditos de indicação por atribuir/atribuídos na mensalidade presencial do indicador (auditável — quando e em qual pagamento foi aplicado).';

CREATE INDEX IF NOT EXISTS "ReferralCredit_studentId_idx" ON public."ReferralCredit" ("studentId");

ALTER TABLE public."ReferralCredit" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kfs_referral_credit_select" ON public."ReferralCredit";
CREATE POLICY "kfs_referral_credit_select" ON public."ReferralCredit" FOR SELECT TO authenticated
  USING ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
DROP POLICY IF EXISTS "kfs_referral_credit_write" ON public."ReferralCredit";
CREATE POLICY "kfs_referral_credit_write" ON public."ReferralCredit" FOR ALL TO authenticated
  USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());
