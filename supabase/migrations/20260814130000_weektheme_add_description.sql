-- Plano da semana: texto livre além do título (coach → aluno no dashboard).
ALTER TABLE "WeekTheme" ADD COLUMN IF NOT EXISTS "description" TEXT;

COMMENT ON COLUMN "WeekTheme"."description" IS 'Descrição opcional do plano da semana (o que se vai trabalhar ao longo dos dias).';
