-- Campo para controlar se o aluno completou o wizard de onboarding
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "hasCompletedOnboarding" boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN "StudentProfile"."hasCompletedOnboarding" IS 'Se true, o aluno completou o wizard de onboarding (dados pessoais, objetivos, escola).';

-- Campo para armazenar objetivos selecionados no onboarding (JSON array de códigos)
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "goals" jsonb;
COMMENT ON COLUMN "StudentProfile"."goals" IS 'Objetivos selecionados no onboarding (ex: ["DEFESA_PESSOAL","COMPETIR","CONDICIONAMENTO","ALIVIAR_STRESS"]).';
