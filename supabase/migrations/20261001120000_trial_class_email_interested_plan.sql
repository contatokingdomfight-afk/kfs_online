-- O formulário de aula experimental só pedia telefone e não sabia que plano a pessoa tinha
-- clicado na home (todos os botões "Começar" levavam para o mesmo formulário genérico).
-- Email dá um segundo canal de contacto; interestedPlan guarda o plano de origem para a
-- secretaria saber o que a pessoa já tinha em mente ao marcar a aula.
ALTER TABLE "TrialClass" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "TrialClass" ADD COLUMN IF NOT EXISTS "interestedPlan" TEXT;
