-- Bucket para PDFs de unidades de curso (slides/apresentações/artigos em PDF)
-- Bucket público: leitura por todos (link direto, mesmo nível de proteção que os vídeos hoje);
-- escrita só via service role (rota de upload em app/api/coach/course-unit-pdf).
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-materials', 'course-materials', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "course_materials_select_public" ON storage.objects;
CREATE POLICY "course_materials_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course-materials');
