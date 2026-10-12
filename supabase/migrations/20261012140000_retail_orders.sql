-- Encomendas da loja (pré-encomenda, ex.: camisetas): o aluno encomenda na app ou o admin regista
-- (amigos sem conta); paga por transferência/Revolut ou na secretaria e o admin confirma à mão.
-- Estados: PENDING_PAYMENT → PAID → ORDERED (ao fornecedor) → READY → DELIVERED; CANCELLED.

ALTER TABLE public."Product"
  ADD COLUMN IF NOT EXISTS "allowPreorder" BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public."Product"."allowPreorder" IS 'true = aparece «Encomendar» na loja do aluno, mesmo sem stock';

CREATE TABLE IF NOT EXISTS public."RetailOrder" (
  id TEXT PRIMARY KEY,
  "number" BIGINT GENERATED ALWAYS AS IDENTITY,
  "schoolId" TEXT REFERENCES public."School"(id) ON DELETE SET NULL,
  "studentId" TEXT REFERENCES public."Student"(id) ON DELETE SET NULL,
  -- Cliente sem conta (registado pelo admin); para alunos fica null e usa-se a conta.
  "customerName" TEXT,
  "customerPhone" TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
  "totalAmount" DECIMAL(10, 2) NOT NULL,
  "paymentMethod" TEXT,
  "paidAt" TIMESTAMPTZ,
  "paidConfirmedByUserId" TEXT REFERENCES public."User"(id) ON DELETE SET NULL,
  -- Venda registada ao confirmar o pagamento (receita no mês em que entrou o dinheiro).
  "saleId" TEXT REFERENCES public."RetailSale"(id) ON DELETE SET NULL,
  "orderedAt" TIMESTAMPTZ,
  "readyAt" TIMESTAMPTZ,
  "deliveredAt" TIMESTAMPTZ,
  "cancelledAt" TIMESTAMPTZ,
  "proofPath" TEXT,
  "proofFileName" TEXT,
  "proofUploadedAt" TIMESTAMPTZ,
  notes TEXT,
  "createdByUserId" TEXT REFERENCES public."User"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "RetailOrder_number_key" UNIQUE ("number"),
  CONSTRAINT "RetailOrder_status_check" CHECK (status IN ('PENDING_PAYMENT', 'PAID', 'ORDERED', 'READY', 'DELIVERED', 'CANCELLED')),
  CONSTRAINT "RetailOrder_customer_check" CHECK ("studentId" IS NOT NULL OR "customerName" IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS "RetailOrder_status_created_idx" ON public."RetailOrder" (status, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "RetailOrder_studentId_idx" ON public."RetailOrder" ("studentId");

CREATE TABLE IF NOT EXISTS public."RetailOrderLine" (
  id TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES public."RetailOrder"(id) ON DELETE CASCADE,
  "variantId" TEXT NOT NULL REFERENCES public."ProductVariant"(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  "unitPrice" DECIMAL(10, 2) NOT NULL,
  "lineTotal" DECIMAL(10, 2) NOT NULL,
  -- «Para quem» (ex.: irmão, amigo João) — opcional.
  "recipientNote" TEXT,
  CONSTRAINT "RetailOrderLine_qty_positive" CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS "RetailOrderLine_orderId_idx" ON public."RetailOrderLine" ("orderId");

-- Só a equipa lê/escreve diretamente; o aluno acede via servidor (cliente admin, filtrado pelo seu studentId).
ALTER TABLE public."RetailOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RetailOrderLine" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kfs_financial_staff" ON public."RetailOrder";
CREATE POLICY "kfs_financial_staff" ON public."RetailOrder" FOR ALL TO authenticated
  USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());

DROP POLICY IF EXISTS "kfs_financial_staff" ON public."RetailOrderLine";
CREATE POLICY "kfs_financial_staff" ON public."RetailOrderLine" FOR ALL TO authenticated
  USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());
