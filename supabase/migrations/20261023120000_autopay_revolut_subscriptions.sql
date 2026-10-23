-- Pagamento automático da mensalidade (Subscrições da Revolut Merchant API).
-- Uma linha por pagador: aluno individual ou titular de um grupo familiar (paga o total do grupo).

CREATE TABLE IF NOT EXISTS public."AutoPay" (
  id TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES public."Student"(id) ON DELETE CASCADE,
  "familyGroupId" TEXT,
  "environment" TEXT NOT NULL DEFAULT 'prod',
  state TEXT NOT NULL DEFAULT 'PENDING',
  amount DECIMAL(10, 2) NOT NULL,
  "billingDay" INTEGER,
  "firstReferenceMonth" TEXT,
  "revolutCustomerId" TEXT,
  "revolutSubscriptionId" TEXT,
  "revolutPlanVariationId" TEXT,
  "setupOrderId" TEXT,
  "paymentMethodLabel" TEXT,
  "nextChargeAt" TIMESTAMPTZ,
  "lastReminderFor" TIMESTAMPTZ,
  "activatedAt" TIMESTAMPTZ,
  "cancelledAt" TIMESTAMPTZ,
  "lastSyncedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "AutoPay_student_key" UNIQUE ("studentId"),
  CONSTRAINT "AutoPay_state_check" CHECK (state IN ('PENDING', 'ACTIVE', 'OVERDUE', 'CANCELLED')),
  CONSTRAINT "AutoPay_billing_day_check" CHECK ("billingDay" IS NULL OR "billingDay" BETWEEN 1 AND 31)
);

CREATE INDEX IF NOT EXISTS "AutoPay_subscription_idx" ON public."AutoPay" ("revolutSubscriptionId");
CREATE INDEX IF NOT EXISTS "AutoPay_customer_idx" ON public."AutoPay" ("revolutCustomerId");
CREATE INDEX IF NOT EXISTS "AutoPay_setup_order_idx" ON public."AutoPay" ("setupOrderId");

COMMENT ON TABLE public."AutoPay" IS 'Pagamento automático da mensalidade via Subscrições Revolut (um por aluno pagador / titular de família)';
COMMENT ON COLUMN public."AutoPay"."billingDay" IS 'Dia do mês da cobrança (dia da 1.ª cobrança; o admin pode mudar). Meses sem esse dia: último dia do mês.';
COMMENT ON COLUMN public."AutoPay"."firstReferenceMonth" IS 'Mês (AAAA-MM) pago pela 1.ª cobrança; a cobrança do ciclo N paga este mês + N-1';
COMMENT ON COLUMN public."AutoPay"."environment" IS 'sandbox | prod — chaves Revolut usadas';

-- Um plano Revolut por valor mensal (criado quando é preciso).
CREATE TABLE IF NOT EXISTS public."RevolutPricePlan" (
  id TEXT PRIMARY KEY,
  "environment" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "planId" TEXT NOT NULL,
  "variationId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "RevolutPricePlan_env_amount_key" UNIQUE ("environment", "amountCents")
);

-- Mensalidade paga por cobrança automática: id da ordem Revolut (idempotência + etiqueta «Automático»).
ALTER TABLE public."Payment" ADD COLUMN IF NOT EXISTS "revolutOrderId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_revolutOrderId_key" ON public."Payment" ("revolutOrderId") WHERE "revolutOrderId" IS NOT NULL;

ALTER TABLE public."AutoPay" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RevolutPricePlan" ENABLE ROW LEVEL SECURITY;
