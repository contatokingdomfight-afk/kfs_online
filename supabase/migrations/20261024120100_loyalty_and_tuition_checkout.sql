-- Fidelização (6 meses, renova sozinha) com desconto por plano + pagamento de mensalidades em atraso pela Revolut.

-- Desconto mensal do plano para quem está fidelizado (ex.: Kingdom Full 55 € → 5 €; plano de 80 € → 10 €). NULL/0 = sem fidelização.
ALTER TABLE public."Plan" ADD COLUMN IF NOT EXISTS "loyaltyMonthlyDiscount" DECIMAL(10, 2);
COMMENT ON COLUMN public."Plan"."loyaltyMonthlyDiscount" IS 'Desconto mensal (€) com fidelização de 6 meses. NULL ou 0 = o plano não tem fidelização.';

-- Fidelização de um aluno pagador (individual ou titular de grupo familiar: cada membro recebe o desconto do seu plano de referência).
CREATE TABLE IF NOT EXISTS public."LoyaltyCommitment" (
  id TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES public."Student"(id) ON DELETE CASCADE,
  "months" INTEGER NOT NULL DEFAULT 6,
  "startMonth" TEXT NOT NULL,
  "endMonth" TEXT NOT NULL,
  "renewals" INTEGER NOT NULL DEFAULT 0,
  "autoRenew" BOOLEAN NOT NULL DEFAULT true,
  state TEXT NOT NULL DEFAULT 'ACTIVE',
  "exitPenaltyAmount" DECIMAL(10, 2),
  "exitPaymentId" TEXT REFERENCES public."Payment"(id) ON DELETE SET NULL,
  "endedAt" TIMESTAMPTZ,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "LoyaltyCommitment_state_check" CHECK (state IN ('ACTIVE', 'ENDED')),
  CONSTRAINT "LoyaltyCommitment_months_check" CHECK ("startMonth" ~ '^\d{4}-\d{2}$' AND "endMonth" ~ '^\d{4}-\d{2}$')
);
CREATE INDEX IF NOT EXISTS "LoyaltyCommitment_student_idx" ON public."LoyaltyCommitment" ("studentId", state);
COMMENT ON TABLE public."LoyaltyCommitment" IS 'Fidelização: desconto do plano nas mensalidades de startMonth a endMonth (AAAA-MM, inclusive); renova 6 meses de cada vez';

-- A cobrança de saída da fidelização tem mês de referência (o mês em que saiu).
ALTER TABLE public."Payment" DROP CONSTRAINT IF EXISTS payment_reference_month_by_type;
ALTER TABLE public."Payment" ADD CONSTRAINT payment_reference_month_by_type CHECK (
  ("paymentType" = 'TUITION' AND "referenceMonth" IS NOT NULL)
  OR ("paymentType" IN ('INSURANCE', 'ENROLLMENT') AND "referenceMonth" IS NULL)
  OR ("paymentType" IN ('EXTRA_SESSION', 'LOYALTY_EXIT'))
);

-- Pagamento online de mensalidades em atraso (aluno ou link enviado pelo admin). Uma ordem Revolut pode pagar vários meses.
CREATE TABLE IF NOT EXISTS public."PaymentCheckout" (
  id TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES public."Student"(id) ON DELETE CASCADE,
  "paymentIds" TEXT[] NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'prod',
  "revolutOrderId" TEXT,
  "checkoutUrl" TEXT,
  state TEXT NOT NULL DEFAULT 'PENDING',
  "createdByUserId" TEXT,
  "paidAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PaymentCheckout_state_check" CHECK (state IN ('PENDING', 'PAID', 'CANCELLED'))
);
CREATE INDEX IF NOT EXISTS "PaymentCheckout_student_idx" ON public."PaymentCheckout" ("studentId", state);

ALTER TABLE public."LoyaltyCommitment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PaymentCheckout" ENABLE ROW LEVEL SECURITY;
