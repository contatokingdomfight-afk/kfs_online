-- Forma de pagamento em movimentos financeiros + alinhamento loja.

ALTER TABLE public."Payment"
  ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;

ALTER TABLE public."FinancialRevenue"
  ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;

ALTER TABLE public."FinancialExpense"
  ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;

COMMENT ON COLUMN public."Payment"."paymentMethod" IS 'CASH | TRANSFER | MBWAY | DEPOSIT (quando status PAID)';
COMMENT ON COLUMN public."FinancialRevenue"."paymentMethod" IS 'CASH | TRANSFER | MBWAY | DEPOSIT';
COMMENT ON COLUMN public."FinancialExpense"."paymentMethod" IS 'CASH | TRANSFER | MBWAY | DEPOSIT';

-- Loja: migrar valores antigos e actualizar constraint
UPDATE public."RetailSale" SET "paymentMethod" = 'TRANSFER' WHERE "paymentMethod" = 'CARD';
UPDATE public."RetailSale" SET "paymentMethod" = 'DEPOSIT' WHERE "paymentMethod" = 'MB';
UPDATE public."RetailSale" SET "paymentMethod" = 'TRANSFER' WHERE "paymentMethod" = 'OTHER';

ALTER TABLE public."RetailSale" DROP CONSTRAINT IF EXISTS "RetailSale_payment_check";
ALTER TABLE public."RetailSale"
  ADD CONSTRAINT "RetailSale_payment_check"
  CHECK ("paymentMethod" IN ('CASH', 'TRANSFER', 'MBWAY', 'DEPOSIT'));
