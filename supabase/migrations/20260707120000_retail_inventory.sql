-- Loja presencial: fornecedores, produtos, variantes, stock por escola, vendas.
-- Categoria opcional em FinancialExpense.

ALTER TABLE public."FinancialExpense"
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'OTHER';

COMMENT ON COLUMN public."FinancialExpense".category IS 'RENT | UTILITIES | SUPPLIES | MARKETING | OTHER';

CREATE TABLE IF NOT EXISTS public."ProductSupplier" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT,
  tax_id TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."Product" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'ACESSORIO',
  "salePrice" DECIMAL(10, 2) NOT NULL,
  "supplierId" TEXT REFERENCES public."ProductSupplier"(id) ON DELETE SET NULL,
  "schoolId" TEXT REFERENCES public."School"(id) ON DELETE SET NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "Product_sku_key" UNIQUE (sku)
);

CREATE TABLE IF NOT EXISTS public."ProductVariant" (
  id TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL REFERENCES public."Product"(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  size TEXT,
  color TEXT,
  "priceOverride" DECIMAL(10, 2),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ProductVariant_sku_key" UNIQUE (sku)
);

CREATE INDEX IF NOT EXISTS "ProductVariant_productId_idx" ON public."ProductVariant" ("productId");

CREATE TABLE IF NOT EXISTS public."InventoryBalance" (
  id TEXT PRIMARY KEY,
  "variantId" TEXT NOT NULL REFERENCES public."ProductVariant"(id) ON DELETE CASCADE,
  "schoolId" TEXT NOT NULL REFERENCES public."School"(id) ON DELETE CASCADE,
  "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
  "reorderLevel" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "InventoryBalance_variant_school_key" UNIQUE ("variantId", "schoolId")
);

CREATE INDEX IF NOT EXISTS "InventoryBalance_schoolId_idx" ON public."InventoryBalance" ("schoolId");

CREATE TABLE IF NOT EXISTS public."StockMovement" (
  id TEXT PRIMARY KEY,
  "variantId" TEXT NOT NULL REFERENCES public."ProductVariant"(id) ON DELETE RESTRICT,
  "schoolId" TEXT NOT NULL REFERENCES public."School"(id) ON DELETE RESTRICT,
  "movementType" TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  "unitCost" DECIMAL(10, 2),
  "referenceType" TEXT,
  "referenceId" TEXT,
  notes TEXT,
  "createdByUserId" TEXT REFERENCES public."User"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "StockMovement_type_check" CHECK ("movementType" IN ('IN', 'OUT', 'ADJUST'))
);

CREATE INDEX IF NOT EXISTS "StockMovement_school_created_idx" ON public."StockMovement" ("schoolId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "StockMovement_variant_idx" ON public."StockMovement" ("variantId");

CREATE TABLE IF NOT EXISTS public."RetailSale" (
  id TEXT PRIMARY KEY,
  "schoolId" TEXT NOT NULL REFERENCES public."School"(id) ON DELETE RESTRICT,
  "soldAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
  "totalAmount" DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  "studentId" TEXT REFERENCES public."Student"(id) ON DELETE SET NULL,
  "registeredByUserId" TEXT REFERENCES public."User"(id) ON DELETE SET NULL,
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "RetailSale_payment_check" CHECK ("paymentMethod" IN ('CASH', 'CARD', 'MB', 'OTHER')),
  CONSTRAINT "RetailSale_status_check" CHECK (status IN ('COMPLETED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS "RetailSale_school_soldAt_idx" ON public."RetailSale" ("schoolId", "soldAt" DESC);
CREATE INDEX IF NOT EXISTS "RetailSale_soldAt_idx" ON public."RetailSale" ("soldAt" DESC);

CREATE TABLE IF NOT EXISTS public."RetailSaleLine" (
  id TEXT PRIMARY KEY,
  "saleId" TEXT NOT NULL REFERENCES public."RetailSale"(id) ON DELETE CASCADE,
  "variantId" TEXT NOT NULL REFERENCES public."ProductVariant"(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  "unitPrice" DECIMAL(10, 2) NOT NULL,
  "lineTotal" DECIMAL(10, 2) NOT NULL,
  CONSTRAINT "RetailSaleLine_qty_positive" CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS "RetailSaleLine_saleId_idx" ON public."RetailSaleLine" ("saleId");

-- RLS: staff financeiro (mesmo padrão que FinancialExpense)
ALTER TABLE public."ProductSupplier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProductVariant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."InventoryBalance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StockMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RetailSale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RetailSaleLine" ENABLE ROW LEVEL SECURITY;

DO $rls$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ProductSupplier', 'Product', 'ProductVariant', 'InventoryBalance',
    'StockMovement', 'RetailSale', 'RetailSaleLine'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "kfs_financial_staff" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "kfs_financial_staff" ON public.%I FOR ALL TO authenticated USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff())',
      t
    );
  END LOOP;
END
$rls$;
