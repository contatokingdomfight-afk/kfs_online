-- Multi-escola PM Team — Fase 1 (só base de dados; o código passa a usar isto na Fase 2).
-- Tudo aditivo: colunas novas são opcionais e os dados atuais ficam na escola ativa ("default-school-001").
-- Nada muda para os utilizadores de hoje: os admins atuais passam a Admin Geral.

-- ─── 1. Admin Geral vs Diretor Técnico ──────────────────────────────────────
-- Admin Geral = ADMIN com isNetworkAdmin; Diretor Técnico = ADMIN sem a flag, ligado a escola(s) em "SchoolDirector".
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "isNetworkAdmin" BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN public."User"."isNetworkAdmin" IS 'Admin Geral: vê e gere todas as escolas. ADMIN sem esta flag só gere as escolas em SchoolDirector.';
UPDATE public."User" SET "isNetworkAdmin" = true WHERE role = 'ADMIN' AND "isNetworkAdmin" = false;

CREATE TABLE IF NOT EXISTS public."SchoolDirector" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "schoolId" TEXT NOT NULL REFERENCES public."School"(id) ON DELETE CASCADE,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "SchoolDirector_user_school_key" UNIQUE ("userId", "schoolId")
);
CREATE INDEX IF NOT EXISTS "SchoolDirector_school_idx" ON public."SchoolDirector" ("schoolId");
COMMENT ON TABLE public."SchoolDirector" IS 'Diretor Técnico: utilizador ADMIN que gere esta escola (backoffice limitado a ela).';

-- ─── 2. Partilha de relatórios ──────────────────────────────────────────────
-- Por omissão só o diretor (e o Admin Geral) vê os relatórios; o diretor partilha por área, com fim opcional.
CREATE TABLE IF NOT EXISTS public."ReportAccessGrant" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "schoolId" TEXT NOT NULL REFERENCES public."School"(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  area TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ,
  "grantedByUserId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "revokedAt" TIMESTAMPTZ,
  "revokedByUserId" TEXT,
  CONSTRAINT "ReportAccessGrant_area_check" CHECK (area IN ('FINANCE', 'STUDENTS', 'PERFORMANCE'))
);
-- Uma partilha ativa por pessoa/área; as revogadas ficam como histórico.
CREATE UNIQUE INDEX IF NOT EXISTS "ReportAccessGrant_active_key"
  ON public."ReportAccessGrant" ("schoolId", "userId", area) WHERE "revokedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "ReportAccessGrant_user_idx" ON public."ReportAccessGrant" ("userId");
COMMENT ON TABLE public."ReportAccessGrant" IS 'Acesso a relatórios da escola concedido pelo diretor (FINANCE / STUDENTS / PERFORMANCE).';

-- ─── 3. Meios de pagamento por escola ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public."SchoolPaymentSettings" (
  "schoolId" TEXT PRIMARY KEY REFERENCES public."School"(id) ON DELETE CASCADE,
  "ibanEnabled" BOOLEAN NOT NULL DEFAULT false,
  "ibanHolder" TEXT,
  iban TEXT,
  "bicSwift" TEXT,
  "ibanReferenceHint" TEXT,
  "mbwayEnabled" BOOLEAN NOT NULL DEFAULT false,
  "mbwayPhone" TEXT,
  "cashEnabled" BOOLEAN NOT NULL DEFAULT true,
  "revolutEnabled" BOOLEAN NOT NULL DEFAULT false,
  "multibancoEnabled" BOOLEAN NOT NULL DEFAULT false,
  "multibancoProvider" TEXT,
  "invoicingEnabled" BOOLEAN NOT NULL DEFAULT false,
  nif TEXT,
  "updatedByUserId" TEXT,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "SchoolPaymentSettings_mb_provider_check" CHECK ("multibancoProvider" IS NULL OR "multibancoProvider" IN ('EUPAGO', 'IFTHENPAY', 'EASYPAY'))
);
COMMENT ON TABLE public."SchoolPaymentSettings" IS 'Como os alunos da escola pagam (configurado pelo diretor). Chaves secretas ficam em SchoolPaymentSecret.';

