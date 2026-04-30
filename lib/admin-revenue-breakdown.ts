import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type RevenueRowCategory = "PLAN" | "PLAN_NONE" | "COURSE" | "EVENT" | "MANUAL";

export type RevenueBreakdownRow = {
  key: string;
  /** Nome do plano, curso, evento ou descrição manual; vazio se PLANO_NONE. */
  label: string;
  amount: number;
  category: RevenueRowCategory;
};

export type ManualRevenueRow = {
  id: string;
  amount: number;
  description: string;
  occurredOn: string;
};

export type RevenueBreakdownResult = {
  referenceMonth: string;
  rows: RevenueBreakdownRow[];
  total: number;
  manualLines: ManualRevenueRow[];
  error: string | null;
};

function monthDateBounds(yyyyMm: string): { start: string; end: string; startIso: string; endExclusiveIso: string } {
  const [y, m] = yyyyMm.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const start = `${yyyyMm}-01`;
  const end = `${yyyyMm}-${String(lastDay).padStart(2, "0")}`;
  const endNext = new Date(y, m, 1);
  return {
    start,
    end,
    startIso: `${start}T00:00:00.000Z`,
    endExclusiveIso: endNext.toISOString(),
  };
}

/**
 * Receitas do mês de referência, por origem: mensalidades (por plano), cursos, eventos, manuais.
 * Mensalidades: `Payment` Pago com `referenceMonth` = mês, atribuídas ao `Student.planId` no momento do cálculo.
 * Cursos: `CoursePurchase` Pago com `createdAt` no mês; soma por curso.
 * Eventos: inscrições `CONFIRMED` com `registered_at` no mês; `Event.price` por inscrição.
 */
