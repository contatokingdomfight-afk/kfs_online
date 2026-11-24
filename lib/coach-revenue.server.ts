import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeCoachMonth,
  round2,
  type CoachMonthSummary,
  type CoachShareMode,
  type ModalityScope,
  type PlanRule,
  type TuitionCharge,
} from "@/lib/coach-revenue";

type PlanRow = { id: string; name: string; priceMonthly: number | string; modalityScope: string | null; coachShareMode: string | null; coachShareValue: number | string | null };

function toPlanRule(p: PlanRow): PlanRule {
  const scope = (["NONE", "SINGLE", "DUAL", "ALL"].includes(p.modalityScope ?? "") ? p.modalityScope : "SINGLE") as ModalityScope;
  const mode = (["NONE", "PER_MODALITY", "SPLIT_POOL", "FIXED"].includes(p.coachShareMode ?? "") ? p.coachShareMode : "NONE") as CoachShareMode;
  return {
    id: p.id,
    name: p.name,
    price: Number(p.priceMonthly ?? 0),
    scope,
    mode,
    value: p.coachShareValue == null ? null : Number(p.coachShareValue),
  };
}

/** Limites do mês (UTC; a diferença para Lisboa é no máximo 1 h na passagem do mês). */
export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const end = new Date(Date.UTC(y, m, 1)).toISOString();
  return { start, end };
}

/** Mensalidades do mês de uma escola, já com o plano de cada aluno (famílias expandidas por membro). */
export async function loadSchoolTuitionCharges(db: SupabaseClient, schoolId: string, month: string): Promise<TuitionCharge[]> {
  const { start, end } = monthRange(month);
  const [{ data: paid }, { data: unpaid }] = await Promise.all([
    db
      .from("Payment")
      .select("id, studentId, status, paidAt, amount")
      .eq("schoolId", schoolId)
      .eq("paymentType", "TUITION")
      .eq("status", "PAID")
      .gte("paidAt", start)
      .lt("paidAt", end),
    db
      .from("Payment")
      .select("id, studentId, status, paidAt, amount")
      .eq("schoolId", schoolId)
      .eq("paymentType", "TUITION")
      .eq("referenceMonth", month)
      .neq("status", "PAID"),
  ]);
  // Mensalidade a 0 € (bolsa de 100%, família isenta): ninguém recebe.
  const payments = ([...(paid ?? []), ...(unpaid ?? [])] as { id: string; studentId: string; status: string; paidAt: string | null; amount: number | string | null }[]).filter(
    (p) => Number(p.amount ?? 0) > 0
  );
  if (payments.length === 0) return [];

  // Famílias: o titular paga pelo grupo; cada membro conta com o seu plano de referência.
  const payerIds = [...new Set(payments.map((p) => p.studentId))];
  const { data: groups } = await db.from("FamilyGroup").select("id, billingStudentId").in("billingStudentId", payerIds).eq("isActive", true);
  const groupIds = (groups ?? []).map((g) => g.id as string);
  const { data: members } = groupIds.length
    ? await db.from("FamilyGroupMember").select("familyGroupId, studentId, referencePlanId").in("familyGroupId", groupIds)
    : { data: [] as { familyGroupId: string; studentId: string; referencePlanId: string | null }[] };
  const groupByPayer = new Map((groups ?? []).map((g) => [g.billingStudentId as string, g.id as string]));
  const membersByGroup = new Map<string, { studentId: string; referencePlanId: string | null }[]>();
  for (const m of (members ?? []) as { familyGroupId: string; studentId: string; referencePlanId: string | null }[]) {
    const list = membersByGroup.get(m.familyGroupId) ?? [];
    list.push(m);
    membersByGroup.set(m.familyGroupId, list);
  }

  const studentIds = new Set(payerIds);
  for (const list of membersByGroup.values()) for (const m of list) studentIds.add(m.studentId);
  const { data: students } = await db
    .from("Student")
    .select("id, userId, planId, primaryModality, secondaryModality")
    .in("id", [...studentIds]);
  const studentById = new Map((students ?? []).map((s) => [s.id as string, s as { id: string; userId: string; planId: string | null; primaryModality: string | null; secondaryModality: string | null }]));

  const userIds = [...new Set((students ?? []).map((s) => s.userId as string).filter(Boolean))];
  const planIds = new Set<string>();
  for (const s of studentById.values()) if (s.planId) planIds.add(s.planId);
  for (const list of membersByGroup.values()) for (const m of list) if (m.referencePlanId) planIds.add(m.referencePlanId);
  const [{ data: users }, { data: plans }] = await Promise.all([
    userIds.length ? db.from("User").select("id, name, email").in("id", userIds) : Promise.resolve({ data: [] as { id: string; name: string | null; email: string }[] }),
    planIds.size
      ? db.from("Plan").select("id, name, priceMonthly, modalityScope, coachShareMode, coachShareValue").in("id", [...planIds])
      : Promise.resolve({ data: [] as PlanRow[] }),
  ]);
  const nameByUser = new Map((users ?? []).map((u) => [u.id as string, ((u.name as string | null)?.trim() || (u.email as string)) ?? "—"]));
  const planById = new Map(((plans ?? []) as PlanRow[]).map((p) => [p.id, toPlanRule(p)]));

  const charges: TuitionCharge[] = [];
  const push = (paymentId: string, studentId: string, planId: string | null | undefined, isPaid: boolean, paidAt: string | null) => {
    const s = studentById.get(studentId);
    const plan = planId ? planById.get(planId) : undefined;
    if (!s || !plan) return;
    charges.push({
      key: `${paymentId}:${studentId}`,
      studentId,
      studentName: nameByUser.get(s.userId) ?? "—",
      plan,
      primaryModality: s.primaryModality,
      secondaryModality: s.secondaryModality,
      paid: isPaid,
      paidAt,
    });
  };
  for (const p of payments) {
    const isPaid = p.status === "PAID";
    const groupId = groupByPayer.get(p.studentId);
    const groupMembers = groupId ? membersByGroup.get(groupId) : undefined;
    if (groupMembers && groupMembers.length > 0) {
      for (const m of groupMembers) push(p.id, m.studentId, m.referencePlanId, isPaid, p.paidAt);
    } else {
      push(p.id, p.studentId, studentById.get(p.studentId)?.planId, isPaid, p.paidAt);
    }
  }
  return charges;
}

