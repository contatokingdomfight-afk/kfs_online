import { describe, expect, it } from "vitest";
import { computeStudentGrowth } from "@/lib/student-growth";

const months = [
  { key: "2026-08", start: "2026-08-01", end: "2026-08-31" },
  { key: "2026-09", start: "2026-09-01", end: "2026-09-30" },
  { key: "2026-10", start: "2026-10-01", end: "2026-10-31" },
];

describe("computeStudentGrowth", () => {
  it("quem passa a INATIVO sai da linha de ativos a partir desse mês e conta como churn", () => {
    const rows = computeStudentGrowth(
      [
        { createdAt: "2026-08-10", status: "ATIVO", statusChangedAt: null },
        { createdAt: "2026-08-20", status: "INATIVO", statusChangedAt: "2026-09-26T10:00:00Z" },
        { createdAt: "2026-10-02", status: "ATIVO", statusChangedAt: null },
      ],
      months
    );
    expect(rows).toEqual([
      { bucket: "2026-08", active: 2, new: 2, churned: 0 },
      { bucket: "2026-09", active: 1, new: 0, churned: 1 },
      { bucket: "2026-10", active: 2, new: 1, churned: 0 },
    ]);
  });

  it("entra e sai no mesmo mês: conta como novo e churn, mas não como ativo", () => {
    const [, sep] = computeStudentGrowth([{ createdAt: "2026-09-22", status: "INATIVO", statusChangedAt: "2026-09-26" }], months);
    expect(sep).toEqual({ bucket: "2026-09", active: 0, new: 1, churned: 1 });
  });

  it("INADIMPLENTE sem plano conta como churn; com plano continua ativo", () => {
    const [, semPlano] = computeStudentGrowth([{ createdAt: "2026-08-01", status: "INADIMPLENTE", statusChangedAt: "2026-09-10", planId: null }], months);
    expect(semPlano).toEqual({ bucket: "2026-09", active: 0, new: 0, churned: 1 });
    const [, comPlano] = computeStudentGrowth([{ createdAt: "2026-08-01", status: "INADIMPLENTE", statusChangedAt: "2026-09-10", planId: "p1" }], months);
    expect(comPlano).toEqual({ bucket: "2026-09", active: 1, new: 0, churned: 0 });
  });
});
