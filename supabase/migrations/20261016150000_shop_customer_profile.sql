-- Cadastro mínimo de quem encomenda na loja pública (qualquer conta, aluno ou não).
-- Só a equipa lê/escreve diretamente; o cliente acede via servidor (cliente admin, filtrado pelo seu userId).
CREATE TABLE IF NOT EXISTS public."ShopCustomerProfile" (
  "userId" TEXT PRIMARY KEY REFERENCES public."User"(id) ON DELETE CASCADE,
  "fullName" TEXT NOT NULL,
  phone TEXT NOT NULL,
  "addressLine" TEXT NOT NULL,
  "postalCode" TEXT NOT NULL,
  city TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."ShopCustomerProfile" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kfs_shop_profile_staff" ON public."ShopCustomerProfile";
CREATE POLICY "kfs_shop_profile_staff" ON public."ShopCustomerProfile" FOR ALL TO authenticated
  USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());