-- Chaves/credenciais por escola, cifradas pela aplicação (AES-GCM); a base nunca vê o valor em claro.
CREATE TABLE IF NOT EXISTS public."SchoolPaymentSecret" (
  "schoolId" TEXT NOT NULL REFERENCES public."School"(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  last4 TEXT,
  "updatedByUserId" TEXT,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("schoolId", kind),
  CONSTRAINT "SchoolPaymentSecret_kind_check" CHECK (kind IN (
    'REVOLUT_MERCHANT_SECRET', 'REVOLUT_MERCHANT_PUBLIC', 'REVOLUT_WEBHOOK_SECRET',
    'MULTIBANCO_API_KEY', 'WEOINVOICE_EMAIL', 'WEOINVOICE_PASSWORD'
  ))
);
COMMENT ON TABLE public."SchoolPaymentSecret" IS 'Credenciais de pagamento/faturação por escola, cifradas. Sem linha = a escola usa as variáveis de ambiente (só a escola atual).';

-- Escola atual: os mesmos dados que hoje estão fixos em lib/enrollment-form.ts.
INSERT INTO public."SchoolPaymentSettings"
  ("schoolId", "ibanEnabled", "ibanHolder", iban, "bicSwift", "ibanReferenceHint", "cashEnabled", "revolutEnabled", nif)
SELECT 'default-school-001', true, 'Epicentro de Honra', 'LT383250045228499203', 'REVOLT21', 'Nome do aluno + mês', true, true, '519296850'
WHERE EXISTS (SELECT 1 FROM public."School" WHERE id = 'default-school-001')
ON CONFLICT ("schoolId") DO NOTHING;

-- ─── 4. schoolId nas tabelas que ainda não o têm ────────────────────────────
-- Opcional nesta fase (o código atual não o envia). Os triggers da secção 5 preenchem-no;
-- passa a NOT NULL numa migração no fim da Fase 2, quando o código o enviar sempre.

-- Dinheiro: guarda a escola onde foi pago (se o aluno mudar de escola, o histórico fica na antiga).
ALTER TABLE public."Payment"          ADD COLUMN IF NOT EXISTS "schoolId" TEXT REFERENCES public."School"(id);
ALTER TABLE public."PaymentCheckout"  ADD COLUMN IF NOT EXISTS "schoolId" TEXT REFERENCES public."School"(id);
ALTER TABLE public."AutoPay"          ADD COLUMN IF NOT EXISTS "schoolId" TEXT REFERENCES public."School"(id);
ALTER TABLE public."FinancialExpense" ADD COLUMN IF NOT EXISTS "schoolId" TEXT REFERENCES public."School"(id);
ALTER TABLE public."FinancialRevenue" ADD COLUMN IF NOT EXISTS "schoolId" TEXT REFERENCES public."School"(id);
ALTER TABLE public."TreasuryMovement" ADD COLUMN IF NOT EXISTS "schoolId" TEXT REFERENCES public."School"(id);
ALTER TABLE public."BankTransaction"  ADD COLUMN IF NOT EXISTS "schoolId" TEXT REFERENCES public."School"(id);
ALTER TABLE public."RevolutConnection" ADD COLUMN IF NOT EXISTS "schoolId" TEXT REFERENCES public."School"(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "RevolutConnection_school_key" ON public."RevolutConnection" ("schoolId");

-- Seguro/inscrição: valores por escola (uma linha por escola).
ALTER TABLE public."InsuranceSettings" ADD COLUMN IF NOT EXISTS "schoolId" TEXT REFERENCES public."School"(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "InsuranceSettings_school_key" ON public."InsuranceSettings" ("schoolId");

-- Exames de graduação acontecem numa escola (o programa continua a ser da rede).
ALTER TABLE public."GraduationExamEvent" ADD COLUMN IF NOT EXISTS "schoolId" TEXT REFERENCES public."School"(id);

-- NULL = da rede inteira.
ALTER TABLE public."Event"          ADD COLUMN IF NOT EXISTS "schoolId" TEXT REFERENCES public."School"(id);
ALTER TABLE public."AttendanceGoal" ADD COLUMN IF NOT EXISTS "schoolId" TEXT REFERENCES public."School"(id);
ALTER TABLE public."waitlist"       ADD COLUMN IF NOT EXISTS "schoolId" TEXT REFERENCES public."School"(id);

CREATE INDEX IF NOT EXISTS "Payment_school_idx"             ON public."Payment" ("schoolId");
CREATE INDEX IF NOT EXISTS "PaymentCheckout_school_idx"     ON public."PaymentCheckout" ("schoolId");
CREATE INDEX IF NOT EXISTS "AutoPay_school_idx"             ON public."AutoPay" ("schoolId");
CREATE INDEX IF NOT EXISTS "FinancialExpense_school_idx"    ON public."FinancialExpense" ("schoolId", "occurredOn");
CREATE INDEX IF NOT EXISTS "FinancialRevenue_school_idx"    ON public."FinancialRevenue" ("schoolId", "occurredOn");
CREATE INDEX IF NOT EXISTS "TreasuryMovement_school_idx"    ON public."TreasuryMovement" ("schoolId", "occurredOn");
CREATE INDEX IF NOT EXISTS "BankTransaction_school_idx"     ON public."BankTransaction" ("schoolId", "occurredAt");
CREATE INDEX IF NOT EXISTS "GraduationExamEvent_school_idx" ON public."GraduationExamEvent" ("schoolId");
CREATE INDEX IF NOT EXISTS "Event_school_idx"               ON public."Event" ("schoolId");

-- Dados atuais: pagamentos pela escola do aluno/família; o resto pela escola ativa.
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

UPDATE public."FinancialExpense"    SET "schoolId" = 'default-school-001' WHERE "schoolId" IS NULL;
UPDATE public."FinancialRevenue"    SET "schoolId" = 'default-school-001' WHERE "schoolId" IS NULL;
UPDATE public."TreasuryMovement"    SET "schoolId" = 'default-school-001' WHERE "schoolId" IS NULL;
UPDATE public."BankTransaction"     SET "schoolId" = 'default-school-001' WHERE "schoolId" IS NULL;
UPDATE public."RevolutConnection"   SET "schoolId" = 'default-school-001' WHERE "schoolId" IS NULL;
UPDATE public."InsuranceSettings"   SET "schoolId" = 'default-school-001' WHERE "schoolId" IS NULL;
UPDATE public."GraduationExamEvent" SET "schoolId" = 'default-school-001' WHERE "schoolId" IS NULL;
-- Event, AttendanceGoal e waitlist ficam NULL (= rede) até o admin os atribuir.

-- ─── 5. Preencher schoolId automaticamente enquanto o código não o envia ────
-- 1.º pela escola do aluno / grupo familiar; senão, se só houver UMA escola ativa, essa.
-- Com duas escolas ativas e sem aluno, fica NULL — por isso a Fase 2 tem de estar no ar antes de ativar a 2.ª escola.
CREATE OR REPLACE FUNCTION public.fill_school_id() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  row_json JSONB := to_jsonb(NEW);
  active_ids TEXT[];
BEGIN
  IF NEW."schoolId" IS NOT NULL THEN RETURN NEW; END IF;
  IF row_json ? 'studentId' AND row_json->>'studentId' IS NOT NULL THEN
    SELECT "schoolId" INTO NEW."schoolId" FROM "Student" WHERE id = row_json->>'studentId';
  END IF;
  IF NEW."schoolId" IS NULL AND row_json ? 'familyGroupId' AND row_json->>'familyGroupId' IS NOT NULL THEN
    SELECT "schoolId" INTO NEW."schoolId" FROM "FamilyGroup" WHERE id = row_json->>'familyGroupId';
  END IF;
  IF NEW."schoolId" IS NULL THEN
    SELECT array_agg(id) INTO active_ids FROM "School" WHERE "isActive";
    IF array_length(active_ids, 1) = 1 THEN NEW."schoolId" := active_ids[1]; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['Payment', 'PaymentCheckout', 'AutoPay', 'FinancialExpense', 'FinancialRevenue',
                           'TreasuryMovement', 'BankTransaction', 'RevolutConnection', 'GraduationExamEvent']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS fill_school_id ON public.%I', t);
    EXECUTE format('CREATE TRIGGER fill_school_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fill_school_id()', t);
  END LOOP;
END $$;

-- ─── 6. Segurança ───────────────────────────────────────────────────────────
-- Tabelas novas: só o servidor (service role) lê/escreve. Políticas por escola chegam na Fase 2.
ALTER TABLE public."SchoolDirector"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ReportAccessGrant"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SchoolPaymentSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SchoolPaymentSecret"   ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."SchoolPaymentSecret" FROM anon, authenticated;
