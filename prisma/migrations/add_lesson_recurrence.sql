-- Migration: Recorrência semanal nas aulas
-- Por defeito a aula é recorrente (mesmo dia/hora todas as semanas).
-- Aula única (evento pontual) = isOneOff true.
--
-- Executar no Supabase: Dashboard → SQL Editor → colar e executar.

ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "isOneOff" BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN "Lesson"."isOneOff" IS 'true = aula única (evento pontual); false = recorrente semanal (padrão)';
