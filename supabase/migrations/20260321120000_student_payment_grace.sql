-- Período de graça por pagamento em atraso (5 dias úteis) e suspensão sem apagar histórico.
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "paymentGraceEndsAt" timestamptz;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "paymentGraceReferenceMonth" text;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "paymentSuspendedAt" timestamptz;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "suspendedPlanId" text;

COMMENT ON COLUMN "Student"."paymentGraceEndsAt" IS 'Fim do prazo de 5 dias úteis após deteção de mensalidade em atraso (UTC).';
COMMENT ON COLUMN "Student"."paymentGraceReferenceMonth" IS 'Mês YYYY-MM associado ao aviso de atraso em curso.';
COMMENT ON COLUMN "Student"."paymentSuspendedAt" IS 'Quando o acesso foi suspenso por falta de pagamento após o prazo.';
COMMENT ON COLUMN "Student"."suspendedPlanId" IS 'Plano antes da suspensão; reposto após pagamento/renovação.';
