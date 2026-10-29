-- Multi-escola PM Team — fim da Fase 2: schoolId passa a obrigatório onde o código já o garante.
-- Pré-condição verificada em PRD (2026-10-30): 0 linhas sem escola em todas estas tabelas.
--
-- Fica OBRIGATÓRIO (o código grava sempre a escola, ou o trigger fill_school_id preenche-a):
--   Payment, PaymentCheckout, AutoPay  → têm sempre aluno ou grupo familiar (escola via trigger)
--   FinancialExpense, FinancialRevenue, TreasuryMovement, GraduationExamEvent → gravados com a escola do seletor
--
-- Fica OPCIONAL por agora (ainda são únicos da rede; passam a obrigatórios com «Meios de pagamento» por escola):
--   BankTransaction, RevolutConnection (ligação Revolut única), InsuranceSettings (valores de seguro únicos)
-- Fica OPCIONAL de propósito (NULL = da rede): Event, AttendanceGoal, waitlist.

-- Rede de segurança: se alguma linha ficou sem escola desde a verificação, preenche como na Fase 1.
UPDATE public."Payment" p SET "schoolId" = COALESCE(
  (SELECT s."schoolId" FROM public."Student" s WHERE s.id = p."studentId"),
  (SELECT f."schoolId" FROM public."FamilyGroup" f WHERE f.id = p."familyGroupId"))
WHERE p."schoolId" IS NULL;
UPDATE public."AutoPay" a SET "schoolId" = COALESCE(
  (SELECT s."schoolId" FROM public."Student" s WHERE s.id = a."studentId"),
  (SELECT f."schoolId" FROM public."FamilyGroup" f WHERE f.id = a."familyGroupId"))
WHERE a."schoolId" IS NULL;
UPDATE public."PaymentCheckout" c SET "schoolId" = s."schoolId"
FROM public."Student" s WHERE s.id = c."studentId" AND c."schoolId" IS NULL;

ALTER TABLE public."Payment"             ALTER COLUMN "schoolId" SET NOT NULL;
ALTER TABLE public."PaymentCheckout"     ALTER COLUMN "schoolId" SET NOT NULL;
ALTER TABLE public."AutoPay"             ALTER COLUMN "schoolId" SET NOT NULL;
ALTER TABLE public."FinancialExpense"    ALTER COLUMN "schoolId" SET NOT NULL;
ALTER TABLE public."FinancialRevenue"    ALTER COLUMN "schoolId" SET NOT NULL;
ALTER TABLE public."TreasuryMovement"    ALTER COLUMN "schoolId" SET NOT NULL;
ALTER TABLE public."GraduationExamEvent" ALTER COLUMN "schoolId" SET NOT NULL;

-- O trigger fill_school_id continua: preenche a escola a partir do aluno/família nos pagamentos
-- (cron de mensalidades, Revolut, Stripe) e, com uma só escola ativa, nos restantes.
COMMENT ON FUNCTION public.fill_school_id() IS
  'Preenche schoolId no INSERT: escola do aluno, depois do grupo familiar, depois a única escola ativa (se só houver uma).';
