-- Contrato de adesão por escola. Só acrescenta colunas: os contratos atuais ficam como estão.
-- Tem de ir para PRD ANTES do código: o gate do middleware lê "contractParty".

-- Entidade contratante de cada escola (o NIF já existe em SchoolPaymentSettings.nif).
-- A Sede não usa estes campos: o texto dela é fixo em lib/membership-agreement-content.ts.
ALTER TABLE public."School"
  ADD COLUMN IF NOT EXISTS "legalName" TEXT,
  ADD COLUMN IF NOT EXISTS "legalAddress" TEXT;

-- contractParty: dados da escola no momento da assinatura; NULL = texto original da Sede.
-- signatureHistory: assinaturas anteriores, guardadas quando o aluno assina de novo.
ALTER TABLE public."StudentMembershipAgreement"
  ADD COLUMN IF NOT EXISTS "contractParty" JSONB,
  ADD COLUMN IF NOT EXISTS "signatureHistory" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public."StudentWaiver"
  ADD COLUMN IF NOT EXISTS "contractParty" JSONB,
  ADD COLUMN IF NOT EXISTS "signatureHistory" JSONB NOT NULL DEFAULT '[]'::jsonb;
