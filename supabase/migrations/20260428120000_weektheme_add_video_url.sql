-- Tema da semana: URL de vídeo opcional (biblioteca ou link direto).
-- O schema EU em 20260414130000 criou WeekTheme sem video_url; o app já faz upsert/select nessa coluna.
ALTER TABLE "WeekTheme" ADD COLUMN IF NOT EXISTS "video_url" TEXT;

COMMENT ON COLUMN "WeekTheme"."video_url" IS 'Vídeo opcional (URL) quando não se usa só course_id da biblioteca.';
