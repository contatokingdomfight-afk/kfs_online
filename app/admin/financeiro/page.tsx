import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { getRenewalsPending } from "@/lib/renewals";
import { getFinanceiroOverview } from "@/lib/admin-finance-overview";
import { fetchAllPages, inChunks } from "@/lib/graduation/queries";
import { monthLabelPt } from "@/lib/admin-student-ficha";
import { MonthSelector } from "./_components/MonthSelector";
import { PorReceberList, type PorReceberItem } from "./_components/PorReceberList";
import { FindStudentToPay } from "./_components/FindStudentToPay";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ month?: string }>;

const eur = (n: number) => n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

type LateRow = {
  id: string;
  studentId: string;
  amount: number | string;
  paymentType: string;
  referenceMonth: string | null;
  referenceYear: string | number | null;
  familyGroupId: string | null;
};

/** Receber: o que falta cobrar (mensalidades do mês, atrasos, seguros e matrículas) com registo num toque. */
export default async function AdminFinanceiroReceberPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const currentMonth = currentReferenceMonthLisbon(new Date());
  const referenceMonth = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : currentMonth;

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const [overview, renewals, lateRows] = await Promise.all([
    getFinanceiroOverview(supabase, referenceMonth),
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

  // Nomes e telefones
  const studentIds = [...new Set(items.map((i) => i.studentId))];
  const [students, profiles] = await Promise.all([
    inChunks(studentIds, async (ids) => (await supabase.from("Student").select("id, userId, status").in("id", ids)).data ?? []),
    inChunks(studentIds, async (ids) => (await supabase.from("StudentProfile").select("studentId, phone").in("studentId", ids)).data ?? []),
  ]);
  const userIds = [...new Set(students.map((s) => s.userId))];
  const users = await inChunks(userIds, async (ids) => (await supabase.from("User").select("id, name, email").in("id", ids)).data ?? []);
  const userById = new Map(users.map((u) => [u.id, u]));
  const userOfStudent = new Map(students.map((s) => [s.id, userById.get(s.userId)]));
  const phoneOf = new Map(profiles.map((p) => [p.studentId, (p as { phone?: string | null }).phone ?? null]));
  // Atrasos antigos, seguros e matrículas: só alunos ativos/inadimplentes (como no «A tratar hoje»).
  const statusOf = new Map(students.map((s) => [s.id, (s as { status?: string }).status ?? ""]));
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it.paymentId && !(it.group === "month" && it.referenceMonth === referenceMonth) && !["ATIVO", "INADIMPLENTE"].includes(statusOf.get(it.studentId) ?? "")) {
      items.splice(i, 1);
    }
  }
  for (const it of items) {
    const u = userOfStudent.get(it.studentId);
    if (!it.name) it.name = u?.name || u?.email || "—";
    it.phone = phoneOf.get(it.studentId) ?? null;
  }
  const order = { month: 0, older: 1, fees: 2 } as const;
  items.sort((a, b) => order[a.group] - order[b.group] || a.name.localeCompare(b.name, "pt", { sensitivity: "base" }));

  const toReceive = items.reduce((a, i) => a + i.amount, 0);
  const periodRaw = new Date(referenceMonth + "-15T12:00:00Z").toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  const periodLabel = periodRaw.charAt(0).toUpperCase() + periodRaw.slice(1);

  const kpi = (label: string, value: string, color?: string) => (
    <div className="card" style={{ padding: 14, background: "var(--bg)" }}>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "clamp(20px, 4vw, 24px)", fontWeight: 700, color: color ?? "var(--text-primary)" }}>{value}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 12px" }}>
        <h2 style={{ margin: 0, fontSize: "clamp(17px, 4.2vw, 19px)", fontWeight: 600 }}>{periodLabel}</h2>
        <Suspense fallback={null}>
          <MonthSelector currentMonth={referenceMonth} label="Mês" />
        </Suspense>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
        {kpi("Recebido no mês", eur(overview.revenueCurrentMonth))}
        {kpi("Por receber", eur(toReceive), toReceive > 0 ? "var(--danger)" : undefined)}
        {kpi("Despesas do mês", eur(overview.expensesCurrentMonth))}
        {kpi("Saldo do mês", eur(overview.balanceCurrentMonth), overview.balanceCurrentMonth < 0 ? "var(--danger)" : undefined)}
      </div>

      <section className="card" style={{ padding: "clamp(16px, 4vw, 22px)", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, flex: "1 1 200px" }}>
            Por receber <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>({items.length})</span>
          </h3>
          <FindStudentToPay referenceMonth={referenceMonth} />
        </div>
        <PorReceberList items={items} />
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
          «Recebido» regista o valor indicado com a forma de pagamento escolhida. Para outro valor, usa «Outro valor»; para vários meses de uma vez, «Vários meses».
        </p>
      </section>
    </div>
  );
}
