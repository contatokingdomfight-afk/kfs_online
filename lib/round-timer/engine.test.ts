import { describe, expect, it } from "vitest";
import {
  applyPhaseEnd,
  catchUp,
  clampConfig,
  initialState,
  phaseDurationMs,
  startFromIdle,
} from "./engine";

describe("round-timer engine", () => {
  it("last round finishes without rest", () => {
    const cfg = clampConfig({ rounds: 1, roundSec: 60, restSec: 30, countdownSec: 0 });
    let s = startFromIdle(initialState(cfg), 1_000_000);
    expect(s.phase).toBe("round");
    s = applyPhaseEnd(s, 1_000_000 + 60_001);
    expect(s.phase).toBe("finished");
  });

  it("alternates round rest and ends", () => {
    const cfg = clampConfig({ rounds: 2, roundSec: 60, restSec: 10, countdownSec: 0 });
    let s = startFromIdle(initialState(cfg), 0);
    expect(s.phase).toBe("round");
    expect(s.roundIdx).toBe(0);
    s = applyPhaseEnd(s, 60_001);
    expect(s.phase).toBe("rest");
    s = applyPhaseEnd(s, 70_001);
    expect(s.phase).toBe("round");
    expect(s.roundIdx).toBe(1);
    s = applyPhaseEnd(s, 130_002);
    expect(s.phase).toBe("finished");
  });

  it("catchUp collapses the rest phase into a direct round-to-round jump when restSec is 0", () => {
    const cfg = clampConfig({ rounds: 3, roundSec: 60, restSec: 0, countdownSec: 0 });
    let s = startFromIdle(initialState(cfg), 0);
    expect(s.phase).toBe("round");
    expect(s.roundIdx).toBe(0);
    s = catchUp(s, 60_001);
    // A fase "rest" (duração 0) nunca é observável: o motor já entrega o round seguinte.
    expect(s.phase).toBe("round");
    expect(s.roundIdx).toBe(1);
    expect(s.completedRoundIdx).toBe(0);
  });

  it("catchUp advances after long idle", () => {
    const cfg = clampConfig({ rounds: 1, roundSec: 60, restSec: 0, countdownSec: 5 });
    let s = startFromIdle(initialState(cfg), 0);
    expect(s.phase).toBe("countdown");
    s = catchUp(s, 10_000);
    expect(s.phase).toBe("round");
  });

  it("phaseDurationMs matches config phases", () => {
    const cfg = clampConfig({ rounds: 3, roundSec: 90, restSec: 30, countdownSec: 10 });
    expect(phaseDurationMs("countdown", cfg, null)).toBe(10_000);
    expect(phaseDurationMs("round", cfg, null)).toBe(90_000);
    expect(phaseDurationMs("rest", cfg, null)).toBe(30_000);
  });
});
