-- Migration: Detalhe por dia da semana do Tema da Semana
-- Data: 2026-08-29
-- Descrição: Tabela WeekThemeDay para o coach detalhar o tema por dia da semana
-- (Segunda=1..Domingo=7, igual à convenção de Lesson.weekday), ligada por FK a WeekTheme.

-- 1. Criar tabela WeekThemeDay
CREATE TABLE IF NOT EXISTS "WeekThemeDay" (
  "modality" TEXT NOT NULL,
  "week_start" DATE NOT NULL,
  "weekday" INTEGER NOT NULL,
  "topic" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("modality", "week_start", "weekday"),
  CONSTRAINT "WeekThemeDay_weekday_check" CHECK ("weekday" BETWEEN 1 AND 7)
);

-- 2. Foreign key para WeekTheme (a linha do dia só existe se a semana+modalidade já tiver um tema)
ALTER TABLE "WeekThemeDay" DROP CONSTRAINT IF EXISTS "WeekThemeDay_week_theme_fkey";
ALTER TABLE "WeekThemeDay" ADD CONSTRAINT "WeekThemeDay_week_theme_fkey"
  FOREIGN KEY ("modality", "week_start") REFERENCES "WeekTheme"("modality", "week_start") ON DELETE CASCADE;

-- 3. Índice para consultas por semana (o dashboard do aluno lê por week_start, todas as modalidades)
CREATE INDEX IF NOT EXISTS "WeekThemeDay_week_start_idx" ON "WeekThemeDay"("week_start");

-- 4. RLS — mesmo padrão do resto do projeto (autorização real fica na app; RLS só exige sessão autenticada)
ALTER TABLE "WeekThemeDay" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_authenticated ON "WeekThemeDay";
CREATE POLICY allow_authenticated ON "WeekThemeDay" FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE "WeekThemeDay" IS 'Detalhe por dia da semana (Segunda=1..Domingo=7) dentro do Tema da Semana (WeekTheme)';
