import { describe, expect, it } from "vitest";
import { getSignupGraceState, isWithinSignupGracePeriod, SIGNUP_GRACE_PERIOD_MS } from "./signup-grace";

const NOW = new Date("2026-08-30T12:00:00.000Z");

describe("isWithinSignupGracePeriod", () => {
  it("está dentro da carência a poucas horas da assinatura", () => {
    const signedAt = new Date(NOW.getTime() - 1000 * 60 * 60).toISOString(); // 1h atrás
    expect(isWithinSignupGracePeriod(signedAt, NOW)).toBe(true);
  });

  it("está dentro da carência a segundos do limite (71h59)", () => {
    const signedAt = new Date(NOW.getTime() - (SIGNUP_GRACE_PERIOD_MS - 1000)).toISOString();
    expect(isWithinSignupGracePeriod(signedAt, NOW)).toBe(true);
  });

  it("fica fora da carência exactamente aos 72h", () => {
    const signedAt = new Date(NOW.getTime() - SIGNUP_GRACE_PERIOD_MS).toISOString();
    expect(isWithinSignupGracePeriod(signedAt, NOW)).toBe(false);
  });

  it("fica fora da carência bem depois das 72h", () => {
    const signedAt = new Date(NOW.getTime() - SIGNUP_GRACE_PERIOD_MS * 2).toISOString();
    expect(isWithinSignupGracePeriod(signedAt, NOW)).toBe(false);
  });

  it("sem assinatura (null/undefined) nunca está em carência", () => {
    expect(isWithinSignupGracePeriod(null, NOW)).toBe(false);
    expect(isWithinSignupGracePeriod(undefined, NOW)).toBe(false);
  });

  it("data inválida nunca está em carência", () => {
    expect(isWithinSignupGracePeriod("not-a-date", NOW)).toBe(false);
  });
});

describe("getSignupGraceState", () => {
  it("devolve active=true com expiresAt correto quando em carência", () => {
    const signedAt = new Date(NOW.getTime() - 1000 * 60 * 60).toISOString();
    const state = getSignupGraceState(signedAt, NOW);
    expect(state.active).toBe(true);
    if (state.active) {
      expect(new Date(state.expiresAt).getTime()).toBe(new Date(signedAt).getTime() + SIGNUP_GRACE_PERIOD_MS);
    }
  });

  it("devolve active=false quando a carência já expirou", () => {
    const signedAt = new Date(NOW.getTime() - SIGNUP_GRACE_PERIOD_MS * 2).toISOString();
    expect(getSignupGraceState(signedAt, NOW)).toEqual({ active: false });
  });

  it("devolve active=false sem assinatura", () => {
    expect(getSignupGraceState(null, NOW)).toEqual({ active: false });
  });
});
