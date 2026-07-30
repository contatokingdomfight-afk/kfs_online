-- Cadastro presencial vs convite por email (secretaria).
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "registrationMode" TEXT NOT NULL DEFAULT 'INVITE';
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "syntheticLoginEmail" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Student" DROP CONSTRAINT IF EXISTS "Student_registrationMode_check";
ALTER TABLE "Student" ADD CONSTRAINT "Student_registrationMode_check"
  CHECK ("registrationMode" IN ('INVITE', 'PRESENTIAL'));

COMMENT ON COLUMN "Student"."registrationMode" IS 'INVITE = convite por email; PRESENTIAL = secretaria criou conta com senha inicial.';
COMMENT ON COLUMN "Student"."syntheticLoginEmail" IS 'True quando o login usa email gerado (@alunos.kingdomfight.pt), sem caixa de correio real.';
