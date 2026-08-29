-- Migration: Tema do Mês (fallback quando a semana não tem título próprio)
-- Data: 2026-08-29
-- Descrição: Tabela MonthTheme — título/descrição por modalidade e mês, usados no
-- dashboard do aluno quando a semana atual (WeekTheme) não tiver título próprio.

CREATE TABLE IF NOT EXISTS "MonthTheme" (
  "modality" TEXT NOT NULL,
  "month_start" DATE NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("modality", "month_start")
);

CREATE INDEX IF NOT EXISTS "MonthTheme_month_start_idx" ON "MonthTheme"("month_start");

-- RLS — mesmo padrão do resto do projeto (autorização real fica na app)
ALTER TABLE "MonthTheme" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_authenticated ON "MonthTheme";
CREATE POLICY allow_authenticated ON "MonthTheme" FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE "MonthTheme" IS 'Tema do mês (título/descrição) por modalidade — fallback do WeekTheme quando a semana não tem título próprio';
