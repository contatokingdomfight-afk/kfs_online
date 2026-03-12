-- Novos campos para controlar permissões por plano
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "includes_performance_tracking" boolean DEFAULT true;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "includes_check_in" boolean DEFAULT true;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "max_check_ins_per_day" integer;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "includes_exclusive_benefits" boolean DEFAULT false;

COMMENT ON COLUMN "Plan"."includes_performance_tracking" IS 'Acesso à página de performance e métricas';
COMMENT ON COLUMN "Plan"."includes_check_in" IS 'Acesso ao check-in de aulas presenciais';
COMMENT ON COLUMN "Plan"."max_check_ins_per_day" IS '0=sem check-in, 1=uma vez/dia, null=ilimitado';
COMMENT ON COLUMN "Plan"."includes_exclusive_benefits" IS 'Brindes e benefícios exclusivos (FULL)';

-- Kingdom Online: sem performance, sem check-in
UPDATE "Plan" SET
  includes_performance_tracking = false,
  includes_check_in = false,
  max_check_ins_per_day = 0,
  includes_exclusive_benefits = false
WHERE modality_scope = 'NONE' AND name ILIKE '%Online%';

-- Kingdom Presencial I: performance, check-in 1/dia, 50€
UPDATE "Plan" SET
  includes_performance_tracking = true,
  includes_check_in = true,
  max_check_ins_per_day = 1,
  includes_exclusive_benefits = false,
  price_monthly = 50
WHERE modality_scope = 'SINGLE' AND (name ILIKE '%Presencial%Modalidade%' OR name ILIKE '%Plano I%');

-- Kingdom Presencial MMA: performance, check-in ilimitado
UPDATE "Plan" SET
  includes_performance_tracking = true,
  includes_check_in = true,
  max_check_ins_per_day = null,
  includes_exclusive_benefits = false
WHERE modality_scope = 'ALL' AND name ILIKE '%MMA%' AND name NOT ILIKE '%FULL%';

-- Kingdom FULL: performance, check-in ilimitado, benefícios exclusivos
UPDATE "Plan" SET
  includes_performance_tracking = true,
  includes_check_in = true,
  max_check_ins_per_day = null,
  includes_exclusive_benefits = true
WHERE name ILIKE '%FULL%';
