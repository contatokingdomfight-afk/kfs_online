-- Modalidades extra do aluno (ex.: aluno do KIDS que também treina na turma de adultos).
-- Somam-se à modalidade do plano: o aluno aparece na lista de presença dessas aulas e pode
-- fazer check-in nelas pela app. Marcado pela secretaria na ficha do aluno.
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "extraModalities" text[] NOT NULL DEFAULT '{}';
