import { describe, expect, it } from "vitest";
import { isSchoolOwnModality, modalitiesForSchools, offeredModalities, schoolModalityCode } from "./school-modalities-rules";

const refs = [
  { code: "MUAY_THAI", name: "Muay Thai", schoolId: null },
  { code: "MMA", name: "MMA", schoolId: null },
  { code: "LX__JIU_JITSU", name: "Jiu-Jitsu", schoolId: "lx" },
  { code: "PT__YOGA", name: "Yoga", schoolId: "pt" },
];

describe("offeredModalities", () => {
  it("rede menos as desligadas + as próprias da escola", () => {
    const codes = offeredModalities({ refs, disabledCodes: new Set(["MMA"]) }, "lx").map((m) => m.code);
    expect(codes).toEqual(["MUAY_THAI", "LX__JIU_JITSU"]);
  });
  it("sem escola → só as da rede", () => {
    expect(offeredModalities({ refs, disabledCodes: new Set() }, null).map((m) => m.code)).toEqual(["MUAY_THAI", "MMA"]);
  });
});

describe("modalitiesForSchools", () => {
  it("diretor vê a rede e as das suas escolas", () => {
    expect(modalitiesForSchools(refs, ["pt"]).map((m) => m.code)).toEqual(["MUAY_THAI", "MMA", "PT__YOGA"]);
  });
  it("rede (null) vê todas", () => {
    expect(modalitiesForSchools(refs, null)).toHaveLength(4);
  });
});

describe("isSchoolOwnModality / schoolModalityCode", () => {
  it("identifica as próprias", () => {
    expect(isSchoolOwnModality(refs, "LX__JIU_JITSU")).toBe(true);
    expect(isSchoolOwnModality(refs, "MUAY_THAI")).toBe(false);
  });
  it("gera código sem acentos e com a escola", () => {
    expect(schoolModalityCode("Jiu-Jitsu Brasileiro", "kfs-lisboa")).toBe("KFS_LISBOA__JIU_JITSU_BRASILEIRO");
  });
});
