-- Pagamento de aulas extra (fora do limite mensal do plano). Enum deve ser aplicado numa
-- migração separada da que cria StudentExtraSessions (commit PG), mesmo padrão de ENROLLMENT.

ALTER TYPE public."PaymentType" ADD VALUE IF NOT EXISTS 'EXTRA_SESSION';
