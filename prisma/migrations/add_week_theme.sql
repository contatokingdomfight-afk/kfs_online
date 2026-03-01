-- Migration: Sala de Aula Invertida – Tema da Semana
-- Data: 2026-02-28
-- Descrição: Tabela WeekTheme para o coach definir o tema da semana por modalidade e associar vídeo da biblioteca

-- 1. Criar tabela WeekTheme
CREATE TABLE IF NOT EXISTS "WeekTheme" (
  "modality" TEXT NOT NULL,
  "week_start" DATE NOT NULL,
  "title" TEXT NOT NULL,
  "course_id" TEXT,
  "video_url" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("modality", "week_start")
);

-- 2. Foreign key para Course (opcional)
ALTER TABLE "WeekTheme" DROP CONSTRAINT IF EXISTS "WeekTheme_course_id_fkey";
ALTER TABLE "WeekTheme" ADD CONSTRAINT "WeekTheme_course_id_fkey"
  FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE SET NULL;

-- 3. Adicionar video_url se a tabela já existir (para vídeo direto sem curso)
ALTER TABLE "WeekTheme" ADD COLUMN IF NOT EXISTS "video_url" TEXT;

-- 4. Índice para consultas por semana
CREATE INDEX IF NOT EXISTS "WeekTheme_week_start_idx" ON "WeekTheme"("week_start");

COMMENT ON TABLE "WeekTheme" IS 'Tema da Semana (Sala de Aula Invertida) – por modalidade e semana';
