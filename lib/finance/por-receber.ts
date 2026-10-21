import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRenewalsPending } from "@/lib/renewals";
import { fetchAllPages, inChunks } from "@/lib/graduation/queries";
import { monthLabelPt } from "@/lib/admin-student-ficha";
import { loadOrders, orderReference } from "@/lib/retail/orders";
import { studentPaymentReference } from "@/lib/revolut/match";

export type PorReceberItem = {
  key: string;
  group: "month" | "older" | "fees" | "orders";
  kind: "TUITION" | "INSURANCE" | "ENROLLMENT" | "ORDER";
  /** Encomenda da loja por pagar. */
  orderId: string | null;
  /** Vazio em encomendas de quem não tem conta. */
  studentId: string;
  name: string;
  phone: string | null;
  what: string;
  detail: string | null;
  amount: number;
  /** Registo em atraso existente (marca como pago); null = mensalidade do mês ainda sem registo. */
  paymentId: string | null;
  referenceMonth: string | null;
  /** Referência de pagamento do aluno (KFS-0143) para cruzar com o descritivo da transferência. */
  paymentRef?: string | null;
  /** Link de WhatsApp com lembrete de pagamento (opcional). */
  reminderUrl?: string | null;
};

type LateRow = {
  id: string;
  studentId: string;
  amount: number | string;
  paymentType: string;
  referenceMonth: string | null;
  referenceYear: string | number | null;
  familyGroupId: string | null;
};

/** O que falta cobrar: mensalidades do mês, atrasos, seguros, matrículas e encomendas da loja por pagar. */
export async function loadPorReceberItems(supabase: SupabaseClient, referenceMonth: string): Promise<PorReceberItem[]> {
  const [renewals, lateRows, pendingOrders] = await Promise.all([
    getRenewalsPending(supabase, referenceMonth),
    fetchAllPages<LateRow>((from, to) =>
      supabase
        .from("Payment")
        .select("id, studentId, amount, paymentType, referenceMonth, referenceYear, familyGroupId")
        .eq("status", "LATE")
        .is("stripeInvoiceId", null)
        .in("paymentType", ["TUITION", "INSURANCE", "ENROLLMENT"])
        .order("id")
        .range(from, to)
    ),
    loadOrders(supabase, { statuses: ["PENDING_PAYMENT"] }),
  ]);

  const items: PorReceberItem[] = [];
  const usedLate = new Set<string>();
  const monthKey = (studentId: string, ref: string | null) => `${studentId}|${String(ref ?? "").slice(0, 7)}`;
  const lateTuitionByKey = new Map(
    lateRows.filter((r) => r.paymentType === "TUITION").map((r) => [monthKey(r.studentId, r.referenceMonth), r])
  );

  // 1) Mensalidades do mês (quem ainda não pagou), com o valor do registo em atraso se já existir.
  for (const r of renewals) {
    const late = lateTuitionByKey.get(monthKey(r.studentId, referenceMonth));
    if (late) usedLate.add(late.id);
    items.push({
      key: late ? late.id : `new-${r.studentId}`,
      group: "month",
      kind: "TUITION",
      orderId: null,
      studentId: r.studentId,
      name: r.studentName,
      phone: null,
      what: r.familyGroupId ? `Mensalidade família · ${monthLabelPt(referenceMonth)}` : `Mensalidade · ${monthLabelPt(referenceMonth)}`,
      detail: r.planName,
      amount: late ? Number(late.amount) || 0 : r.priceMonthly,
      paymentId: late?.id ?? null,
      referenceMonth,
    });
  }

  // 2) Restantes registos em atraso: mensalidades de outros meses, seguros e matrículas.
  for (const r of lateRows) {
    if (usedLate.has(r.id)) continue;
    const ref = r.referenceMonth ? String(r.referenceMonth).slice(0, 7) : null;
    const isTuition = r.paymentType === "TUITION";
    items.push({
      key: r.id,
      group: !isTuition ? "fees" : ref === referenceMonth ? "month" : "older",
      kind: r.paymentType === "INSURANCE" ? "INSURANCE" : r.paymentType === "ENROLLMENT" ? "ENROLLMENT" : "TUITION",
      orderId: null,
      studentId: r.studentId,
      name: "",
      phone: null,
      what: isTuition
        ? `${r.familyGroupId ? "Mensalidade família" : "Mensalidade"} · ${ref ? monthLabelPt(ref) : "sem mês"}`
        : r.paymentType === "INSURANCE"
          ? `Seguro${r.referenceYear != null ? ` ${r.referenceYear}` : ""}`
          : "Matrícula",
      detail: null,
      amount: Number(r.amount) || 0,
      paymentId: r.id,
      referenceMonth: ref,
    });
  }

  // 3) Encomendas da loja por pagar (pré-encomendas).
  for (const o of pendingOrders) {
    const pieces = o.lines.reduce((a, l) => a + l.quantity, 0);
    const products = [...new Set(o.lines.map((l) => l.productName))].join(", ");
    items.push({
      key: `order-${o.id}`,
      group: "orders",
      kind: "ORDER",
      studentId: o.studentId ?? "",
      name: o.customerName ?? "",
      phone: o.customerPhone ?? null,
      what: `Encomenda ${orderReference(o.number)}`,
      detail: `${pieces} ${pieces === 1 ? "peça" : "peças"} · ${products}`,
      amount: Number(o.totalAmount) || 0,
      paymentId: null,
      referenceMonth: null,
      orderId: o.id,
    });
  }

  // Nomes e telefones
  const studentIds = [...new Set(items.map((i) => i.studentId).filter(Boolean))];
  const [students, profiles] = await Promise.all([
    inChunks(studentIds, async (ids) => (await supabase.from("Student").select("id, userId, status, paymentCode").in("id", ids)).data ?? []),
    inChunks(studentIds, async (ids) => (await supabase.from("StudentProfile").select("studentId, phone").in("studentId", ids)).data ?? []),
  ]);
  const userIds = [...new Set(students.map((s) => s.userId))];
  const users = await inChunks(userIds, async (ids) => (await supabase.from("User").select("id, name, email").in("id", ids)).data ?? []);
  const userById = new Map(users.map((u) => [u.id, u]));
  const userOfStudent = new Map(students.map((s) => [s.id, userById.get(s.userId)]));
  const phoneOf = new Map(profiles.map((p) => [p.studentId, (p as { phone?: string | null }).phone ?? null]));
  // Atrasos antigos, seguros e matrículas: só alunos ativos/inadimplentes (como no «A tratar hoje»).
  const codeOf = new Map(students.map((s) => [s.id, (s as { paymentCode?: number | null }).paymentCode ?? null]));
  const statusOf = new Map(students.map((s) => [s.id, (s as { status?: string }).status ?? ""]));
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it.kind !== "ORDER" && it.paymentId && !(it.group === "month" && it.referenceMonth === referenceMonth) && !["ATIVO", "INADIMPLENTE"].includes(statusOf.get(it.studentId) ?? "")) {
      items.splice(i, 1);
    }
  }
  for (const it of items) {
    const u = userOfStudent.get(it.studentId);
    if (!it.name) it.name = u?.name || u?.email || "—";
    it.phone = phoneOf.get(it.studentId) ?? it.phone ?? null;
    it.paymentRef = studentPaymentReference(codeOf.get(it.studentId) ?? null);
  }
  const order = { month: 0, older: 1, fees: 2, orders: 3 } as const;
  items.sort((a, b) => order[a.group] - order[b.group] || a.name.localeCompare(b.name, "pt", { sensitivity: "base" }));

  return items;
}
