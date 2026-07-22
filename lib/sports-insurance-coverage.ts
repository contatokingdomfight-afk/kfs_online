/** Cobertura PDCR — seguro desportivo federado (texto informativo no comprovativo). */
export const SPORTS_INSURANCE_ANNUAL_PREMIUM = 25;

export const SPORTS_INSURANCE_COVERAGE = {
  product: "APMDA",
  activity: "JIU JITSU",
  death: "33.500,00 €",
  permanentDisability: "33.500,00 €",
  treatmentExpenses: "5.500,00 €",
  treatmentDeductible: "75,00 €",
  funeralExpenses: "3.000,00 €",
  annualPremium: `${SPORTS_INSURANCE_ANNUAL_PREMIUM.toFixed(2).replace(".", ",")} €`,
} as const;
