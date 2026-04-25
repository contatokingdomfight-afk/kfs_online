import { describe, expect, it } from "vitest";
import { computeGlobalBodyScale } from "./illustrative-body-silhouette";

describe("computeGlobalBodyScale", () => {
  it("devolve 1 sem dados utilizáveis", () => {
    expect(computeGlobalBodyScale(undefined, undefined)).toBe(1);
    expect(computeGlobalBodyScale(null, null)).toBe(1);
  });

  it("altura de referência com peso típico fica no envelope", () => {
    const s = computeGlobalBodyScale(172, 74);
    expect(s).toBeGreaterThanOrEqual(0.86);
    expect(s).toBeLessThanOrEqual(1.14);
  });

  it("só peso válido devolve factor limitado", () => {
    const s = computeGlobalBodyScale(undefined, 80);
    expect(s).toBeGreaterThanOrEqual(0.9);
    expect(s).toBeLessThanOrEqual(1.1);
  });
});
