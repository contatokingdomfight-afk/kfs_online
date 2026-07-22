-- Prémio anual do seguro desportivo federado (PDCR): 25 € por aderente.
UPDATE public."InsuranceSettings"
SET "annualAmount" = 25,
    "updatedAt" = NOW()
WHERE id = 'global'
  AND "annualAmount" <> 25;

COMMENT ON COLUMN public."StudentEnrollmentForm"."paymentMethod" IS 'CASH | TRANSFER (legado: DEBIT_DIRECT | OTHER)';
