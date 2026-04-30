-- Receitas manuais (entradas não modeladas noutras tabelas) — painel /admin/financeiro
CREATE TABLE IF NOT EXISTS "FinancialRevenue" (
  "id" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "description" TEXT NOT NULL,
  "occurredOn" DATE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialRevenue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FinancialRevenue_occurredOn_idx" ON "FinancialRevenue" ("occurredOn" DESC);

COMMENT ON TABLE "FinancialRevenue" IS 'Entradas registadas manualmente no painel financeiro.';
