import { describe, expect, it } from "vitest";
import {
  COACH_REQUEST_MAX_MODALITIES,
  canDecideCoachRequest,
  normalizeCoachModalityCodes,
  normalizeCoachPhone,
} from "./coach-access-request";

const offered = new Set(["MUAY_THAI", "BOXING", "MTKIDS", "BJJKIDS"]);

describe("normalizeCoachModalityCodes", () => {
  it("tira vazios e repetidos", () => {
    expect(normalizeCoachModalityCodes(["MUAY_THAI", " MUAY_THAI ", "", "BOXING"], offered)).toEqual({
      codes: ["MUAY_THAI", "BOXING"],
    });
  });

  it("aceita modalidades KIDS que a escola oferece", () => {
    expect(normalizeCoachModalityCodes(["MTKIDS"], offered).codes).toEqual(["MTKIDS"]);
  });

  it("exige pelo menos uma", () => {
    expect(normalizeCoachModalityCodes([], offered).error).toBeTruthy();
    expect(normalizeCoachModalityCodes(["", "  ", 3], offered).error).toBeTruthy();
  });

  it("recusa modalidades que a escola não oferece", () => {
    const r = normalizeCoachModalityCodes(["MUAY_THAI", "MMA"], offered);
    expect(r.error).toBeTruthy();
    expect(r.codes).toEqual([]);
  });

  it("recusa listas demasiado grandes", () => {
    const many = Array.from({ length: COACH_REQUEST_MAX_MODALITIES + 1 }, (_, i) => `M${i}`);
    expect(normalizeCoachModalityCodes(many, new Set(many)).error).toBeTruthy();
  });
});

describe("normalizeCoachPhone", () => {
  it("é opcional", () => {
    expect(normalizeCoachPhone("")).toEqual({ phone: null });
    expect(normalizeCoachPhone(undefined)).toEqual({ phone: null });
  });

  it("limpa caracteres estranhos", () => {
    expect(normalizeCoachPhone(" +351 912-345-678 ")).toEqual({ phone: "+351 912345678" });
  });

  it("recusa números curtos ou longos", () => {
    expect(normalizeCoachPhone("12345").error).toBeTruthy();
    expect(normalizeCoachPhone("1234567890123456").error).toBeTruthy();
  });
});

describe("canDecideCoachRequest", () => {
  it("só pedidos pendentes", () => {
    expect(canDecideCoachRequest("PENDING")).toBe(true);
    expect(canDecideCoachRequest("APPROVED")).toBe(false);
    expect(canDecideCoachRequest("REJECTED")).toBe(false);
    expect(canDecideCoachRequest(null)).toBe(false);
  });
});
