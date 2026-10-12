-- Descontos da loja: promoções automáticas («% a partir de N peças») e cupões (% ou valor fixo).
-- Numa encomenda aplica-se só o melhor dos dois (calculado no servidor).

CREATE TABLE IF NOT EXISTS public."RetailPromotion" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  -- null = vale para toda a loja; senão só conta peças deste produto.
  "productId" TEXT REFERENCES public."Product"(id) ON DELETE CASCADE,
  "minQuantity" INTEGER NOT NULL,
  "percentOff" DECIMAL(5, 2) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "RetailPromotion_min_qty" CHECK ("minQuantity" >= 2),
  CONSTRAINT "RetailPromotion_percent" CHECK ("percentOff" > 0 AND "percentOff" <= 90)
);

CREATE TABLE IF NOT EXISTS public."RetailCoupon" (
  id TEXT PRIMARY KEY,
  -- Guardado em maiúsculas; o aluno pode escrever como quiser.
  code TEXT NOT NULL,
  kind TEXT NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "RetailCoupon_code_key" UNIQUE (code),
  CONSTRAINT "RetailCoupon_kind_check" CHECK (kind IN ('PERCENT', 'FIXED')),
  CONSTRAINT "RetailCoupon_value_check" CHECK (value > 0 AND (kind <> 'PERCENT' OR value <= 90))
);

ALTER TABLE public."RetailOrder"
  ADD COLUMN IF NOT EXISTS "subtotalAmount" DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "discountLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "couponCode" TEXT,
  ADD COLUMN IF NOT EXISTS "promotionId" TEXT REFERENCES public."RetailPromotion"(id) ON DELETE SET NULL;

ALTER TABLE public."RetailPromotion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RetailCoupon" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kfs_financial_staff" ON public."RetailPromotion";
CREATE POLICY "kfs_financial_staff" ON public."RetailPromotion" FOR ALL TO authenticated
  USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());

DROP POLICY IF EXISTS "kfs_financial_staff" ON public."RetailCoupon";
CREATE POLICY "kfs_financial_staff" ON public."RetailCoupon" FOR ALL TO authenticated
  USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());
