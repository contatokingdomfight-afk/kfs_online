-- Comprovativo de pagamento (recibo/print de transferência) anexado pelo aluno na ficha de adesão.
-- Acesso ao ficheiro é sempre mediado pelo servidor (cliente admin / service role) via signed URL —
-- por isso o bucket fica privado e sem políticas de storage.objects para authenticated/anon.

ALTER TABLE public."StudentEnrollmentForm"
  ADD COLUMN IF NOT EXISTS "paymentProofPath" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentProofFileName" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentProofUploadedAt" TIMESTAMPTZ;

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;
