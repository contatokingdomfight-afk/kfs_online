-- Configuração dos planos para a remuneração dos professores (decisões de 2026-11-24/25).
-- PROPOSTA — aplicar só depois de aprovado. Corre numa transação; não apaga nada.
--
--  Kingdom Fighter (55 €, 1 modalidade) ............ 40% do valor sem IVA
--  Kingdom Kids (40 €, 1 modalidade KIDS) .......... 40%  (fica a 40 € para os atuais)
--  Kingdom Week (25 €) ............................. 10 € fixos
--  Kingdom Elite (100 €, todas) .................... 80% ÷ professores de adultos da escola
--  Kingdom Champion (80 €) → passa a 2 modalidades . 35% por modalidade (os 8 membros da família Kingdom passam para o Elite)
--  Kingdom Kids Duo (65 €, 2 modalidades KIDS) ..... NOVO, 35% por modalidade
--  Família, Digital, testes, demo .................. professor não recebe (a família conta pelo plano de referência de cada membro)
--  Modalidade nova: Jiu-Jitsu KIDS (BJJKIDS)

BEGIN;

UPDATE public."Plan" SET "coachShareMode" = 'PER_MODALITY', "coachShareValue" = 40, "updatedAt" = now()
 WHERE id IN ('plan-presencial-i', '2b0546dd-bd5f-4752-a52d-dc004dce059d');

UPDATE public."Plan" SET "coachShareMode" = 'FIXED', "coachShareValue" = 10, "updatedAt" = now()
 WHERE id = '32873676-d3b8-48bf-8906-c103b2c20314';

UPDATE public."Plan" SET "coachShareMode" = 'SPLIT_POOL', "coachShareValue" = 80, "updatedAt" = now()
 WHERE id = 'plan-full';

-- Família Kingdom (grupo com 100% de desconto): os membros que tinham o Champion como referência passam para o Elite.
UPDATE public."FamilyGroupMember" SET "referencePlanId" = 'plan-full'
 WHERE "referencePlanId" = 'plan-presencial-ii';

-- Champion passa a ser o pack de 2 modalidades a 80 € (sem alunos diretos).
UPDATE public."Plan"
   SET "modalityScope" = 'DUAL', "coachShareMode" = 'PER_MODALITY', "coachShareValue" = 35,
       description = '2 modalidades à escolha.', "updatedAt" = now()
 WHERE id = 'plan-presencial-ii';

-- Pack KIDS de 2 modalidades (65 €): copia as opções do Kingdom Kids.
INSERT INTO public."Plan" (
  id, name, description, "priceMonthly", "schoolId", "includesDigitalAccess", "modalityScope", "isActive",
  "createdAt", "updatedAt", includes_performance_tracking, includes_check_in, max_check_ins_per_day,
  includes_exclusive_benefits, max_check_ins_per_month, "loyaltyMonthlyDiscount", "coachShareMode", "coachShareValue"
)
SELECT 'plan-kids-duo', 'Kingdom Kids Duo', '2 modalidades KIDS à escolha (Muay Thai KIDS, Jiu-Jitsu KIDS, Boxing Kids).', 65,
       "schoolId", "includesDigitalAccess", 'DUAL', true, now(), now(), includes_performance_tracking, includes_check_in,
       max_check_ins_per_day, includes_exclusive_benefits, max_check_ins_per_month, NULL, 'PER_MODALITY', 35
  FROM public."Plan" WHERE id = '2b0546dd-bd5f-4752-a52d-dc004dce059d'
ON CONFLICT (id) DO NOTHING;

-- Modalidade Jiu-Jitsu KIDS (rede).
INSERT INTO public."ModalityRef" (code, name, "sortOrder")
SELECT 'BJJKIDS', 'Jiu-Jitsu KIDS', COALESCE(MAX("sortOrder"), 0) + 1 FROM public."ModalityRef"
ON CONFLICT (code) DO NOTHING;

COMMIT;
