import { describe, expect, it } from "vitest";
import { proposeMigrationGrade } from "./migration";
import { KINGDOM_MUAY_THAI_GRADES } from "./kingdom-muay-thai-template";

const grades = KINGDOM_MUAY_THAI_GRADES; // acumulados: 3, 6, 10, 15, 21, ...

describe("proposeMigrationGrade", () => {
  it("starting belt or no athlete means no grade", () => {
    expect(proposeMigrationGrade(0, 12, grades)).toEqual({ gradeIndex: -1, reason: "STARTING_BELT" });
    expect(proposeMigrationGrade(null, 12, grades)).toEqual({ gradeIndex: -1, reason: "NO_ATHLETE" });
  });

  it("maps legacy belt k to the k-th grade when time allows", () => {
    expect(proposeMigrationGrade(2, 6, grades)).toEqual({ gradeIndex: 1, reason: "LEGACY_MATCH" });
  });

  it("caps by the accumulated time already tracked", () => {
    expect(proposeMigrationGrade(4, 7, grades)).toEqual({ gradeIndex: 1, reason: "CAPPED_BY_TIME" });
    expect(proposeMigrationGrade(1, 1, grades)).toEqual({ gradeIndex: -1, reason: "CAPPED_BY_TIME" });
  });

  it("never proposes beyond the last grade", () => {
    expect(proposeMigrationGrade(20, 500, grades).gradeIndex).toBe(grades.length - 1);
  });
});
