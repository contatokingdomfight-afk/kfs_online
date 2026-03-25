-- Atalho admin «Acesso total»: distinguir de plano atribuído manualmente ou Stripe
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "adminGrantedFullAccess" boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN "Student"."adminGrantedFullAccess" IS 'True quando o plano FULL foi atribuído pelo atalho «Atribuir acesso total» na admin; false após alteração manual, Stripe ou remoção.';
