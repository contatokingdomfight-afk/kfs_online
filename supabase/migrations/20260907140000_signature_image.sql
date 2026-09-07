-- Assinatura desenhada (dedo/rato) do termo de responsabilidade e do contrato de adesão,
-- ao lado do nome escrito já existente. Guarda o PNG no bucket "signatures" e o link aqui.
ALTER TABLE public."StudentWaiver" ADD COLUMN IF NOT EXISTS "signatureImageUrl" TEXT;
ALTER TABLE public."StudentMembershipAgreement" ADD COLUMN IF NOT EXISTS "signatureImageUrl" TEXT;

COMMENT ON COLUMN public."StudentWaiver"."signatureImageUrl" IS
  'URL pública do PNG da assinatura desenhada (bucket signatures).';
COMMENT ON COLUMN public."StudentMembershipAgreement"."signatureImageUrl" IS
  'URL pública do PNG da assinatura desenhada (bucket signatures).';

-- Bucket para as imagens de assinatura desenhada. Público: leitura por todos (link direto,
-- mesmo nível de proteção que os PDFs de curso hoje); escrita só via service role (rota de
-- upload em app/api/adesao/signature).
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "signatures_select_public" ON storage.objects;
CREATE POLICY "signatures_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'signatures');
