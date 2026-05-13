-- Horário, local e imagem de divulgação dos eventos
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "start_time" time without time zone;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "end_time" time without time zone;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "location" text;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "banner_url" text;

COMMENT ON COLUMN "Event"."start_time" IS 'Hora de início (opcional; ver também start_date)';
COMMENT ON COLUMN "Event"."end_time" IS 'Hora de fim (opcional)';
COMMENT ON COLUMN "Event"."location" IS 'Local do evento (texto livre)';
COMMENT ON COLUMN "Event"."banner_url" IS 'URL pública da imagem (ex. Storage Supabase)';

-- Bucket público: leitura por todos; escrita via service role (API admin)
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-banners', 'event-banners', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "event_banners_select_public" ON storage.objects;
CREATE POLICY "event_banners_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-banners');
