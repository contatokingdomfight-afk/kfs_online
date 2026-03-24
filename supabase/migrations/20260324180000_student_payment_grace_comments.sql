-- Atualiza comentários das colunas de grace/suspensão (regra: fim do dia 10 em Europe/Lisboa).
COMMENT ON COLUMN "Student"."paymentGraceEndsAt" IS 'Fim do dia civil 10 (Europe/Lisboa) para regularizar a mensalidade em atraso; após este instante o cron pode suspender o acesso (planId null).';
COMMENT ON COLUMN "Student"."paymentGraceReferenceMonth" IS 'Mês YYYY-MM da mensalidade associada ao aviso de atraso.';
COMMENT ON COLUMN "Student"."paymentSuspendedAt" IS 'Quando o acesso foi suspenso por falta de pagamento após o prazo.';
COMMENT ON COLUMN "Student"."suspendedPlanId" IS 'Plano antes da suspensão; reposto após pagamento PAID ou regularização.';
