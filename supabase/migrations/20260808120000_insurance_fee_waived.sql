-- Permite dispensar o seguro no primeiro pagamento (admin), tal como já acontece com a matrícula.

ALTER TABLE public."Student"
  ADD COLUMN IF NOT EXISTS "insuranceFeeWaived" BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public."Student"."insuranceFeeWaived" IS 'true quando o seguro do ano corrente foi dispensado/isento no primeiro pagamento.';
