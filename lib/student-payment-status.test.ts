import { describe, expect, it } from "vitest";
import { deriveStudentStatusFromPayments } from "./student-payment-status";

describe("deriveStudentStatusFromPayments", () => {
  it("devolve null quando o aluno não está em programa de pagamento", () => {
    const out = deriveStudentStatusFromPayments({
      lateMonthCount: 5,
      paymentSuspendedAt: null,
      planId: null,
      adminGrantedFullAccess: false,
      inPaymentProgram: false,
    });
    expect(out).toBeNull();
  });

  it("marca ATIVO quando tem plano e nenhum mês em atraso", () => {
    const out = deriveStudentStatusFromPayments({
      lateMonthCount: 0,
      paymentSuspendedAt: null,
      planId: "plan_123",
      adminGrantedFullAccess: false,
      inPaymentProgram: true,
    });
    expect(out).toBe("ATIVO");
  });

  it("bolsista com acesso concedido e sem atrasos fica ATIVO", () => {
    const out = deriveStudentStatusFromPayments({
      lateMonthCount: 0,
      paymentSuspendedAt: null,
      planId: null,
      adminGrantedFullAccess: true,
      inPaymentProgram: true,
    });
    expect(out).toBe("ATIVO");
  });

  it("após anular cobrança (0 atrasos) mas sem plano nem acesso -> INADIMPLENTE", () => {
    const out = deriveStudentStatusFromPayments({
      lateMonthCount: 0,
      paymentSuspendedAt: null,
      planId: null,
      adminGrantedFullAccess: false,
      inPaymentProgram: true,
    });
    expect(out).toBe("INADIMPLENTE");
  });

  it("1 mês em atraso -> INADIMPLENTE mesmo com plano", () => {
    const out = deriveStudentStatusFromPayments({
      lateMonthCount: 1,
      paymentSuspendedAt: null,
      planId: "plan_123",
      adminGrantedFullAccess: false,
      inPaymentProgram: true,
    });
    expect(out).toBe("INADIMPLENTE");
  });

  it("acesso suspenso por pagamento -> INADIMPLENTE", () => {
    const out = deriveStudentStatusFromPayments({
      lateMonthCount: 0,
      paymentSuspendedAt: "2026-06-01T00:00:00.000Z",
      planId: null,
      adminGrantedFullAccess: false,
      inPaymentProgram: true,
    });
    expect(out).toBe("INADIMPLENTE");
  });

  it("paymentSuspendedAt residual mas plano já reatribuído -> ATIVO", () => {
    const out = deriveStudentStatusFromPayments({
      lateMonthCount: 0,
      paymentSuspendedAt: "2026-07-03T08:29:10.045Z",
      planId: "plan_123",
      adminGrantedFullAccess: false,
      inPaymentProgram: true,
    });
    expect(out).toBe("ATIVO");
  });

  it("2+ meses em atraso -> INATIVO", () => {
    const out = deriveStudentStatusFromPayments({
      lateMonthCount: 2,
      paymentSuspendedAt: null,
      planId: "plan_123",
      adminGrantedFullAccess: true,
      inPaymentProgram: true,
    });
    expect(out).toBe("INATIVO");
  });
});
