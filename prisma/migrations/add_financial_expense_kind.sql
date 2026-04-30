-- Tipo fixo vs variável em FinancialExpense (alinhado a prisma/schema.prisma).
-- Aplicar no Supabase (SQL editor) após add_financial_expense.sql.

DO $$ BEGIN
  CREATE TYPE "FinancialExpenseKind" AS ENUM ('FIXED', 'VARIABLE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "FinancialExpense"
  ADD COLUMN IF NOT EXISTS "kind" "FinancialExpenseKind" NOT NULL DEFAULT 'VARIABLE';

COMMENT ON COLUMN "FinancialExpense"."kind" IS 'FIXED = custo recorrente previsível; VARIABLE = varia mês a mês.';
