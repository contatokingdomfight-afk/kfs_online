import { describe, expect, it } from "vitest";
import { formDataProfileToAvatarScales } from "./illustrative-body-2d-pipeline";
import { hasIllustrativeAnthropometry, normalizePhysicalFormDataJson } from "./illustrative-body-silhouette";
import type { PhysicalAssessmentFormData } from "./physical-assessment-types";

describe("hasIllustrativeAnthropometry", () => {
  it("rejeita ficha sem medidas antropométricas", () => {
    expect(hasIllustrativeAnthropometry({})).toBe(false);
  });

  it("rejeita com apenas uma medida válida", () => {
    expect(hasIllustrativeAnthropometry({ circChestCm: 96 })).toBe(false);
  });

  it("aceita com pelo menos duas medidas válidas", () => {
    expect(
      hasIllustrativeAnthropometry({
        circChestCm: 96,
        circAbdomenCm: 84,
      })
    ).toBe(true);
  });
});

describe("formDataProfileToAvatarScales", () => {
  it("neutro: escalas ~1 sem medidas na ficha mas com altura de perfil", () => {
    const { measurements, scales, globalEnvelopeScale } = formDataProfileToAvatarScales(
      {},
      { heightCm: 172, weightKg: 74 }
    );
    expect(measurements.height).toBe(172);
    expect(scales.height).toBeGreaterThanOrEqual(0.7);
    expect(scales.height).toBeLessThanOrEqual(1.31);
    expect(globalEnvelopeScale).toBeGreaterThanOrEqual(0.86);
    expect(globalEnvelopeScale).toBeLessThanOrEqual(1.14);
  });

  it("mínimo útil: duas circunferências alteram tórax/cintura em relação ao vazio", () => {
    const minimal: Partial<PhysicalAssessmentFormData> = {
      circChestCm: 110,
      circAbdomenCm: 95,
    };
    const neutral = formDataProfileToAvatarScales({}, null);
    const withData = formDataProfileToAvatarScales(minimal, null);
    expect(withData.scales.chest).not.toBeCloseTo(neutral.scales.chest, 1);
    expect(withData.scales.waist).not.toBeCloseTo(neutral.scales.waist, 1);
  });

  it("mantém factores dentro dos clamps por região (amostra «completa»)", () => {
    const rich: Partial<PhysicalAssessmentFormData> = {
      breadthShoulderCm: 44,
      circChestCm: 102,
      circAbdomenCm: 88,
      circHipCm: 100,
      circThighLeftCm: 58,
      circThighRightCm: 58,
      circCalfLeftCm: 38,
      circCalfRightCm: 38,
      circArmLeftCm: 30,
      circArmRightCm: 30,
      circBicepsLeftCm: 34,
      circBicepsRightCm: 34,
      lenLegInseamLeftCm: 80,
      lenLegInseamRightCm: 80,
      heightCm: 178,
      weightKg: 82,
    };
    const { scales, globalEnvelopeScale } = formDataProfileToAvatarScales(rich, null);
    expect(globalEnvelopeScale).toBeGreaterThanOrEqual(0.86);
    expect(globalEnvelopeScale).toBeLessThanOrEqual(1.14);
    expect(scales.shoulder).toBeGreaterThanOrEqual(0.58);
    expect(scales.shoulder).toBeLessThanOrEqual(1.48);
    expect(scales.waist).toBeGreaterThanOrEqual(0.54);
    expect(scales.waist).toBeLessThanOrEqual(1.56);
    expect(scales.hip).toBeGreaterThanOrEqual(0.54);
    expect(scales.hip).toBeLessThanOrEqual(1.56);
    expect(scales.height).toBeGreaterThanOrEqual(0.7);
    expect(scales.height).toBeLessThanOrEqual(1.3);
    expect(scales.bulk).toBeGreaterThanOrEqual(0.86);
    expect(scales.bulk).toBeLessThanOrEqual(1.14);
  });

  it("JSON normalizado da BD mantém antropometria contável", () => {
    const raw = JSON.stringify({ circNeckCm: 38, circHipCm: 99 });
    const p = normalizePhysicalFormDataJson(raw);
    expect(p).not.toBeNull();
    expect(hasIllustrativeAnthropometry(p!)).toBe(true);
  });
});
