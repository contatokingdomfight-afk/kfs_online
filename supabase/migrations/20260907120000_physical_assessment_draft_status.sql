-- Permite guardar a Ficha de Anamnese e Avaliação Física como rascunho (incompleta) e
-- retomar depois, sem que isso conte como "a avaliação atual" do aluno em nenhum lugar
-- (validade de 6 meses, radar de performance, conquista de gamificação, etc.).
ALTER TABLE public."StudentPhysicalAssessment"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'SUBMITTED';

ALTER TABLE public."StudentPhysicalAssessment"
  DROP CONSTRAINT IF EXISTS "StudentPhysicalAssessment_status_check";
ALTER TABLE public."StudentPhysicalAssessment"
  ADD CONSTRAINT "StudentPhysicalAssessment_status_check" CHECK ("status" IN ('DRAFT', 'SUBMITTED'));

-- Rascunho pode não ter liberação escolhida nem data de renovação calculada ainda.
ALTER TABLE public."StudentPhysicalAssessment" ALTER COLUMN "clearance" DROP NOT NULL;
ALTER TABLE public."StudentPhysicalAssessment" ALTER COLUMN "nextDueAt" DROP NOT NULL;

COMMENT ON COLUMN public."StudentPhysicalAssessment"."status" IS
  'DRAFT = ainda em preenchimento (não conta como avaliação atual do aluno); SUBMITTED = entregue.';