/** Professores ativos da escola e as modalidades que lá dão. */
export async function loadSchoolCoachModalities(db: SupabaseClient, schoolId: string): Promise<Map<string, Set<string>>> {
  const { data: rows } = await db.from("CoachModality").select("coachId, modalityCode").eq("schoolId", schoolId);
  const coachIds = [...new Set((rows ?? []).map((r) => r.coachId as string))];
  if (coachIds.length === 0) return new Map();
  const { data: active } = await db.from("Coach").select("id, is_active").in("id", coachIds);
  const activeIds = new Set((active ?? []).filter((c) => c.is_active !== false).map((c) => c.id as string));
  const out = new Map<string, Set<string>>();
  for (const r of rows ?? []) {
    const id = r.coachId as string;
    if (!activeIds.has(id)) continue;
    const set = out.get(id) ?? new Set<string>();
    set.add(r.modalityCode as string);
    out.set(id, set);
  }
  return out;
}

/** Resumo do mês de todos os professores de uma escola. */
export async function loadSchoolCoachMonth(db: SupabaseClient, schoolId: string, month: string): Promise<Map<string, CoachMonthSummary>> {
  const [charges, coachModalities] = await Promise.all([
    loadSchoolTuitionCharges(db, schoolId, month),
    loadSchoolCoachModalities(db, schoolId),
  ]);
  return computeCoachMonth(charges, coachModalities);
}

export type CoachMonthReport = CoachMonthSummary & { schools: { schoolId: string; schoolName: string; received: number; pending: number }[] };

/** Mês de um professor em todas as escolas onde dá aulas. */
export async function loadCoachMonthReport(db: SupabaseClient, coachId: string, month: string): Promise<CoachMonthReport> {
  const { data: links } = await db.from("CoachSchool").select("schoolId").eq("coachId", coachId);
  const schoolIds = (links ?? []).map((l) => l.schoolId as string);
  const { data: schools } = schoolIds.length
    ? await db.from("School").select("id, name").in("id", schoolIds)
    : { data: [] as { id: string; name: string }[] };
  const nameById = new Map((schools ?? []).map((s) => [s.id as string, s.name as string]));

  const perSchool = await Promise.all(
    schoolIds.map(async (id) => ({ schoolId: id, summary: (await loadSchoolCoachMonth(db, id, month)).get(coachId) }))
  );
  const lines = perSchool.flatMap((p) => p.summary?.lines ?? []);
  const paid = new Set(lines.filter((l) => l.paid).map((l) => l.studentId));
  const received = round2(lines.filter((l) => l.paid).reduce((a, l) => a + l.amount, 0));
  const pending = round2(lines.filter((l) => !l.paid).reduce((a, l) => a + l.amount, 0));
  return {
    coachId,
    received,
    pending,
    forecast: round2(received + pending),
    studentCount: new Set(lines.map((l) => l.studentId)).size,
    paidStudentCount: paid.size,
    pendingStudentCount: new Set(lines.filter((l) => !l.paid && !paid.has(l.studentId)).map((l) => l.studentId)).size,
    lines,
    schools: perSchool.map((p) => ({
      schoolId: p.schoolId,
      schoolName: nameById.get(p.schoolId) ?? p.schoolId,
      received: p.summary?.received ?? 0,
      pending: p.summary?.pending ?? 0,
    })),
  };
}
