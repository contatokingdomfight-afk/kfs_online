-- Coach: ativar/desativar acesso à plataforma (admin pode desativar sem excluir)
ALTER TABLE "Coach" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN "Coach"."is_active" IS 'Se false, o coach não consegue aceder à área /coach (admin pode reativar).';
