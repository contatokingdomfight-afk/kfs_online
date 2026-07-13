import { describe, expect, it } from "vitest";
import { applyOfficialPointDeduction, syncDeductionsFromOccurrences, emptyOccurrences } from "@/lib/arbitration/occurrences";

describe("arbitration occurrences", () => {
  it("applies point deduction with floor at 7", () => {
    expect(applyOfficialPointDeduction(10, 1)).toBe(9);
    expect(applyOfficialPointDeduction(8, 1)).toBe(7);
    expect(applyOfficialPointDeduction(7, 1)).toBe(7);
  });

  it("syncs deduction when perda de ponto is marked", () => {
    const base = emptyOccurrences();
    base.blue.pointDeduction = true;
    const synced = syncDeductionsFromOccurrences(base);
    expect(synced.blueOfficialPointDeduction).toBe(1);
  });
});
