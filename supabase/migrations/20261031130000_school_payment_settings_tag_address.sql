-- Dados de transferência por escola que ainda só existiam fixos em lib/enrollment-form.ts.
-- Aplicar ANTES do código que passa a ler estas colunas.
ALTER TABLE public."SchoolPaymentSettings"
  ADD COLUMN IF NOT EXISTS "revolutTag" TEXT,
  ADD COLUMN IF NOT EXISTS "ibanHolderAddress" TEXT;

UPDATE public."SchoolPaymentSettings"
SET "revolutTag" = '@kingdom_01',
    "ibanHolderAddress" = 'Rua Viana da Mota, 18, 2765-562 São Pedro do Estoril, Portugal'
WHERE "schoolId" = 'default-school-001';
