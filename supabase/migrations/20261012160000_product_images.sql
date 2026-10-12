-- Fotos dos produtos da loja: lista ordenada [{ "url": "...", "color": "Preta" | null }], a 1.ª é a principal.
ALTER TABLE public."Product"
  ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public."Product".images IS 'Fotos [{url, color|null}] — a primeira é a principal; color associa a foto a uma cor das variantes';

-- Bucket público: leitura por todos; escrita só via service role (API admin).
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "product_images_select_public" ON storage.objects;
CREATE POLICY "product_images_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');
