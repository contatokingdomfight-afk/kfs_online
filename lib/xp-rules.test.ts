import { describe, expect, it } from "vitest";
import { DEFAULT_XP_RULES, parseXpRulesInput, summarizeXp } from "./xp-rules";

describe("summarizeXp", () => {
  it("splits XP by modality, general and source", () => {
    const s = summarizeXp([
      { modality_code: "MUAY_THAI", source: "ATTENDANCE", xp: 50, events: 5 },
      { modality_code: "MUAY_THAI", source: "PERFORMANCE", xp: 25, events: 1 },
      { modality_code: "BOXING", source: "ATTENDANCE", xp: 20, events: 2 },
      { modality_code: null, source: "PHYSICAL", xp: 50, events: 1 },
    ]);
    expect(s.total).toBe(145);
    expect(s.general).toBe(50);
    expect(s.byModality).toEqual([
      { code: "MUAY_THAI", xp: 75 },
      { code: "BOXING", xp: 20 },
    ]);
    expect(s.bySource).toEqual([
      { source: "ATTENDANCE", xp: 70, events: 7 },
      { source: "PERFORMANCE", xp: 25, events: 1 },
      { source: "PHYSICAL", xp: 50, events: 1 },
    ]);
  });

  it("ignores unknown sources in the breakdown but keeps them in the total", () => {
    const s = summarizeXp([{ modality_code: null, source: "LEGACY", xp: 10, events: 1 }]);
    expect(s.total).toBe(10);
    expect(s.bySource).toEqual([]);
  });
});

describe("parseXpRulesInput", () => {
  it("accepts integer strings", () => {
    const input = Object.fromEntries(Object.entries(DEFAULT_XP_RULES).map(([k, v]) => [k, String(v)]));
    expect(parseXpRulesInput({ ...input, ATTENDANCE: "15" })).toEqual({ ok: true, rules: { ...DEFAULT_XP_RULES, ATTENDANCE: 15 } });
  });

  it("rejects negative or decimal values", () => {
    expect(parseXpRulesInput({ ...DEFAULT_XP_RULES, PHYSICAL: -1 }).ok).toBe(false);
    expect(parseXpRulesInput({ ...DEFAULT_XP_RULES, PHYSICAL: "2.5" }).ok).toBe(false);
  });
});
