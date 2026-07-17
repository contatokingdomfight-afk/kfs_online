-- Bolsistas / staff com acesso total: limpar suspensão residual e repor ATIVO.

UPDATE public."Student"
SET
  status = 'ATIVO',
  "paymentSuspendedAt" = NULL,
  "suspendedPlanId" = NULL
WHERE "adminGrantedFullAccess" = true
  AND (status <> 'ATIVO' OR "paymentSuspendedAt" IS NOT NULL OR "suspendedPlanId" IS NOT NULL);
