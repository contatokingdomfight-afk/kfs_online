-- Colunas e índice de matrícula (após enum ENROLLMENT commitado).

ALTER TABLE public."InsuranceSettings"
  ADD COLUMN IF NOT EXISTS "enrollmentAmount" NUMERIC(10, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public."InsuranceSettings"."enrollmentAmount" IS 'Taxa de matrícula única (inscrição); editável em Admin → Configurações.';

ALTER TABLE public."Student"
  ADD COLUMN IF NOT EXISTS "enrollmentFeeWaived" BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public."Student"."enrollmentFeeWaived" IS 'true quando a matrícula foi ofereida/isenta no primeiro pagamento.';

CREATE UNIQUE INDEX IF NOT EXISTS payment_enrollment_student_unique
  ON public."Payment" ("studentId")
  WHERE "paymentType" = 'ENROLLMENT';
