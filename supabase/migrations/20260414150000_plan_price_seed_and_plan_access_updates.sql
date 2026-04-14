-- Idempotente: preenche PlanPrice + stripePriceId default (legado Stripe Kingdom Online) e
-- aplica regras de acesso por plano com nomes de colunas Prisma ("modalityScope", "priceMonthly").
-- Útil quando só correu 20260414130000_eu_legacy_schema_parity (CREATE PlanPrice sem INSERT) ou
-- quando 20260312120632 não atualizou linhas por causa de nomes de colunas antigos.

INSERT INTO "PlanPrice" ("id", "planId", "stripePriceId", "intervalLabel", "intervalMonths", "amountCents", "sortOrder")
VALUES
  ('planprice-online-mensal', 'plan-online', 'price_1T4OxORTJGXEa4Ic6QPrh39g', 'Mensal', 1, 2000, 1),
  ('planprice-online-trimestral', 'plan-online', 'price_1TAFWdEnpsjluynES4TuzsBI', 'Trimestral (3 meses)', 3, 5500, 2),
  ('planprice-online-semestral', 'plan-online', 'price_1TAFWdEnpsjluynEBSFr76E7', 'Semestral (6 meses)', 6, 11000, 3),
  ('planprice-online-anual', 'plan-online', 'price_1TAFWdEnpsjluynEj1vmnKbl', 'Anual', 12, 20000, 4)
ON CONFLICT ("stripePriceId") DO NOTHING;

UPDATE "Plan"
SET "stripePriceId" = 'price_1T4OxORTJGXEa4Ic6QPrh39g'
WHERE id = 'plan-online' AND "stripePriceId" IS NULL;

-- Kingdom Online: sem performance, sem check-in
UPDATE "Plan" SET
  includes_performance_tracking = false,
  includes_check_in = false,
  max_check_ins_per_day = 0,
  includes_exclusive_benefits = false
WHERE "modalityScope" = 'NONE' AND name ILIKE '%Online%';

-- Kingdom Presencial I: performance, check-in 1/dia, 50€
UPDATE "Plan" SET
  includes_performance_tracking = true,
  includes_check_in = true,
  max_check_ins_per_day = 1,
  includes_exclusive_benefits = false,
  "priceMonthly" = 50
WHERE "modalityScope" = 'SINGLE' AND (name ILIKE '%Presencial%Modalidade%' OR name ILIKE '%Plano I%');

-- Kingdom Presencial MMA: performance, check-in ilimitado
UPDATE "Plan" SET
  includes_performance_tracking = true,
  includes_check_in = true,
  max_check_ins_per_day = null,
  includes_exclusive_benefits = false
WHERE "modalityScope" = 'ALL' AND name ILIKE '%MMA%' AND name NOT ILIKE '%FULL%';

-- Kingdom FULL: performance, check-in ilimitado, benefícios exclusivos
UPDATE "Plan" SET
  includes_performance_tracking = true,
  includes_check_in = true,
  max_check_ins_per_day = null,
  includes_exclusive_benefits = true
WHERE name ILIKE '%FULL%';
