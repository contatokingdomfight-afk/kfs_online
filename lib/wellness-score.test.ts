import { describe, expect, it } from "vitest";
import { computeWellnessZone } from "./wellness-score";

describe("computeWellnessZone", () => {
  it("returns GREEN for good recovery inputs", () => {
    expect(
      computeWellnessZone({
        sleepHours: 8,
        sleepQuality: 5,
        hydrationOk: true,
        stress: 1,
        fatigue: 1,
      })
    ).toBe("GREEN");
  });

  it("returns RED for severe lack of sleep and high fatigue", () => {
    expect(
      computeWellnessZone({
        sleepHours: 4,
        sleepQuality: 2,
        hydrationOk: false,
        stress: 5,
        fatigue: 5,
      })
    ).toBe("RED");
  });
});
