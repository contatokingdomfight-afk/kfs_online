-- Confirmação automática das transferências recebidas na conta Revolut Business (só leitura).

-- 1) Referência fixa por aluno para o descritivo da transferência (KFS-0123).
CREATE SEQUENCE IF NOT EXISTS "Student_paymentCode_seq" START 101;
ALTER TABLE public."Student" ADD COLUMN IF NOT EXISTS "paymentCode" INTEGER;
UPDATE public."Student" SET "paymentCode" = nextval('"Student_paymentCode_seq"') WHERE "paymentCode" IS NULL;
ALTER TABLE public."Student" ALTER COLUMN "paymentCode" SET DEFAULT nextval('"Student_paymentCode_seq"');
CREATE UNIQUE INDEX IF NOT EXISTS "Student_paymentCode_key" ON public."Student" ("paymentCode");

-- 2) Ligação à Revolut Business (uma só linha). O refresh token só dá leitura (scope READ).
CREATE TABLE IF NOT EXISTS public."RevolutConnection" (
  id TEXT PRIMARY KEY DEFAULT 'default',
  "refreshToken" TEXT NOT NULL,
  "connectedByUserId" TEXT REFERENCES public."User"(id) ON DELETE SET NULL,
  "connectedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "lastSyncAt" TIMESTAMPTZ,
  "lastSyncError" TEXT,
  CONSTRAINT "RevolutConnection_singleton" CHECK (id = 'default')
);

-- 3) Transferências recebidas e a correspondência encontrada.
CREATE TABLE IF NOT EXISTS public."BankTransaction" (
  id TEXT PRIMARY KEY,                       -- id da transação na Revolut
  "occurredAt" TIMESTAMPTZ NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  "payerName" TEXT,
  reference TEXT,
  description TEXT,
  state TEXT,
  "matchStatus" TEXT NOT NULL DEFAULT 'UNMATCHED',
  "matchedKind" TEXT,                        -- TUITION | INSURANCE | ENROLLMENT | ORDER
  "matchedStudentId" TEXT REFERENCES public."Student"(id) ON DELETE SET NULL,
  "matchedPaymentId" TEXT,
  "matchedOrderId" TEXT,
  "matchedReferenceMonth" TEXT,
  "matchLabel" TEXT,
  suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  "appliedAt" TIMESTAMPTZ,
  "appliedByUserId" TEXT REFERENCES public."User"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "BankTransaction_matchStatus_check" CHECK ("matchStatus" IN ('AUTO', 'CONFIRMED', 'SUGGESTED', 'UNMATCHED', 'IGNORED'))
);
CREATE INDEX IF NOT EXISTS "BankTransaction_occurred_idx" ON public."BankTransaction" ("occurredAt" DESC);
CREATE INDEX IF NOT EXISTS "BankTransaction_status_idx" ON public."BankTransaction" ("matchStatus");

-- 4) Quem paga por quem (aprendido quando o admin confirma uma sugestão).
CREATE TABLE IF NOT EXISTS public."BankPayerAlias" (
  "payerKey" TEXT PRIMARY KEY,               -- nome normalizado de quem transfere
  "studentId" TEXT NOT NULL REFERENCES public."Student"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Só o servidor (service role) lê e escreve; a equipa vê pelo admin.
ALTER TABLE public."RevolutConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BankTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BankPayerAlias" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kfs_bank_staff" ON public."BankTransaction";
CREATE POLICY "kfs_bank_staff" ON public."BankTransaction" FOR SELECT TO authenticated USING (public.kfs_is_staff());
DROP POLICY IF EXISTS "kfs_bank_staff" ON public."BankPayerAlias";
CREATE POLICY "kfs_bank_staff" ON public."BankPayerAlias" FOR SELECT TO authenticated USING (public.kfs_is_staff());
-- RevolutConnection: sem políticas (o refresh token nunca sai do servidor).
