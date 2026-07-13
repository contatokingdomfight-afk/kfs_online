import { describe, expect, it } from "vitest";
import {
  computeDecisionType,
  suggestTenPointMust,
  sumCornerScores,
  winnerFromTotals,
} from "@/lib/arbitration/scoring";

describe("arbitration scoring", () => {
  it("sums corner scores when all criteria filled", () => {
    const scores = {
      offensiveVolume: 4,
      strikePrecision: 4,
      ringControl: 4,
      movement: 4,
      defense: 4,
      technique: 4,
    };
    expect(sumCornerScores(scores)).toBe(24);
  });

  it("suggests 10-10 for diff <= 2", () => {
    expect(suggestTenPointMust(24, 23)).toEqual({ blue: 10, red: 10 });
    expect(suggestTenPointMust(20, 18)).toEqual({ blue: 10, red: 10 });
  });

  it("suggests 10-9 for diff 3-6", () => {
    expect(suggestTenPointMust(24, 20)).toEqual({ blue: 10, red: 9 });
    expect(suggestTenPointMust(18, 22)).toEqual({ blue: 9, red: 10 });
  });

  it("suggests 10-8 for diff 7-10", () => {
    expect(suggestTenPointMust(26, 18)).toEqual({ blue: 10, red: 8 });
  });

  it("suggests 10-7 for diff > 10", () => {
    expect(suggestTenPointMust(28, 14)).toEqual({ blue: 10, red: 7 });
  });

  it("computes decision types", () => {
    expect(computeDecisionType(["BLUE", "BLUE", "BLUE"])).toBe("UNANIMOUS");
    expect(computeDecisionType(["BLUE", "RED", "BLUE"])).toBe("MAJORITY");
    expect(computeDecisionType(["BLUE", "RED", "DRAW"])).toBe("SPLIT");
  });

  it("determines winner from totals", () => {
    expect(winnerFromTotals(29, 28)).toBe("BLUE");
    expect(winnerFromTotals(27, 28)).toBe("RED");
    expect(winnerFromTotals(28, 28)).toBe("DRAW");
  });
});
