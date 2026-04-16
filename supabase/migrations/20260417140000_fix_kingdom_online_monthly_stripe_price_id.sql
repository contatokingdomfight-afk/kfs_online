-- O seed legado usava price_1T4OxORTJGXEa4Ic6QPrh39g (outra conta Stripe).
-- Na conta corrente (mesma série que trimestral/semestral/anual) o mensal 20 EUR é price_1TAFWfEnpsjluynENfLzoWWc.
UPDATE "PlanPrice"
SET "stripePriceId" = 'price_1TAFWfEnpsjluynENfLzoWWc'
WHERE "stripePriceId" = 'price_1T4OxORTJGXEa4Ic6QPrh39g';

UPDATE "Plan"
SET "stripePriceId" = 'price_1TAFWfEnpsjluynENfLzoWWc'
WHERE "stripePriceId" = 'price_1T4OxORTJGXEa4Ic6QPrh39g';
