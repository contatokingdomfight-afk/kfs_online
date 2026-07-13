import { describe, expect, it } from "vitest";
import {
  applyOfficialPointDeduction,
  emptyOccurrences,
  officialDeductionForCorner,
  syncDeductionsFromOccurrences,
} from "@/lib/arbitration/occurrences";

describe("arbitration occurrences", () => {
  it("applies point deduction with floor at 6", () => {
    expect(applyOfficialPointDeduction(10, 1)).toBe(9);
    expect(applyOfficialPointDeduction(9, 3)).toBe(6);
    expect(applyOfficialPointDeduction(8, 1)).toBe(7);
    expect(applyOfficialPointDeduction(7, 1)).toBe(6);
    expect(applyOfficialPointDeduction(6, 1)).toBe(6);
  });

  it("syncs deduction when perda de ponto is marked", () => {
    const base = emptyOccurrences();
    base.blue.pointDeduction = true;
    const synced = syncDeductionsFromOccurrences(base);
    expect(synced.blueOfficialPointDeduction).toBe(1);
  });

  it("syncs knockdown with automatic 3-point deduction", () => {
    const base = emptyOccurrences();
    base.blue.knockdown = true;
    const synced = syncDeductionsFromOccurrences(base);
    expect(synced.blueOfficialPointDeduction).toBe(3);
    expect(applyOfficialPointDeduction(9, officialDeductionForCorner(synced.blue, synced.blueOfficialPointDeduction))).toBe(6);
  });
});
