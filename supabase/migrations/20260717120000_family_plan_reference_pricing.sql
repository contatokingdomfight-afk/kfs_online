-- Plano família: cobrança única no titular, com desconto % e "plano de referência"
-- por membro (usado só para calcular a base do desconto, não para acesso/feature-gating).

ALTER TABLE public."FamilyGroup"
  ADD COLUMN IF NOT EXISTS "discountPercent" NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK ("discountPercent" >= 0 AND "discountPercent" <= 100);

ALTER TABLE public."FamilyGroupMember"
  ADD COLUMN IF NOT EXISTS "referencePlanId" TEXT REFERENCES public."Plan"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS family_group_member_reference_plan_idx
  ON public."FamilyGroupMember" ("referencePlanId");

COMMENT ON COLUMN public."FamilyGroup"."discountPercent" IS 'Desconto % sobre a soma dos planos de referência dos membros; default do grupo, editável, aplicado ao gerar/recalcular a mensalidade do titular.';
COMMENT ON COLUMN public."FamilyGroupMember"."referencePlanId" IS 'Plano "como se fosse individual" usado só para compor a base de cálculo da mensalidade familiar (não concede acesso — acesso vem do Student.planId = plan-familia).';
