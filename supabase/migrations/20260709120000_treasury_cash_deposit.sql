-- Movimentos de tesouraria (ex.: depósito de espécie na conta bancária).

CREATE TABLE IF NOT EXISTS public."TreasuryMovement" (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'CASH_DEPOSIT' CHECK (kind IN ('CASH_DEPOSIT')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  "occurredOn" DATE NOT NULL,
  description TEXT,
  "createdByUserId" TEXT REFERENCES public."User"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "TreasuryMovement_occurredOn_idx" ON public."TreasuryMovement" ("occurredOn" DESC);
CREATE INDEX IF NOT EXISTS "TreasuryMovement_kind_idx" ON public."TreasuryMovement" (kind);

COMMENT ON TABLE public."TreasuryMovement" IS 'Transferências internas de tesouraria (espécie → conta).';
COMMENT ON COLUMN public."TreasuryMovement".kind IS 'CASH_DEPOSIT = levantar espécie do caixa físico e creditar na conta registada.';
