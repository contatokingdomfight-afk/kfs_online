-- Campos para o professor editar no próprio perfil (configurações)
ALTER TABLE "Coach" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "Coach" ADD COLUMN IF NOT EXISTS "date_of_birth" date;

COMMENT ON COLUMN "Coach"."phone" IS 'Telefone do professor (editável na área professor).';
COMMENT ON COLUMN "Coach"."date_of_birth" IS 'Data de nascimento do professor (editável na área professor).';
