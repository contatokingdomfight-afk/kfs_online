import { describe, expect, it } from "vitest";
import { churnRisk, physicalDue, todoDoneKey, trialToConvert, weekKey } from "@/lib/admin-todo-rules";

const today = "2026-10-11"; // domingo

describe("churnRisk", () => {
  it("em risco a partir de 14 dias sem treinar", () => {
    expect(churnRisk({ today, lastTraining: "2026-09-28", createdAt: "2026-01-01" })).toBeNull();
    expect(churnRisk({ today, lastTraining: "2026-09-27", createdAt: "2026-01-01" })).toEqual({ daysSince: 14, neverTrained: false });
  });

  it("sem treinos: só conta se a conta tiver mais de 14 dias", () => {
    expect(churnRisk({ today, lastTraining: null, createdAt: "2026-10-05T10:00:00Z" })).toBeNull();
    expect(churnRisk({ today, lastTraining: null, createdAt: "2026-09-01T10:00:00Z" })).toEqual({ daysSince: 40, neverTrained: true });
  });
});

describe("physicalDue", () => {
  it("vence nos próximos 30 dias ou já venceu", () => {
    expect(physicalDue(today, "2026-11-30")).toBeNull();
    expect(physicalDue(today, "2026-11-10")).toEqual({ daysLeft: 30 });
    expect(physicalDue(today, "2026-10-01")).toEqual({ daysLeft: -10 });
    expect(physicalDue(today, null)).toBeNull();
  });
});

describe("trialToConvert", () => {
  it("aula feita há no máximo 14 dias e não convertida", () => {
    expect(trialToConvert(today, "2026-10-08", false)).toEqual({ daysAgo: 3 });
    expect(trialToConvert(today, "2026-09-20", false)).toBeNull();
    expect(trialToConvert(today, "2026-10-13", false)).toBeNull();
    expect(trialToConvert(today, "2026-10-08", true)).toBeNull();
  });
});

describe("todoDoneKey", () => {
  it("lembretes voltam na semana seguinte; risco volta se o último treino mudar", () => {
    expect(weekKey(today)).toBe("2026-10-05");
    expect(todoDoneKey("adesao", { id: "s1", today })).toBe("s1::2026-10-05");
    expect(todoDoneKey("adesao", { id: "s1", today: "2026-10-12" })).toBe("s1::2026-10-12");
    expect(todoDoneKey("risco", { id: "s1", ref: "2026-09-20", today })).toBe("s1:2026-09-20");
    expect(todoDoneKey("risco", { id: "s1", ref: "2026-09-20", today: "2026-10-20" })).toBe("s1:2026-09-20");
  });
});
