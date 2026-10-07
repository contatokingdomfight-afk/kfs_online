import { describe, expect, it } from "vitest";
import { selectGraduationModalities, type GraduationModalityInput } from "./modality-selection";

const base: GraduationModalityInput = {
  published: ["MUAY_THAI", "BOXING", "BJJ"],
  primary: null,
  attended: [],
  graded: [],
  planScope: "SINGLE",
  components: { MMA: ["MUAY_THAI", "BOXING", "BJJ"] },
  names: { MUAY_THAI: "Muay Thai", BOXING: "Boxing", BJJ: "Jiu-Jitsu", MMA: "MMA" },
};

describe("selectGraduationModalities", () => {
  it("shows only linked modalities with a published graduation", () => {
    expect(selectGraduationModalities({ ...base, primary: "BOXING", attended: ["KRT"] })).toEqual(["BOXING"]);
  });

  it("MMA students see the graduations of the base modalities", () => {
    expect(selectGraduationModalities({ ...base, primary: "MMA" })).toEqual(["BOXING", "BJJ", "MUAY_THAI"]);
  });

  it("all-modalities plan shows every published graduation, linked ones first", () => {
    expect(selectGraduationModalities({ ...base, primary: "MUAY_THAI", graded: ["BJJ"], planScope: "ALL" })).toEqual([
      "MUAY_THAI",
      "BJJ",
      "BOXING",
    ]);
  });

  it("a student with no modality at all sees every published graduation", () => {
    expect(selectGraduationModalities(base)).toEqual(["BOXING", "BJJ", "MUAY_THAI"]);
  });

  it("a student linked only to modalities without graduation sees nothing", () => {
    expect(selectGraduationModalities({ ...base, primary: "KRT" })).toEqual([]);
  });
});
