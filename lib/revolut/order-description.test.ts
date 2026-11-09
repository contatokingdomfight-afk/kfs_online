import { describe, expect, it } from "vitest";
import { ORDER_DESCRIPTION_MAX, paymentsOrderDescription, storeOrderDescription } from "@/lib/revolut/order-description";

const brand = "Kingdom Fight School";

describe("descrição das ordens Revolut", () => {
  it("uma mensalidade", () => {
    expect(paymentsOrderDescription({ kind: "Pagamentos", brand, studentCode: 155, items: [{ paymentType: "TUITION", referenceMonth: "2026-11", amount: 55 }] })).toBe(
      "Mensalidade nov. 2026 · Kingdom Fight School · Aluno #155"
    );
  });
  it("várias mensalidades", () => {
    const items = [
      { paymentType: "TUITION", referenceMonth: "2026-10", amount: 55 },
      { paymentType: "TUITION", referenceMonth: "2026-11", amount: 55 },
    ];
    expect(paymentsOrderDescription({ kind: "Pagamentos", brand, studentCode: 155, items })).toBe("Mensalidades out. + nov. 2026 · Kingdom Fight School · Aluno #155");
    const across = [
      { paymentType: "TUITION", referenceMonth: "2026-12", amount: 55 },
      { paymentType: "TUITION", referenceMonth: "2027-01", amount: 55 },
    ];
    expect(paymentsOrderDescription({ kind: "Pagamentos", brand, studentCode: null, items: across })).toBe("Mensalidades dez. 2026 + jan. 2027 · Kingdom Fight School");
  });
  it("adesão com itens discriminados", () => {
    const items = [
      { paymentType: "ENROLLMENT", referenceMonth: null, amount: 30 },
      { paymentType: "INSURANCE", referenceMonth: null, amount: 35 },
      { paymentType: "TUITION", referenceMonth: "2026-11", amount: 55 },
    ];
    expect(paymentsOrderDescription({ kind: "Adesão", brand, studentCode: 155, items })).toBe(
      "Adesão Kingdom Fight School · Aluno #155 — Inscrição 30 € + Seguro 35 € + Mensalidade nov. 2026 55 €"
    );
  });
  it("loja com itens e corte no limite", () => {
    expect(storeOrderDescription({ reference: "KFS-0012", brand, studentCode: 155, lines: [{ label: "T-shirt Kingdom (M)", quantity: 1 }] })).toBe(
      "Loja KFS-0012 · Kingdom Fight School · Aluno #155 — T-shirt Kingdom (M) ×1"
    );
    const many = Array.from({ length: 30 }, (_, i) => ({ label: `Produto com nome comprido ${i}`, quantity: 1 }));
    const d = storeOrderDescription({ reference: "KFS-0013", brand, studentCode: 155, lines: many });
    expect(d.length).toBeLessThanOrEqual(ORDER_DESCRIPTION_MAX);
    expect(d.startsWith("Loja KFS-0013 · Kingdom Fight School · Aluno #155 — ")).toBe(true);
  });
});
