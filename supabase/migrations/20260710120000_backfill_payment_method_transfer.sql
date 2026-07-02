-- Pagamentos/despesas/receitas antigas (antes do campo paymentMethod): assumir transferência bancária.

UPDATE public."Payment"
SET "paymentMethod" = 'TRANSFER'
WHERE "paymentMethod" IS NULL AND status = 'PAID';

UPDATE public."FinancialRevenue"
SET "paymentMethod" = 'TRANSFER'
WHERE "paymentMethod" IS NULL;

UPDATE public."FinancialExpense"
SET "paymentMethod" = 'TRANSFER'
WHERE "paymentMethod" IS NULL;

COMMENT ON COLUMN public."Payment"."paymentMethod" IS 'CASH | TRANSFER | MBWAY | DEPOSIT (PAID). Legado sem valor foi assumido TRANSFER na migração 20260710120000.';
