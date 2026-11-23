-- Taxas por escola (multi-escola): matrícula e seguro anual próprios de cada escola.
-- NULL = usa o valor da rede (InsuranceSettings 'global', em Admin → Configurações).
alter table "SchoolPaymentSettings"
  add column if not exists "enrollmentAmount" numeric(10, 2),
  add column if not exists "insuranceAnnualAmount" numeric(10, 2);

alter table "SchoolPaymentSettings"
  drop constraint if exists "SchoolPaymentSettings_fee_overrides_nonneg";
alter table "SchoolPaymentSettings"
  add constraint "SchoolPaymentSettings_fee_overrides_nonneg"
  check (("enrollmentAmount" is null or "enrollmentAmount" >= 0) and ("insuranceAnnualAmount" is null or "insuranceAnnualAmount" >= 0));

comment on column "SchoolPaymentSettings"."enrollmentAmount" is 'Matrícula desta escola; NULL = valor da rede (InsuranceSettings).';
comment on column "SchoolPaymentSettings"."insuranceAnnualAmount" is 'Seguro anual desta escola; NULL = valor da rede (InsuranceSettings).';
