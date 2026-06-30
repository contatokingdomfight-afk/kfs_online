-- Seguro (referenceYear) e matrícula não usam referenceMonth; a coluna manteve NOT NULL após 20260630120000.

ALTER TABLE public."Payment"
  ALTER COLUMN "referenceMonth" DROP NOT NULL;

COMMENT ON COLUMN public."Payment"."referenceMonth" IS 'YYYY-MM para TUITION; NULL para INSURANCE e ENROLLMENT.';

ALTER TABLE public."Payment" DROP CONSTRAINT IF EXISTS payment_reference_month_by_type;
ALTER TABLE public."Payment" ADD CONSTRAINT payment_reference_month_by_type CHECK (
  ("paymentType" = 'TUITION' AND "referenceMonth" IS NOT NULL)
  OR ("paymentType" IN ('INSURANCE', 'ENROLLMENT') AND "referenceMonth" IS NULL)
);
