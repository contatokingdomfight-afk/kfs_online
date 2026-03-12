-- Tabela PlanPrice: múltiplos preços Stripe por plano (mensal, trimestral, semestral, anual)
CREATE TABLE IF NOT EXISTS "PlanPrice" (
  "id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "planId" text NOT NULL REFERENCES "Plan"("id") ON DELETE CASCADE,
  "stripePriceId" text NOT NULL UNIQUE,
  "intervalLabel" text NOT NULL,
  "intervalMonths" integer NOT NULL,
  "amountCents" integer NOT NULL,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "PlanPrice_planId_idx" ON "PlanPrice"("planId");
CREATE INDEX IF NOT EXISTS "PlanPrice_stripePriceId_idx" ON "PlanPrice"("stripePriceId");

COMMENT ON TABLE "PlanPrice" IS 'Opções de preço Stripe por plano (ex: mensal €20, trimestral €55, anual €200)';

-- Inserir preços do Kingdom Online (produtos já existem no Stripe)
INSERT INTO "PlanPrice" ("id", "planId", "stripePriceId", "intervalLabel", "intervalMonths", "amountCents", "sortOrder")
VALUES
  ('planprice-online-mensal', 'plan-online', 'price_1TAFWfEnpsjluynENfLzoWWc', 'Mensal', 1, 2000, 1),
  ('planprice-online-trimestral', 'plan-online', 'price_1TAFWdEnpsjluynES4TuzsBI', 'Trimestral (3 meses)', 3, 5500, 2),
  ('planprice-online-semestral', 'plan-online', 'price_1TAFWdEnpsjluynEBSFr76E7', 'Semestral (6 meses)', 6, 11000, 3),
  ('planprice-online-anual', 'plan-online', 'price_1TAFWdEnpsjluynEj1vmnKbl', 'Anual', 12, 20000, 4)
ON CONFLICT ("stripePriceId") DO NOTHING;

-- Manter stripePriceId no Plan para compatibilidade (default = mensal)
UPDATE "Plan"
SET "stripePriceId" = 'price_1TAFWfEnpsjluynENfLzoWWc'
WHERE id = 'plan-online' AND "stripePriceId" IS NULL;

ALTER TABLE "PlanPrice" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_authenticated_plan_price" ON "PlanPrice" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_anon_read_plan_price" ON "PlanPrice" FOR SELECT TO anon USING (true);
