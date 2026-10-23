-- Cobrança de saída antecipada da fidelização (devolve o desconto já recebido).
-- Enum numa migração separada (o valor novo só pode ser usado depois do commit), mesmo padrão de ENROLLMENT/EXTRA_SESSION.
ALTER TYPE public."PaymentType" ADD VALUE IF NOT EXISTS 'LOYALTY_EXIT';
