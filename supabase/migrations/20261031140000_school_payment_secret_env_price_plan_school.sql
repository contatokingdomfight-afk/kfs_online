-- Pagamento online por escola (conta Revolut de cada escola).

-- Ambiente de cada chave: a BD é a mesma em local, Preview e produção, e as chaves reais só podem ser lidas em produção.
ALTER TABLE public."SchoolPaymentSecret"
  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'prod'
  CONSTRAINT "SchoolPaymentSecret_environment_check" CHECK (environment IN ('prod', 'sandbox'));
ALTER TABLE public."SchoolPaymentSecret" DROP CONSTRAINT "SchoolPaymentSecret_pkey";
ALTER TABLE public."SchoolPaymentSecret" ADD PRIMARY KEY ("schoolId", kind, environment);
COMMENT ON TABLE public."SchoolPaymentSecret" IS 'Credenciais de pagamento/faturação por escola, cifradas pela aplicação (AES-GCM). A Sede usa as variáveis de ambiente.';

-- Planos de preço por escola: cada plano só existe na conta Revolut onde foi criado.
-- O DEFAULT mantém a Sede a funcionar durante o deploy (o código anterior não envia a escola).
ALTER TABLE public."RevolutPricePlan"
  ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school-001'
  REFERENCES public."School"(id) ON DELETE CASCADE;
ALTER TABLE public."RevolutPricePlan" DROP CONSTRAINT "RevolutPricePlan_env_amount_key";
ALTER TABLE public."RevolutPricePlan"
  ADD CONSTRAINT "RevolutPricePlan_school_env_amount_key" UNIQUE ("schoolId", environment, "amountCents");
