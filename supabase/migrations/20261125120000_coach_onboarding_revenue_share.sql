-- Professor: registo via Google + aprovação do Diretor Técnico + contrato, e remuneração sobre mensalidades.
-- Decisões de 2026-11-24 (DOCS/mockup-professor-registo-financeiro.html, DOCS/MINUTA_Contrato_Professor.md):
--  * parte do professor = % do PREÇO DE TABELA sem IVA (÷ 1,23), só com a mensalidade paga;
--    plano de 2 modalidades: 35% por modalidade dada (70% se der as duas); todas: 80% a dividir;
--    1 modalidade: 40%; Kingdom Week: 10 € fixos. KIDS: mesmas regras (pack KIDS 2 modalidades = 65 €);
--  * descontos da escola (fidelização, família, cupões) só reduzem a parte da escola; máximo 15% no total;
--  * bolsa 100% dada pelo professor → ninguém recebe;
--  * pagamento ao professor marcado pelo Diretor Técnico da escola ou pelo Admin Geral.
--
-- Só adiciona (IF NOT EXISTS) e não altera dados existentes, exceto preencher Payment."paidAt" nos pagos.
-- Tabelas novas: escritas pelo servidor (service role). Dados pessoais do professor sem leitura pelo cliente.

BEGIN;

-- 1) Plano: tipo «2 modalidades» e regra da parte do professor ------------------------------------
COMMENT ON COLUMN public."Plan"."modalityScope" IS 'NONE | SINGLE | DUAL (2 à escolha) | ALL';

ALTER TABLE public."Plan" ADD COLUMN IF NOT EXISTS "coachShareMode" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE public."Plan" ADD COLUMN IF NOT EXISTS "coachShareValue" NUMERIC(10, 2);
ALTER TABLE public."Plan" DROP CONSTRAINT IF EXISTS "Plan_coachShareMode_check";
ALTER TABLE public."Plan" ADD CONSTRAINT "Plan_coachShareMode_check" CHECK (
  ("coachShareMode" = 'NONE' AND "coachShareValue" IS NULL)
  OR ("coachShareMode" IN ('PER_MODALITY', 'SPLIT_POOL') AND "coachShareValue" > 0 AND "coachShareValue" <= 100)
  OR ("coachShareMode" = 'FIXED' AND "coachShareValue" >= 0)
);
COMMENT ON COLUMN public."Plan"."coachShareMode" IS
  'NONE = professor não recebe; PER_MODALITY = % por cada modalidade do aluno que o professor dá; '
  'SPLIT_POOL = % total dividida pelos professores do aluno; FIXED = € fixos por aluno pago.';
COMMENT ON COLUMN public."Plan"."coachShareValue" IS 'Percentagem (PER_MODALITY/SPLIT_POOL, sobre o preço sem IVA) ou euros (FIXED).';

-- 2) Aluno: segunda modalidade (planos DUAL) -------------------------------------------------------
ALTER TABLE public."Student" ADD COLUMN IF NOT EXISTS "secondaryModality" TEXT;
COMMENT ON COLUMN public."Student"."secondaryModality" IS 'Segunda modalidade escolhida em planos DUAL (a primeira é primaryModality).';

-- 3) Pagamento: data em que ficou pago (para saber em que mês conta para o professor) --------------
ALTER TABLE public."Payment" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMPTZ;
UPDATE public."Payment" SET "paidAt" = "createdAt" WHERE status::text = 'PAID' AND "paidAt" IS NULL;

CREATE OR REPLACE FUNCTION public.payment_set_paid_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status::text = 'PAID' AND NEW."paidAt" IS NULL
     AND (TG_OP = 'INSERT' OR OLD.status::text IS DISTINCT FROM 'PAID') THEN
    NEW."paidAt" := now();
  ELSIF NEW.status::text <> 'PAID' THEN
    NEW."paidAt" := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS "Payment_set_paid_at" ON public."Payment";
CREATE TRIGGER "Payment_set_paid_at" BEFORE INSERT OR UPDATE OF status, "paidAt" ON public."Payment"
  FOR EACH ROW EXECUTE FUNCTION public.payment_set_paid_at();

CREATE INDEX IF NOT EXISTS "Payment_paidAt_idx" ON public."Payment" ("paidAt") WHERE "paidAt" IS NOT NULL;

-- 4) Modalidades que cada professor dá em cada escola (base da divisão) ---------------------------
CREATE TABLE IF NOT EXISTS public."CoachModality" (
  "coachId" TEXT NOT NULL REFERENCES public."Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "schoolId" TEXT NOT NULL REFERENCES public."School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "modalityCode" TEXT NOT NULL REFERENCES public."ModalityRef"("code") ON DELETE CASCADE ON UPDATE CASCADE,
  "createdByUserId" TEXT REFERENCES public."User"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("coachId", "schoolId", "modalityCode")
);
CREATE INDEX IF NOT EXISTS "CoachModality_school_modality_idx" ON public."CoachModality" ("schoolId", "modalityCode");
COMMENT ON TABLE public."CoachModality" IS 'Modalidades que o professor dá na escola; se houver vários, a parte da modalidade divide-se em partes iguais.';

