-- Snapshot canónico dos 4 planos da base legada (Supabase KFS) + preço mensal Stripe usado lá.
-- Idempotente: INSERT ... ON CONFLICT (id) DO UPDATE repõe nome, descrição, preços, flags e stripePriceId.

INSERT INTO "Plan" (
  id,
  name,
  description,
  "priceMonthly",
  "schoolId",
  "includesDigitalAccess",
  "modalityScope",
  "isActive",
  "createdAt",
  "updatedAt",
  "stripePriceId",
  includes_performance_tracking,
  includes_check_in,
  max_check_ins_per_day,
  includes_exclusive_benefits
) VALUES
  (
    'plan-full',
    'Kingdom FULL (Plano III)',
    'Acesso ilimitado ao ginásio (todas as modalidades) + plataforma digital + ofertas sazonais (ex.: camiseta).',
    100,
    'default-school-001',
    true,
    'ALL',
    true,
    '2026-02-22 20:10:24.624519'::timestamptz,
    '2026-02-22 20:10:24.624519'::timestamptz,
    NULL,
    true,
    true,
    NULL,
    true
  ),
  (
    'plan-online',
    'Kingdom Online',
    'Acesso à plataforma digital: cursos técnicos, workshops digitais e biblioteca para treino remoto e revisão técnica.',
    20,
    'default-school-001',
    true,
    'NONE',
    true,
    '2026-02-22 20:10:24.624519'::timestamptz,
    '2026-02-22 20:10:24.624519'::timestamptz,
    'price_1T4OxORTJGXEa4Ic6QPrh39g',
    false,
    false,
    0,
    false
  ),
  (
    'plan-presencial-i',
    'Kingdom Presencial Modalidade (Plano I)',
    'Acesso presencial ilimitado a uma modalidade (Muay Thai, Jiu-Jitsu ou Boxing). Não inclui plataforma digital.',
    50,
    'default-school-001',
    false,
    'SINGLE',
    true,
    '2026-02-22 20:10:24.624519'::timestamptz,
    '2026-02-22 20:10:24.624519'::timestamptz,
    NULL,
    true,
    true,
    1,
    false
  ),
  (
    'plan-presencial-ii',
    'Kingdom Presencial MMA (Plano II)',
    'Acesso presencial a todas as modalidades + acesso total à plataforma digital.',
    80,
    'default-school-001',
    true,
    'ALL',
    true,
    '2026-02-22 20:10:24.624519'::timestamptz,
    '2026-02-22 20:10:24.624519'::timestamptz,
    NULL,
    true,
    true,
    NULL,
    false
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "priceMonthly" = EXCLUDED."priceMonthly",
  "schoolId" = EXCLUDED."schoolId",
  "includesDigitalAccess" = EXCLUDED."includesDigitalAccess",
  "modalityScope" = EXCLUDED."modalityScope",
  "isActive" = EXCLUDED."isActive",
  "createdAt" = EXCLUDED."createdAt",
  "stripePriceId" = EXCLUDED."stripePriceId",
  includes_performance_tracking = EXCLUDED.includes_performance_tracking,
  includes_check_in = EXCLUDED.includes_check_in,
  max_check_ins_per_day = EXCLUDED.max_check_ins_per_day,
  includes_exclusive_benefits = EXCLUDED.includes_exclusive_benefits,
  "updatedAt" = now();

-- PlanPrice mensal na base legada usa este price id (trimestral/semestral/anual mantêm os outros ids já em uso)
UPDATE "PlanPrice"
SET "stripePriceId" = 'price_1T4OxORTJGXEa4Ic6QPrh39g'
WHERE "planId" = 'plan-online' AND "intervalMonths" = 1;
