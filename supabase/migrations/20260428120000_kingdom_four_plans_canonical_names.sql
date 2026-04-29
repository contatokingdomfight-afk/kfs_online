-- Nomes, descrições e flags alinhados aos 4 planos comerciais Kingdom.
-- Idempotente: aplica-se por `id` fixo (legado + default-school-001).

UPDATE "Plan" SET
  name = 'Kingdom Básico',
  description = 'Acesso à biblioteca digital (cursos e conteúdos). Não inclui aulas presenciais, check-in nem acompanhamento de performance no ginásio.',
  "modalityScope" = 'NONE',
  "includesDigitalAccess" = true,
  includes_performance_tracking = false,
  includes_check_in = false,
  max_check_ins_per_day = 0,
  includes_exclusive_benefits = false,
  "priceMonthly" = 20.00,
  "updatedAt" = now()
WHERE id = 'plan-online';

UPDATE "Plan" SET
  name = 'Kingdom Presencial I',
  description = 'Acesso à plataforma (check-in, desempenho) sem biblioteca de conhecimento por defeito. Biblioteca digital opcional (+20€/mês, subscrição adicional). Uma modalidade; uma aula com check-in por dia.',
  "modalityScope" = 'SINGLE',
  "includesDigitalAccess" = false,
  includes_performance_tracking = true,
  includes_check_in = true,
  max_check_ins_per_day = 1,
  includes_exclusive_benefits = false,
  "priceMonthly" = 55.00,
  "updatedAt" = now()
WHERE id = 'plan-presencial-i';

UPDATE "Plan" SET
  name = 'Kingdom Presencial MMA',
  description = 'Toda a plataforma, com biblioteca digital, todas as modalidades e aulas (check-in) ilimitadas por dia.',
  "modalityScope" = 'ALL',
  "includesDigitalAccess" = true,
  includes_performance_tracking = true,
  includes_check_in = true,
  max_check_ins_per_day = null,
  includes_exclusive_benefits = false,
  "priceMonthly" = 80.00,
  "updatedAt" = now()
WHERE id = 'plan-presencial-ii';

UPDATE "Plan" SET
  name = 'Kingdom FULL',
  description = 'Tudo o do Kingdom Presencial MMA, com brindes e benefícios exclusivos.',
  "modalityScope" = 'ALL',
  "includesDigitalAccess" = true,
  includes_performance_tracking = true,
  includes_check_in = true,
  max_check_ins_per_day = null,
  includes_exclusive_benefits = true,
  "priceMonthly" = 100.00,
  "updatedAt" = now()
WHERE id = 'plan-full';
