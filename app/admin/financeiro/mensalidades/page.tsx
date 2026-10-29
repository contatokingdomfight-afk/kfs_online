import { getSchoolScope, scopedSchoolIds, filterSchools } from "@/lib/school-scope";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { calendarDateLisbon } from "@/lib/lesson-check-in-window";
import { getRenewalsPending, type RenewalPending } from "@/lib/renewals";
import { fetchAllPages, inChunks } from "@/lib/graduation/queries";
import { monthLabelPt } from "@/lib/admin-student-ficha";
import { isTuitionOverdue } from "@/lib/admin-todo-rules";
import { buildDueSoonMessage, buildPaymentOverdueMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { MonthSelector } from "../_components/MonthSelector";
import { PorReceberList, type PorReceberItem } from "../_components/PorReceberList";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ month?: string }>;

const eur = (n: number) => n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

function prevMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 15));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

type LateTuition = { id: string; studentId: string; amount: number | string; referenceMonth: string | null; familyGroupId: string | null };

/**
 * Mensalidades em falta: quem ainda não pagou o mês (escolhido) e quem ficou por pagar o mês
 * anterior — incluindo quem nunca teve a mensalidade gerada — e atrasos mais antigos.
 */
export default async function AdminFinanceiroMensalidadesPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  const schoolIds = scopedSchoolIds(await getSchoolScope());
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const currentMonth = currentReferenceMonthLisbon(new Date());
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : currentMonth;
  const lastMonth = prevMonth(month);
  const today = calendarDateLisbon(new Date());

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const [thisPending, lastPending, lateTuition] = await Promise.all([
    getRenewalsPending(supabase, month, { schoolIds }),
    getRenewalsPending(supabase, lastMonth, { schoolIds }),
    fetchAllPages<LateTuition>((from, to) =>
      filterSchools(supabase
        .from("Payment")
        .select("id, studentId, amount, referenceMonth, familyGroupId"), schoolIds)
        .eq("status", "LATE")
        .eq("paymentType", "TUITION")
        .is("stripeInvoiceId", null)
        .order("id")
        .range(from, to)
    ),
  ]);

  const key = (studentId: string, ref: string | null) => `${studentId}|${String(ref ?? "").slice(0, 7)}`;
  const lateByKey = new Map(lateTuition.map((r) => [key(r.studentId, r.referenceMonth), r]));
  const used = new Set<string>();

  const fromRenewal = (r: RenewalPending, ref: string, group: PorReceberItem["group"]): PorReceberItem => {
    const late = lateByKey.get(key(r.studentId, ref));
    if (late) used.add(late.id);
    return {
      key: late ? late.id : `new-${r.studentId}-${ref}`,
      group,
      kind: "TUITION",
      orderId: null,
      studentId: r.studentId,
      name: r.studentName,
      phone: null,
      what: `${r.familyGroupId ? "Mensalidade família" : "Mensalidade"} · ${monthLabelPt(ref)}`,
      detail: r.planName,
      amount: late ? Number(late.amount) || 0 : r.priceMonthly,
      paymentId: late?.id ?? null,
      referenceMonth: ref,
    };
  };

  const items: PorReceberItem[] = [
    ...thisPending.map((r) => fromRenewal(r, month, "month")),
    ...lastPending.map((r) => fromRenewal(r, lastMonth, "older")),
  ];
  // Restantes registos em atraso (ex.: aluno que entretanto mudou ou ficou sem plano) e atrasos mais antigos.
  const extraIds = new Set<string>();
  for (const r of lateTuition) {
    const ref = r.referenceMonth ? String(r.referenceMonth).slice(0, 7) : null;
    if (used.has(r.id) || !ref || ref > month) continue;
    extraIds.add(r.id);
    items.push({
      key: r.id,
      group: ref === month ? "month" : ref === lastMonth ? "older" : "fees",
      kind: "TUITION",
      orderId: null,
      studentId: r.studentId,
      name: "",
      phone: null,
      what: `${r.familyGroupId ? "Mensalidade família" : "Mensalidade"} · ${monthLabelPt(ref)}`,
      detail: null,
      amount: Number(r.amount) || 0,
      paymentId: r.id,
      referenceMonth: ref,
    });
  }

  // Nomes, telefones e estado (atrasos antigos só de alunos ativos/inadimplentes).
  const studentIds = [...new Set(items.map((i) => i.studentId))];
  const [students, profiles] = await Promise.all([
    inChunks(studentIds, async (ids) => (await supabase.from("Student").select("id, userId, status").in("id", ids)).data ?? []),
    inChunks(studentIds, async (ids) => (await supabase.from("StudentProfile").select("studentId, phone").in("studentId", ids)).data ?? []),
  ]);
  const users = await inChunks([...new Set(students.map((s) => s.userId))], async (ids) => (await supabase.from("User").select("id, name, email").in("id", ids)).data ?? []);
  const userById = new Map(users.map((u) => [u.id, u]));
  const userOf = new Map(students.map((s) => [s.id, userById.get(s.userId)]));
  const statusOf = new Map(students.map((s) => [s.id, (s as { status?: string }).status ?? ""]));
  const phoneOf = new Map(profiles.map((p) => [p.studentId, (p as { phone?: string | null }).phone ?? null]));

  const list = items.filter((it) => !extraIds.has(it.key) || ["ATIVO", "INADIMPLENTE"].includes(statusOf.get(it.studentId) ?? ""));
  for (const it of list) {
    const u = userOf.get(it.studentId);
    if (!it.name) it.name = u?.name || u?.email || "—";
    it.phone = phoneOf.get(it.studentId) ?? null;
    const first = it.name.split(/\s+/)[0] ?? "";
    const overdue = it.referenceMonth ? isTuitionOverdue(today, it.referenceMonth) : true;
    it.reminderUrl = it.phone
      ? buildWhatsAppUrl(it.phone, overdue ? buildPaymentOverdueMessage(first) : buildDueSoonMessage(first, "no dia 8"))
      : null;
  }
  const order = { month: 0, older: 1, fees: 2, orders: 3 } as const;
  list.sort((a, b) => order[a.group] - order[b.group] || a.name.localeCompare(b.name, "pt", { sensitivity: "base" }));

  const sum = (g: PorReceberItem["group"]) => list.filter((i) => i.group === g);
  const thisRows = sum("month");
  const lastRows = sum("older");
  const oldRows = sum("fees");
  const total = (rows: PorReceberItem[]) => rows.reduce((a, r) => a + r.amount, 0);
  const thisDueNote = isTuitionOverdue(today, month) ? "prazo (dia 8) já passou" : "prazo até dia 8";

  const kpi = (label: string, rows: PorReceberItem[], note?: string, danger?: boolean) => (
    <div className="card" style={{ padding: 14, background: "var(--bg)" }}>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "clamp(20px, 4vw, 24px)", fontWeight: 700, color: danger && rows.length ? "var(--danger)" : "var(--text-primary)" }}>
        {rows.length} · {eur(total(rows))}
      </div>
      {note ? <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{note}</div> : null}
    </div>
  );

  // Pagamento automático (Subscrições Revolut): quantos pagadores e quantas cobranças falharam.
  const { data: autoPayRows, error: autoPayErr } = await filterSchools(supabase.from("AutoPay").select("state, amount"), schoolIds).in("state", ["ACTIVE", "OVERDUE"]);
  const autoActive = autoPayErr ? [] : ((autoPayRows ?? []) as { state: string; amount: number | string }[]).filter((r) => r.state === "ACTIVE");
  const autoOverdue = autoPayErr ? 0 : ((autoPayRows ?? []) as { state: string }[]).filter((r) => r.state === "OVERDUE").length;
  const autoMonthly = autoActive.reduce((t, r) => t + Number(r.amount), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {autoActive.length || autoOverdue ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", alignItems: "center", padding: "10px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-secondary)", fontSize: 13.5 }}>
          <strong>⚡ {autoActive.length} em pagamento automático</strong>
          <span style={{ color: "var(--text-secondary)" }}>{autoMonthly % 1 === 0 ? autoMonthly.toFixed(0) : autoMonthly.toFixed(2).replace(".", ",")} €/mês cobrados sozinhos</span>
          {autoOverdue ? <strong style={{ color: "var(--danger)" }}>{autoOverdue} cobrança{autoOverdue === 1 ? "" : "s"} falhada{autoOverdue === 1 ? "" : "s"}</strong> : null}
          <span style={{ color: "var(--text-secondary)", fontSize: 12.5 }}>Até ao dia de cobrança de cada um, a mensalidade aparece em falta aqui; depois fica paga sozinha.</span>
        </div>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 12px" }}>
        <h2 style={{ margin: 0, fontSize: "clamp(17px, 4.2vw, 19px)", fontWeight: 600 }}>Mensalidades em falta</h2>
        <Suspense fallback={null}>
          <MonthSelector currentMonth={month} label="Mês" />
        </Suspense>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
        {kpi(`Faltam em ${monthLabelPt(month)}`, thisRows, thisDueNote)}
        {kpi(`Em atraso de ${monthLabelPt(lastMonth)}`, lastRows, undefined, true)}
        {oldRows.length ? kpi("Atrasos mais antigos", oldRows, undefined, true) : null}
      </div>

      <section className="card" style={{ padding: "clamp(16px, 4vw, 22px)", display: "flex", flexDirection: "column", gap: 12 }}>
        <PorReceberList
          items={list}
          showFilters={false}
          emptyText={`Todas as mensalidades de ${monthLabelPt(month)} e ${monthLabelPt(lastMonth)} estão pagas.`}
          groupTitles={{
            month: `Faltam em ${monthLabelPt(month)}`,
            older: `Em atraso de ${monthLabelPt(lastMonth)}`,
            fees: "Atrasos mais antigos",
          }}
        />
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
          Inclui quem ainda não tem a mensalidade gerada. «Lembrar» abre o WhatsApp com a mensagem pronta; «Recebido» regista o pagamento desse mês.
        </p>
      </section>
    </div>
  );
}
