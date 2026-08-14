-- Configuração do avatar de gamificação (cor de equipamento, bandana, faixa visível).
-- Ids do catálogo (lib/avatar-cosmetics.ts), nunca cor/forma crua.

ALTER TABLE "Athlete" ADD COLUMN IF NOT EXISTS "avatarConfig" jsonb;

COMMENT ON COLUMN "Athlete"."avatarConfig" IS 'Personalização do avatar de gamificação (ex: {"gearColor":"gear_red","headband":"headband_none","showBeltSash":true}). Nulo = valores por omissão.';
