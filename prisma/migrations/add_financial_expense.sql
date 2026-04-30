-- Despesas gerais no painel admin /admin/financeiro
-- Aplicar no Supabase (SQL editor) ou via Prisma migrate.

CREATE TABLE IF NOT EXISTS "FinancialExpense" (
  "id" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "description" TEXT NOT NULL,
  "occurredOn" DATE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialExpense_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FinancialExpense_occurredOn_idx" ON "FinancialExpense" ("occurredOn" DESC);

COMMENT ON TABLE "FinancialExpense" IS 'Custos/despesas registados manualmente no painel financeiro.';
