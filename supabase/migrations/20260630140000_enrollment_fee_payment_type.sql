-- Matrícula (taxa única de inscrição). Enum ENROLLMENT deve ser aplicado numa migração separada (commit PG).
-- Ver também: enrollment_fee_payment_type + enrollment_fee_columns no Supabase EU.

ALTER TYPE public."PaymentType" ADD VALUE IF NOT EXISTS 'ENROLLMENT';
