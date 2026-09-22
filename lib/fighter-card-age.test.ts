import { describe, expect, it } from "vitest";
import { calculateAge, isFighterCardEligibleAge, FIGHTER_CARD_KIDS_MAX_AGE } from "./fighter-card-age";

const TODAY = new Date("2026-09-22T12:00:00.000Z");

describe("calculateAge", () => {
  it("returns null when date of birth is missing", () => {
    expect(calculateAge(null, TODAY)).toBeNull();
    expect(calculateAge(undefined, TODAY)).toBeNull();
    expect(calculateAge("", TODAY)).toBeNull();
  });

  it("returns null for an invalid date string", () => {
    expect(calculateAge("not-a-date", TODAY)).toBeNull();
  });

  it("computes full years correctly when the birthday already happened this year", () => {
    expect(calculateAge("2010-01-15", TODAY)).toBe(16);
  });

  it("does not count the birthday yet this year (age still one less)", () => {
    expect(calculateAge("2010-12-25", TODAY)).toBe(15);
  });

  it("counts the birthday exactly on the day", () => {
    expect(calculateAge("2010-09-22", TODAY)).toBe(16);
  });
});

describe("isFighterCardEligibleAge", () => {
  it("is false when date of birth is missing (safer default)", () => {
    expect(isFighterCardEligibleAge(null)).toBe(false);
  });

  it(`is false at exactly ${FIGHTER_CARD_KIDS_MAX_AGE} years old (Kids upper bound)`, () => {
    const dob = `${TODAY.getFullYear() - FIGHTER_CARD_KIDS_MAX_AGE}-09-22`;
    // Nota: sem passar `today`, usa a data real — teste indirecto via calculateAge coberto acima;
    // aqui validamos a fronteira chamando isFighterCardEligibleAge com uma data relativa a "hoje".
    const age = calculateAge(dob);
    expect(age).toBe(FIGHTER_CARD_KIDS_MAX_AGE);
    expect(isFighterCardEligibleAge(dob)).toBe(false);
  });

  it("is true for a 13-year-old (just above the Kids bound)", () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 13);
    const dob = d.toISOString().slice(0, 10);
    expect(isFighterCardEligibleAge(dob)).toBe(true);
  });

  it("is true for an adult", () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 30);
    const dob = d.toISOString().slice(0, 10);
    expect(isFighterCardEligibleAge(dob)).toBe(true);
  });
});
