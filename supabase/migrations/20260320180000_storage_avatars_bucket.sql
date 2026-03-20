-- Bucket público para fotos de perfil (Supabase Storage).
-- Caminho: {auth.uid()}/avatar — apenas o próprio utilizador autenticado pode escrever na sua pasta.

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública (URLs públicas do bucket)
CREATE POLICY "avatars_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Upload / atualizar / apagar só na pasta com o primeiro segmento = auth.uid()
CREATE POLICY "avatars_insert_own_folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = (auth.uid())::text
);

CREATE POLICY "avatars_update_own_folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = (auth.uid())::text
);

CREATE POLICY "avatars_delete_own_folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = (auth.uid())::text
);
