-- Cupões gerais (adesão, mensalidades e loja), por escola, com nº máximo de pessoas.
-- Reaproveita a tabela dos cupões da loja ("RetailCoupon"): os cupões antigos ficam só na loja
-- e em todas as escolas (schoolId null), sem limite de pessoas.

ALTER TABLE public."RetailCoupon"
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS "schoolId" TEXT REFERENCES public."School"(id) ON DELETE CASCADE,
  -- ENROLLMENT (inscrição) | INSURANCE (seguro) | TUITION (mensalidade) | STORE (loja)
  ADD COLUMN IF NOT EXISTS "appliesTo" TEXT[] NOT NULL DEFAULT ARRAY['STORE']::TEXT[],
  -- Nº máximo de pessoas (cada pessoa usa o cupão uma vez). null = sem limite (só cupões antigos).
  ADD COLUMN IF NOT EXISTS "maxRedemptions" INTEGER,
  ADD COLUMN IF NOT EXISTS "startsAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "endsAt" TIMESTAMPTZ,
  -- Encerrado pelo admin: deixa de aceitar usos mas guarda o histórico.
  ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;

-- Agora pode ir até 100% (ex.: inscrição grátis).
ALTER TABLE public."RetailCoupon" DROP CONSTRAINT IF EXISTS "RetailCoupon_value_check";
ALTER TABLE public."RetailCoupon"
  ADD CONSTRAINT "RetailCoupon_value_check" CHECK (value > 0 AND (kind <> 'PERCENT' OR value <= 100));

ALTER TABLE public."RetailCoupon" DROP CONSTRAINT IF EXISTS "RetailCoupon_applies_check";
ALTER TABLE public."RetailCoupon"
  ADD CONSTRAINT "RetailCoupon_applies_check"
  CHECK (cardinality("appliesTo") >= 1 AND "appliesTo" <@ ARRAY['ENROLLMENT', 'INSURANCE', 'TUITION', 'STORE']::TEXT[]);

ALTER TABLE public."RetailCoupon" DROP CONSTRAINT IF EXISTS "RetailCoupon_max_check";
ALTER TABLE public."RetailCoupon"
  ADD CONSTRAINT "RetailCoupon_max_check" CHECK ("maxRedemptions" IS NULL OR "maxRedemptions" >= 1);

-- O código passa a ser único por escola (duas escolas podem ter «NATAL26»).
ALTER TABLE public."RetailCoupon" DROP CONSTRAINT IF EXISTS "RetailCoupon_code_key";
CREATE UNIQUE INDEX IF NOT EXISTS "RetailCoupon_school_code_key"
  ON public."RetailCoupon" ((COALESCE("schoolId", '')), code);

-- Cada uso: um pagamento (inscrição/seguro/mensalidade) ou uma encomenda da loja.
CREATE TABLE IF NOT EXISTS public."CouponRedemption" (
  id TEXT PRIMARY KEY,
  "couponId" TEXT NOT NULL REFERENCES public."RetailCoupon"(id) ON DELETE CASCADE,
  "schoolId" TEXT,
  -- Quem usou: o aluno (studentId) ou, na loja pública, a conta/encomenda. Conta para o limite de pessoas.
  "personKey" TEXT NOT NULL,
  "studentId" TEXT REFERENCES public."Student"(id) ON DELETE SET NULL,
  "paymentId" TEXT REFERENCES public."Payment"(id) ON DELETE CASCADE,
  "retailOrderId" TEXT REFERENCES public."RetailOrder"(id) ON DELETE CASCADE,
  -- ENROLLMENT | INSURANCE | TUITION | STORE
  target TEXT NOT NULL,
  "originalAmount" DECIMAL(10, 2) NOT NULL,
  "discountAmount" DECIMAL(10, 2) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "CouponRedemption_target_check" CHECK (target IN ('ENROLLMENT', 'INSURANCE', 'TUITION', 'STORE')),
  CONSTRAINT "CouponRedemption_one_target" CHECK (("paymentId" IS NOT NULL) <> ("retailOrderId" IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS "CouponRedemption_payment_key" ON public."CouponRedemption" ("paymentId") WHERE "paymentId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "CouponRedemption_coupon_idx" ON public."CouponRedemption" ("couponId");
CREATE INDEX IF NOT EXISTS "CouponRedemption_person_idx" ON public."CouponRedemption" ("personKey");

ALTER TABLE public."CouponRedemption" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kfs_financial_staff" ON public."CouponRedemption";
CREATE POLICY "kfs_financial_staff" ON public."CouponRedemption" FOR ALL TO authenticated
  USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());
