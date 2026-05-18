-- Controla visibilidade no formulário público /aula-experimental (turmas reais vs. testes ou horários internos).
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "offerTrialBooking" boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN "Lesson"."offerTrialBooking" IS 'Quando false, a aula não aparece no agendamento público de aula experimental.';
