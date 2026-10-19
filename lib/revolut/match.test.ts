import { describe, expect, it } from "vitest";
import { matchTransfer, namesMatch, normalizePayer, parseReferences } from "./match";
import type { PorReceberItem } from "@/lib/finance/por-receber";

const item = (p: Partial<PorReceberItem>): PorReceberItem => ({
  key: p.key ?? "k",
  group: p.group ?? "month",
  kind: p.kind ?? "TUITION",
  orderId: p.orderId ?? null,
  studentId: p.studentId ?? "s1",
  name: p.name ?? "João Pedro Martins",
  phone: null,
  what: p.what ?? "Mensalidade · Out.",
  detail: null,
  amount: p.amount ?? 55,
  paymentId: p.paymentId ?? null,
  referenceMonth: p.referenceMonth ?? "2026-10",
});
const ctx = { studentByCode: new Map([[123, "s1"]]), aliasStudent: null, orderNumberById: new Map([["o1", 45]]) };

describe("normalizePayer / namesMatch", () => {
  it("tira prefixos e acentos", () => {
    expect(normalizePayer("From João Martins")).toBe("JOAO MARTINS");
    expect(normalizePayer("Transferência de Ana Lopes")).toBe("ANA LOPES");
  });
  it("primeiro nome + apelido", () => {
    expect(namesMatch("JOAO P MARTINS", "João Pedro Martins")).toBe(true);
    expect(namesMatch("PEDRO COSTA", "João Pedro Martins")).toBe(false);
    expect(namesMatch("JOAO", "João Pedro Martins")).toBe(false);
  });
});

describe("parseReferences", () => {
  it("aluno e encomenda", () => {
    expect(parseReferences("kfs-0123 mensalidade")).toEqual({ orderNumber: null, studentCode: 123 });
    expect(parseReferences("KFS-ENC-0045")).toEqual({ orderNumber: 45, studentCode: null });
    expect(parseReferences("mensalidade")).toEqual({ orderNumber: null, studentCode: null });
  });
});

describe("matchTransfer", () => {
  it("referência do aluno + valor certo = automático", () => {
    const r = matchTransfer({ amount: 55, payerName: "Qualquer", reference: "KFS-0123" }, [item({})], ctx);
    expect(r.status).toBe("AUTO");
  });
  it("só o nome + valor certo = automático", () => {
    const r = matchTransfer({ amount: 55, payerName: "From JOAO MARTINS", reference: "mensalidade" }, [item({})], ctx);
    expect(r.status).toBe("AUTO");
  });
  it("nome certo mas valor diferente = sugestão", () => {
    const r = matchTransfer({ amount: 50, payerName: "JOAO MARTINS", reference: "" }, [item({})], ctx);
    expect(r.status).toBe("SUGGESTED");
  });
  it("dois alunos possíveis = sugestão", () => {
    const items = [item({ key: "a", studentId: "s1", name: "Pedro Costa Silva" }), item({ key: "b", studentId: "s2", name: "Pedro Silva Costa" })];
    const r = matchTransfer({ amount: 55, payerName: "PEDRO COSTA", reference: "" }, items, ctx);
    expect(r.status).toBe("SUGGESTED");
  });
  it("encomenda pela referência", () => {
    const r = matchTransfer({ amount: 35, payerName: "ANA", reference: "KFS-ENC-0045" }, [item({ kind: "ORDER", orderId: "o1", amount: 35, studentId: "" })], ctx);
    expect(r.status).toBe("AUTO");
  });
  it("seguro nunca é automático", () => {
    const r = matchTransfer({ amount: 25, payerName: "", reference: "KFS-0123" }, [item({ kind: "INSURANCE", group: "fees", amount: 25 })], ctx);
    expect(r.status).toBe("SUGGESTED");
  });
  it("nada bate certo", () => {
    const r = matchTransfer({ amount: 120, payerName: "FORNECEDOR LDA", reference: "reembolso" }, [item({})], ctx);
    expect(r.status).toBe("UNMATCHED");
  });
});
