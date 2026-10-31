-- Confirmação automática de transferências por escola (conta Revolut Business de cada escola).
-- Pré-condição verificada em PRD (2026-10-31): RevolutConnection, BankTransaction e BankPayerAlias estão vazias.

-- Certificado da Business API de cada escola (cifrado; a Sede usa as variáveis REVOLUT_*).
ALTER TABLE public."SchoolPaymentSecret" DROP CONSTRAINT "SchoolPaymentSecret_kind_check";
ALTER TABLE public."SchoolPaymentSecret" ADD CONSTRAINT "SchoolPaymentSecret_kind_check" CHECK (kind IN (
  'REVOLUT_MERCHANT_SECRET', 'REVOLUT_MERCHANT_PUBLIC', 'REVOLUT_WEBHOOK_SECRET', 'REVOLUT_BUSINESS_CERT',
  'MULTIBANCO_API_KEY', 'WEOINVOICE_EMAIL', 'WEOINVOICE_PASSWORD'
));

-- Uma ligação por escola e ambiente: a BD é a mesma em local, Preview e produção.
ALTER TABLE public."RevolutConnection" DROP CONSTRAINT "RevolutConnection_singleton";
ALTER TABLE public."RevolutConnection" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."RevolutConnection" ALTER COLUMN "schoolId" SET NOT NULL;
ALTER TABLE public."RevolutConnection"
  ADD COLUMN environment TEXT NOT NULL DEFAULT 'prod'
  CONSTRAINT "RevolutConnection_environment_check" CHECK (environment IN ('prod', 'sandbox'));
DROP INDEX public."RevolutConnection_school_key";
CREATE UNIQUE INDEX "RevolutConnection_school_env_key" ON public."RevolutConnection" ("schoolId", environment);
COMMENT ON COLUMN public."RevolutConnection"."refreshToken" IS 'Cifrado pela aplicação (AES-GCM), tal como SchoolPaymentSecret.';

-- Movimentos da conta de cada escola.
ALTER TABLE public."BankTransaction" ALTER COLUMN "schoolId" SET NOT NULL;
ALTER TABLE public."BankTransaction"
  ADD COLUMN environment TEXT NOT NULL DEFAULT 'prod'
  CONSTRAINT "BankTransaction_environment_check" CHECK (environment IN ('prod', 'sandbox'));
ALTER TABLE public."BankTransaction" DROP CONSTRAINT "BankTransaction_pkey";
ALTER TABLE public."BankTransaction" ADD PRIMARY KEY ("schoolId", id);
CREATE INDEX "BankTransaction_school_occurred_idx" ON public."BankTransaction" ("schoolId", "occurredAt" DESC);

-- Quem paga por quem é aprendido em cada escola.
ALTER TABLE public."BankPayerAlias"
  ADD COLUMN "schoolId" TEXT NOT NULL REFERENCES public."School"(id) ON DELETE CASCADE;
ALTER TABLE public."BankPayerAlias" DROP CONSTRAINT "BankPayerAlias_pkey";
ALTER TABLE public."BankPayerAlias" ADD PRIMARY KEY ("schoolId", "payerKey");
