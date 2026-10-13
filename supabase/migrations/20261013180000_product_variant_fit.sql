-- Versão da variante (Masculino / Feminino / Infantil…), separada de tamanho e cor.
ALTER TABLE public."ProductVariant"
  ADD COLUMN IF NOT EXISTS fit TEXT;

COMMENT ON COLUMN public."ProductVariant".fit IS 'Versão: Masculino, Feminino, Infantil… (NULL = única)';