export async function getRevenueBreakdown(
  supabase: SupabaseClient,
  referenceMonth: string
): Promise<RevenueBreakdownResult> {
  const empty: RevenueBreakdownResult = {
    referenceMonth,
    rows: [],
    total: 0,
    manualLines: [],
    error: null,
  };
  const { start, end, startIso, endExclusiveIso } = monthDateBounds(referenceMonth);

  const { data: payments, error: payErr } = await supabase
    .from("Payment")
    .select("id, studentId, amount, status")
    .eq("status", "PAID")
    .eq("referenceMonth", referenceMonth);

  if (payErr) {
    return { ...empty, error: payErr.message };
  }

  const studentIds = [...new Set((payments ?? []).map((p) => (p as { studentId: string }).studentId))];
  const { data: students, error: stErr } =
    studentIds.length > 0
      ? await supabase.from("Student").select("id, planId").in("id", studentIds)
      : { data: [] as { id: string; planId: string | null }[], error: null };

  if (stErr) {
    return { ...empty, error: stErr.message };
  }

  const planIdByStudent = new Map((students ?? []).map((s) => [s.id, s.planId as string | null]));
  const planIds = [...new Set((students ?? []).map((s) => s.planId).filter(Boolean))] as string[];
  const { data: plans } =
    planIds.length > 0
      ? await supabase.from("Plan").select("id, name").in("id", planIds)
      : { data: [] as { id: string; name: string }[] };

  const planNameById = new Map((plans ?? []).map((p) => [p.id, p.name]));

  const byPlan = new Map<string, number>();
  let noPlan = 0;
  for (const p of payments ?? []) {
    const row = p as { studentId: string; amount: string | number };
    const amount = Number(row.amount);
    const planId = planIdByStudent.get(row.studentId) ?? null;
    if (!planId) {
      noPlan += amount;
    } else {
      byPlan.set(planId, (byPlan.get(planId) ?? 0) + amount);
    }
  }

  const { data: coursePurchases, error: cpErr } = await supabase
    .from("CoursePurchase")
    .select("id, courseId, amount, status, createdAt")
    .eq("status", "PAID")
    .gte("createdAt", startIso)
    .lt("createdAt", endExclusiveIso);

  if (cpErr) {
    return { ...empty, error: cpErr.message };
  }

  const courseIds = [...new Set((coursePurchases ?? []).map((c) => (c as { courseId: string }).courseId))];
  const { data: courseRows } =
    courseIds.length > 0
      ? await supabase.from("Course").select("id, name").in("id", courseIds)
      : { data: [] as { id: string; name: string }[] };

  const courseNameById = new Map((courseRows ?? []).map((c) => [c.id, c.name]));
  const byCourse = new Map<string, number>();
  for (const c of coursePurchases ?? []) {
    const row = c as { courseId: string; amount: string | number };
    const amount = Number(row.amount);
    byCourse.set(row.courseId, (byCourse.get(row.courseId) ?? 0) + amount);
  }

  const { data: eventRegs, error: erErr } = await supabase
    .from("EventRegistration")
    .select("id, eventId, status, registered_at")
    .eq("status", "CONFIRMED")
    .gte("registered_at", startIso)
    .lt("registered_at", endExclusiveIso);

  if (erErr) {
    return { ...empty, error: erErr.message };
  }

  const eventIds = [...new Set((eventRegs ?? []).map((e) => (e as { eventId: string }).eventId))];
  const { data: eventRows } =
    eventIds.length > 0
      ? await supabase.from("Event").select("id, name, price").in("id", eventIds)
      : { data: [] as { id: string; name: string; price: string | number }[] };

  const eventMetaById = new Map(
    (eventRows ?? []).map((e) => [e.id, { name: e.name, price: Number(e.price) }])
  );

  const byEvent = new Map<string, number>();
  for (const e of eventRegs ?? []) {
    const row = e as { eventId: string };
    const meta = eventMetaById.get(row.eventId);
    const price = meta?.price ?? 0;
    if (!meta) continue;
    byEvent.set(row.eventId, (byEvent.get(row.eventId) ?? 0) + price);
  }

  const { data: manualRows, error: manErr } = await supabase
    .from("FinancialRevenue")
    .select("id, amount, description, occurredOn")
    .gte("occurredOn", start)
    .lte("occurredOn", end)
    .order("occurredOn", { ascending: false })
    .order("createdAt", { ascending: false });

  if (manErr) {
    if (/relation|does not exist|FinancialRevenue/i.test(manErr.message)) {
      return { ...empty, error: manErr.message };
    }
    return { ...empty, error: manErr.message };
  }

  const manualLines: ManualRevenueRow[] = (manualRows ?? []).map((r) => {
    const x = r as { id: string; amount: string | number; description: string; occurredOn: string };
    return {
      id: x.id,
      amount: Number(x.amount),
      description: x.description,
      occurredOn: typeof x.occurredOn === "string" ? x.occurredOn.slice(0, 10) : String(x.occurredOn).slice(0, 10),
    };
  });

  const rows: RevenueBreakdownRow[] = [];
  for (const planId of [...byPlan.keys()].sort((a, b) => (planNameById.get(a) ?? a).localeCompare(planNameById.get(b) ?? b, "pt"))) {
    const name = planNameById.get(planId) ?? planId;
    const amt = byPlan.get(planId) ?? 0;
    if (amt > 0) rows.push({ key: `plan:${planId}`, label: name, amount: amt, category: "PLAN" });
  }
  if (noPlan > 0) {
    rows.push({ key: "plan:none", label: "", amount: noPlan, category: "PLAN_NONE" });
  }
  for (const courseId of [...byCourse.keys()].sort(
    (a, b) => (courseNameById.get(a) ?? a).localeCompare(courseNameById.get(b) ?? b, "pt")
  )) {
    const name = courseNameById.get(courseId) ?? courseId;
    const amt = byCourse.get(courseId) ?? 0;
    if (amt > 0) rows.push({ key: `course:${courseId}`, label: name, amount: amt, category: "COURSE" });
  }
  for (const eventId of [...byEvent.keys()].sort(
    (a, b) => (eventMetaById.get(a)?.name ?? a).localeCompare(eventMetaById.get(b)?.name ?? b, "pt")
  )) {
    const name = eventMetaById.get(eventId)?.name ?? eventId;
    const amt = byEvent.get(eventId) ?? 0;
    if (amt > 0) rows.push({ key: `event:${eventId}`, label: name, amount: amt, category: "EVENT" });
  }
  for (const m of manualLines) {
    rows.push({ key: `manual:${m.id}`, label: m.description, amount: m.amount, category: "MANUAL" });
  }

  let total = 0;
  for (const r of rows) total += r.amount;

  return { referenceMonth, rows, total, manualLines, error: null };
}