-- 5) Pedidos de acesso como professor ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."CoachAccessRequest" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "schoolId" TEXT NOT NULL REFERENCES public."School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "modalityCodes" TEXT[] NOT NULL DEFAULT '{}',
  "phone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  "decidedByUserId" TEXT REFERENCES public."User"("id") ON DELETE SET NULL,
  "decidedAt" TIMESTAMPTZ,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "CoachAccessRequest_one_pending_per_user"
  ON public."CoachAccessRequest" ("userId") WHERE "status" = 'PENDING';
CREATE INDEX IF NOT EXISTS "CoachAccessRequest_school_status_idx" ON public."CoachAccessRequest" ("schoolId", "status");

-- 6) Dados pessoais do professor (NIF, IBAN…) — sem políticas: só o servidor lê/escreve -------------
CREATE TABLE IF NOT EXISTS public."CoachPrivateData" (
  "coachId" TEXT PRIMARY KEY REFERENCES public."Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "legalName" TEXT NOT NULL,
  "nif" TEXT NOT NULL,
  "idDocumentNumber" TEXT,
  "address" TEXT,
  "iban" TEXT,
  "tptdNumber" TEXT,
  "tptdValidUntil" DATE,
  "selfEmployed" BOOLEAN NOT NULL DEFAULT false,
  "onboardingCompletedAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7) Documentos assinados (contrato e termo de adesão) --------------------------------------------
CREATE TABLE IF NOT EXISTS public."CoachDocumentSignature" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "coachId" TEXT NOT NULL REFERENCES public."Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "schoolId" TEXT NOT NULL REFERENCES public."School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "documentType" TEXT NOT NULL CHECK ("documentType" IN ('CONTRACT', 'ADHESION_TERM')),
  "documentVersion" TEXT NOT NULL,
  "contentSnapshot" TEXT NOT NULL,
  "signaturePath" TEXT,
  "signedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  UNIQUE ("coachId", "schoolId", "documentType", "documentVersion")
);
COMMENT ON COLUMN public."CoachDocumentSignature"."contentSnapshot" IS 'Texto exato que o professor assinou (já com os campos preenchidos).';

-- 8) Bolsas de 100% dadas pelo professor -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."StudentScholarship" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "studentId" TEXT NOT NULL REFERENCES public."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "grantedByCoachId" TEXT REFERENCES public."Coach"("id") ON DELETE SET NULL,
  "approvedByUserId" TEXT REFERENCES public."User"("id") ON DELETE SET NULL,
  "startMonth" TEXT NOT NULL CHECK ("startMonth" ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  "endMonth" TEXT CHECK ("endMonth" IS NULL OR "endMonth" ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  "reason" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ("endMonth" IS NULL OR "endMonth" >= "startMonth")
);
CREATE INDEX IF NOT EXISTS "StudentScholarship_studentId_idx" ON public."StudentScholarship" ("studentId");
COMMENT ON TABLE public."StudentScholarship" IS 'Bolsa de 100%: sem mensalidade e nem o professor nem a escola recebem por este aluno.';

-- 9) Pagamentos aos professores, por mês e escola ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public."CoachPayout" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "coachId" TEXT NOT NULL REFERENCES public."Coach"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "schoolId" TEXT NOT NULL REFERENCES public."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "referenceMonth" TEXT NOT NULL CHECK ("referenceMonth" ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  "amount" NUMERIC(10, 2) NOT NULL CHECK ("amount" >= 0),
  "studentCount" INTEGER NOT NULL DEFAULT 0,
  "breakdown" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'PAID')),
  "paidAt" TIMESTAMPTZ,
  "paidByUserId" TEXT REFERENCES public."User"("id") ON DELETE SET NULL,
  "receiptPath" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("coachId", "schoolId", "referenceMonth"),
  CHECK (("status" = 'PAID') = ("paidAt" IS NOT NULL AND "paidByUserId" IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS "CoachPayout_school_month_idx" ON public."CoachPayout" ("schoolId", "referenceMonth");
COMMENT ON TABLE public."CoachPayout" IS 'Valor fechado a pagar ao professor no mês (breakdown = detalhe por plano/aluno). Marcado pelo Diretor Técnico da escola ou Admin Geral.';

-- RLS: tudo pelo servidor (service role). Sem políticas = o cliente não lê nem escreve.
ALTER TABLE public."CoachModality" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CoachAccessRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CoachPrivateData" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CoachDocumentSignature" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StudentScholarship" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CoachPayout" ENABLE ROW LEVEL SECURITY;

COMMIT;
