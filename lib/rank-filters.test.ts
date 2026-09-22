import { describe, expect, it } from "vitest";
import { rankMedal } from "./rank-filters";

describe("rankMedal", () => {
  it("returns gold for 1st place", () => {
    expect(rankMedal(1)).toBe("🥇");
  });

  it("returns silver for 2nd place", () => {
    expect(rankMedal(2)).toBe("🥈");
  });

  it("returns bronze for 3rd place", () => {
    expect(rankMedal(3)).toBe("🥉");
  });

  it("returns null from 4th place onward", () => {
    expect(rankMedal(4)).toBeNull();
    expect(rankMedal(100)).toBeNull();
  });

  it("returns null for non-podium ranks (0 or negative, defensive)", () => {
    expect(rankMedal(0)).toBeNull();
    expect(rankMedal(-1)).toBeNull();
  });
});
