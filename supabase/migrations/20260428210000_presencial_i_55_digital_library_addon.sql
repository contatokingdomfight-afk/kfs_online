-- Kingdom Presencial I: 55€/mês; add-on opcional biblioteca digital (Stripe + flag em Student)
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "digitalLibraryAddon" boolean NOT NULL DEFAULT false;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "digitalLibraryAddonSubscriptionId" text;
COMMENT ON COLUMN "Student"."digitalLibraryAddon" IS 'Subscrição Stripe adicional: biblioteca digital com Kingdom Presencial I (+20€).';
COMMENT ON COLUMN "Student"."digitalLibraryAddonSubscriptionId" IS 'id da subscrição Stripe só do add-on (separada do plano base).';

UPDATE "Plan" SET
  "priceMonthly" = 55.00,
  description = 'Acesso à plataforma (check-in, desempenho) sem biblioteca de conhecimento por defeito. Biblioteca digital opcional (+20€/mês, subscrição adicional). Uma modalidade; uma aula com check-in por dia.',
  "updatedAt" = now()
WHERE id = 'plan-presencial-i';
