import { describe, expect, it } from "vitest";
import { billingDayFrom, chargeInstant, effectiveBillingDay, nextChargeAfter, sameLisbonDay } from "./billing-day";

const lisbonDate = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Europe/Lisbon" });
const lisbonHour = (d: Date) => d.toLocaleString("en-GB", { timeZone: "Europe/Lisbon", hour: "2-digit", hour12: false });

describe("pagamento automático · dia de cobrança", () => {
  it("usa o último dia nos meses mais curtos", () => {
    expect(effectiveBillingDay(31, 2026, 11)).toBe(30);
    expect(effectiveBillingDay(31, 2027, 2)).toBe(28);
    expect(effectiveBillingDay(30, 2028, 2)).toBe(29); // ano bissexto
    expect(effectiveBillingDay(31, 2027, 3)).toBe(31); // volta ao 31 em março
    expect(effectiveBillingDay(23, 2026, 2)).toBe(23);
  });

  it("marca a cobrança às 09:00 de Lisboa, no inverno e no verão", () => {
    const winter = chargeInstant(15, 2026, 12);
    const summer = chargeInstant(15, 2026, 7);
    expect(lisbonDate(winter)).toBe("2026-12-15");
    expect(lisbonHour(winter)).toBe("09");
    expect(lisbonDate(summer)).toBe("2026-07-15");
    expect(lisbonHour(summer)).toBe("09");
  });

  it("calcula a próxima cobrança depois de uma data", () => {
    expect(lisbonDate(nextChargeAfter(23, new Date("2026-10-23T12:00:00Z")))).toBe("2026-11-23");
    expect(lisbonDate(nextChargeAfter(23, new Date("2026-10-20T12:00:00Z")))).toBe("2026-10-23");
    expect(lisbonDate(nextChargeAfter(31, new Date("2026-11-02T12:00:00Z")))).toBe("2026-11-30");
    expect(lisbonDate(nextChargeAfter(31, new Date("2026-12-31T12:00:00Z")))).toBe("2027-01-31");
  });

  it("tira o dia de cobrança da data da 1.ª cobrança (calendário de Lisboa)", () => {
    expect(billingDayFrom(new Date("2026-10-23T14:28:00Z"))).toBe(23);
    // 23:30 UTC de 31/07 já é 1 de agosto em Lisboa (verão, UTC+1)
    expect(billingDayFrom(new Date("2026-07-31T23:30:00Z"))).toBe(1);
  });

  it("compara dias no calendário de Lisboa", () => {
    expect(sameLisbonDay(new Date("2026-11-23T08:00:00Z"), new Date("2026-11-23T21:00:00Z"))).toBe(true);
    expect(sameLisbonDay(new Date("2026-11-23T08:00:00Z"), new Date("2026-11-24T08:00:00Z"))).toBe(false);
  });
});
