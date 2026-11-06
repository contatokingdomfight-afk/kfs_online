-- Pedido de grupo familiar feito pelo aluno no fim da adesão (/adesao/pagamento).
-- A mensalidade fica em espera até o admin o juntar a um grupo; limpa-se ao entrar no grupo.
ALTER TABLE public."StudentEnrollmentForm"
  ADD COLUMN IF NOT EXISTS "familyGroupRequested" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "familyGroupRequestedAt" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "StudentEnrollmentForm_familyGroupRequested_idx"
  ON public."StudentEnrollmentForm" ("familyGroupRequested")
  WHERE "familyGroupRequested";
