import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAdminUserIdSet } from "@/lib/admin-dashboard-exclude-admins";
import { getInsuranceSettings, isMembershipAgreementCurrent } from "@/lib/insurance-settings";
import { isEnrollmentFormCurrent } from "@/lib/enrollment-form";
import { calendarDateLisbon } from "@/lib/lesson-check-in-window";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { getPublicOrigin } from "@/lib/site-public-url";
import {
  buildBirthdayMessage,
  buildChoosePlanMessage,
  buildDocumentsPendingMessage,
  buildDueSoonMessage,
  buildFeesOverdueMessage,
  buildMissYouMessage,
  buildOrderPaymentMessage,
  buildPaymentOverdueMessage,
  buildTrialFollowUpMessage,
  buildTrialConfirmationMessage,
  buildWeekLimitMessage,
  buildWhatsAppUrl,
} from "@/lib/whatsapp";
import { computeTrainingLoad } from "@/lib/training-load";
import { loadTrainingSessions } from "@/lib/training-load.server";
import { SCHOOL_PAYMENT_DETAILS } from "@/lib/enrollment-form";
import { lineLabel, loadOrders, orderReference } from "@/lib/retail/orders";
import { KINGDOM_WEEK_MONTHLY_CAP } from "@/lib/drop-in-sessions-pricing";
import { loadModalityReadiness } from "@/lib/graduation/load-modality-readiness";
import {
  ADMIN_TODO_ORDER,
  addDaysYmd,
  birthdaySoon,
  churnRisk,
  isTuitionOverdue,
  noPlanLead,
  PERFORMANCE_STALE_DAYS,
  tuitionDueDate,
  tuitionDueSoon,
  daysBetween,
  physicalDue,
  todoDoneKey,
  TRIAL_CONFIRM_DAYS,
  trialToConvert,
  type AdminTodoKind,
} from "@/lib/admin-todo-rules";

export type AdminTodoTone = "red" | "amber" | "blue" | "green";

export type AdminTodoItem = {
  kind: AdminTodoKind;
  /** Chave «Feito» (ver todoDoneKey). */
  key: string;
  studentId: string | null;
  name: string;
  /** Detalhe curto por coluna (a ordem segue `columns` do alerta). */
  cells: { text: string; tone?: AdminTodoTone | "green" }[];
  /** Ordenação dentro do alerta (maior = mais urgente). */
  urgency: number;
  whatsappUrl: string | null;
  /** Ligação para ver/resolver na plataforma. */
  href: string | null;
  /** Já há um pedido de avaliação física pendente. */
  requested?: boolean;
  /** Encomendas da loja: id da encomenda (para «Recebido»). */
  orderId?: string;
  /** Experimentais por confirmar: id da inscrição e se o pedido já foi aceite. */
  trialId?: string;
  accepted?: boolean;
};

export type AdminTodoGroup = {
  kind: AdminTodoKind;
  tone: AdminTodoTone;
  title: string;
  /** Linha curta no painel (ex.: «120 € · o mais antigo: set.»). */
  summary: string;
  info: string;
  columns: string[];
  items: AdminTodoItem[];
};

const MONTHS_PT = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
const monthLabel = (ref: string) => {
  const [y, m] = ref.split("-").map(Number);
  return m ? `${MONTHS_PT[m - 1]} ${y}` : ref;
};
const shortDate = (ymd: string) => {
  const [, m, d] = ymd.split("-").map(Number);
  return `${d} ${MONTHS_PT[m - 1]}`;
};
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";
const dayWord = (n: number) => (n === 1 ? "dia" : "dias");

function chunks<T>(xs: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

/** Chaves já marcadas como «Feito». Tolera a tabela ainda não existir (antes da migração). */
export async function loadDoneKeys(supabase: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("AdminTodoDone")
    .select("kind, doneKey")
    .gte("doneAt", new Date(Date.now() - 120 * 86_400_000).toISOString());
  if (error) return new Set();
  return new Set(((data ?? []) as { kind: string; doneKey: string }[]).map((r) => `${r.kind}|${r.doneKey}`));
}

/** Os alertas do «A tratar hoje», já sem os itens marcados como «Feito». */
export async function loadAdminTodo(supabase: SupabaseClient, schoolId: string | null): Promise<AdminTodoGroup[]> {
  const today = calendarDateLisbon(new Date());
  const origin = getPublicOrigin();

  let studentsQuery = supabase.from("Student").select("id, userId, schoolId, status, planId, createdAt, primaryModality");
  if (schoolId) studentsQuery = studentsQuery.eq("schoolId", schoolId);
  const [{ data: rawStudents }, adminUserIds, done] = await Promise.all([studentsQuery, fetchAdminUserIdSet(supabase), loadDoneKeys(supabase)]);
  type S = { id: string; userId: string; schoolId: string; status: string; planId: string | null; createdAt: string; primaryModality: string | null };
  const students = ((rawStudents ?? []) as S[]).filter((s) => !adminUserIds.has(s.userId));
  const withPlan = students.filter((s) => s.planId && (s.status === "ATIVO" || s.status === "INADIMPLENTE"));
  const active = withPlan.filter((s) => s.status === "ATIVO");
  const ids = withPlan.map((s) => s.id);
  const noPlan = students.filter((s) => !s.planId && s.status === "ATIVO" && noPlanLead(today, s.createdAt));
  const profileIds = [...new Set([...students.filter((s) => s.status === "ATIVO" || s.status === "INADIMPLENTE").map((s) => s.id)])];

  const userIds = [...new Set(students.map((s) => s.userId))];
  const nameByUser = new Map<string, string>();
  const phoneByStudent = new Map<string, string | null>();
  const dobByStudent = new Map<string, string | null>();
  for (const part of chunks(userIds, 200)) {
    const { data } = await supabase.from("User").select("id, name, email").in("id", part);
    for (const u of (data ?? []) as { id: string; name: string | null; email: string | null }[]) nameByUser.set(u.id, u.name?.trim() || u.email || "—");
  }
  for (const part of chunks(profileIds, 200)) {
    const { data } = await supabase.from("StudentProfile").select("studentId, phone, dateOfBirth").in("studentId", part);
    for (const p of (data ?? []) as { studentId: string; phone: string | null; dateOfBirth: string | null }[]) {
      phoneByStudent.set(p.studentId, p.phone);
      dobByStudent.set(p.studentId, p.dateOfBirth);
    }
  }
  const nameOf = (s: S) => nameByUser.get(s.userId) ?? "—";
  const wa = (studentId: string, message: string) => {
    const phone = phoneByStudent.get(studentId);
    return phone ? buildWhatsAppUrl(phone, message) : null;
  };
  const notDone = (it: AdminTodoItem) => !done.has(`${it.kind}|${it.key}`);
  const planNames = new Map<string, string>();
  const planMonthlyCap = new Map<string, number>();
  {
    const { data } = await supabase.from("Plan").select("id, name, max_check_ins_per_month");
    for (const p of (data ?? []) as { id: string; name: string; max_check_ins_per_month: number | null }[]) {
      planNames.set(p.id, p.name);
      if (p.max_check_ins_per_month != null) planMonthlyCap.set(p.id, p.max_check_ins_per_month);
    }
  }

  // --- Pagamentos em atraso (mensalidades, como a inadimplência do painel) ---
  const late = new Map<string, { total: number; months: string[] }>();
  const dueSoon = new Map<string, { total: number; ref: string; daysLeft: number }>();
  for (const part of chunks(ids, 200)) {
    const { data } = await supabase.from("Payment").select("studentId, amount, referenceMonth").eq("status", "LATE").eq("paymentType", "TUITION").in("studentId", part);
    for (const p of (data ?? []) as { studentId: string; amount: number | string; referenceMonth: string | null }[]) {
      const ref = p.referenceMonth ? String(p.referenceMonth).slice(0, 7) : null;
      // A mensalidade é criada no dia 1 mas só vence no dia 8: antes disso não está em atraso.
      if (ref && !isTuitionOverdue(today, ref)) {
        const soon = tuitionDueSoon(today, ref);
        if (soon) {
          const d = dueSoon.get(p.studentId) ?? { total: 0, ref, daysLeft: soon.daysLeft };
          d.total += Number(p.amount) || 0;
          dueSoon.set(p.studentId, d);
        }
        continue;
      }
      const cur = late.get(p.studentId) ?? { total: 0, months: [] };
      cur.total += Number(p.amount) || 0;
      if (p.referenceMonth) cur.months.push(String(p.referenceMonth).slice(0, 7));
      late.set(p.studentId, cur);
    }
  }
  const pagamentos: AdminTodoItem[] = withPlan
    .filter((s) => late.has(s.id))
    .map((s) => {
      const l = late.get(s.id)!;
      const months = [...new Set(l.months)].sort();
      const oldest = months[0] ?? null;
      return {
        kind: "pagamentos" as const,
        key: todoDoneKey("pagamentos", { id: s.id, ref: oldest, today }),
        studentId: s.id,
        name: nameOf(s),
        cells: [
          { text: s.planId ? planNames.get(s.planId) ?? "—" : "—" },
          { text: `${l.total.toFixed(0)} €` },
          { text: oldest ? `desde ${monthLabel(oldest)}` : "—", tone: months.length > 1 ? ("red" as const) : ("amber" as const) },
          { text: `${months.length} ${months.length === 1 ? "mês" : "meses"}` },
        ],
        urgency: l.total,
        whatsappUrl: wa(s.id, buildPaymentOverdueMessage(firstName(nameOf(s)))),
        href: `/admin/alunos/${s.id}`,
      };
    })
    .filter(notDone)
    .sort((a, b) => b.urgency - a.urgency);
  const lateTotal = pagamentos.reduce((acc, it) => acc + (late.get(it.studentId!)?.total ?? 0), 0);

  // --- Seguros e matrículas em atraso (alunos não inativos; quem está a treinar primeiro) ---
  const feeStudents = students.filter((s) => s.status === "ATIVO" || s.status === "INADIMPLENTE");
  const fees = new Map<string, { total: number; insuranceYears: string[]; enrollment: boolean }>();
  for (const part of chunks(feeStudents.map((s) => s.id), 200)) {
    const { data } = await supabase
      .from("Payment")
      .select("studentId, amount, paymentType, referenceYear")
      .eq("status", "LATE")
      .in("paymentType", ["INSURANCE", "ENROLLMENT"])
      .in("studentId", part);
    for (const p of (data ?? []) as { studentId: string; amount: number | string; paymentType: string; referenceYear: string | number | null }[]) {
      const cur = fees.get(p.studentId) ?? { total: 0, insuranceYears: [], enrollment: false };
      cur.total += Number(p.amount) || 0;
      if (p.paymentType === "INSURANCE") cur.insuranceYears.push(p.referenceYear != null ? String(p.referenceYear) : "");
      else cur.enrollment = true;
      fees.set(p.studentId, cur);
    }
  }
  const feeTrainedRecently = new Set<string>();
  for (const part of chunks([...fees.keys()], 200)) {
    const { data } = await supabase
      .from("Attendance")
      .select("studentId")
      .in("studentId", part)
      .eq("status", "CONFIRMED")
      .gte("occurrenceDate", addDaysYmd(today, -30))
      .lte("occurrenceDate", today);
    for (const a of (data ?? []) as { studentId: string }[]) feeTrainedRecently.add(a.studentId);
  }
  const seguros: AdminTodoItem[] = feeStudents
    .filter((s) => fees.has(s.id))
    .map((s) => {
      const f = fees.get(s.id)!;
      const years = [...new Set(f.insuranceYears.filter(Boolean))].sort();
      const parts = [
        f.insuranceYears.length ? (years.length ? `Seguro ${years.join(", ")}` : "Seguro") : null,
        f.enrollment ? "Matrícula" : null,
      ].filter(Boolean) as string[];
      const trained = feeTrainedRecently.has(s.id);
      const what =
        f.insuranceYears.length && f.enrollment
          ? `o seguro desportivo e a matrícula (${f.total.toFixed(0)} €)`
          : f.insuranceYears.length
            ? `o seguro desportivo${years.length ? ` de ${years.join(" e ")}` : ""} (${f.total.toFixed(0)} €)`
            : `a matrícula (${f.total.toFixed(0)} €)`;
      return {
        kind: "seguros" as const,
        key: todoDoneKey("seguros", { id: s.id, ref: parts.join("+"), today }),
        studentId: s.id,
        name: nameOf(s),
        cells: [
          { text: parts.join(" + ") },
          { text: `${f.total.toFixed(0)} €` },
          { text: trained ? "está a treinar" : "sem treinos em 30 dias", tone: trained ? ("red" as const) : undefined },
        ],
        // Quem treinou nos últimos 30 dias vem primeiro; depois o valor.
        urgency: (trained ? 1_000_000 : 0) + f.total,
        whatsappUrl: wa(s.id, buildFeesOverdueMessage(firstName(nameOf(s)), what)),
        href: `/admin/alunos/${s.id}/plano-seguro`,
      };
    })
    .filter(notDone)
    .sort((a, b) => b.urgency - a.urgency);
  const feesTotal = seguros.reduce((acc, it) => acc + (fees.get(it.studentId!)?.total ?? 0), 0);
  const feesTraining = seguros.filter((it) => feeTrainedRecently.has(it.studentId!)).length;

  // --- Encomendas da loja por pagar ---
  const orderRows = (await loadOrders(supabase, { statuses: ["PENDING_PAYMENT"], limit: 100 })).filter(
    (o) => !schoolId || !o.schoolId || o.schoolId === schoolId
  );
  const orderStudentIds = [...new Set(orderRows.map((o) => o.studentId).filter((x): x is string => Boolean(x)))];
  const orderCustomer = new Map<string, { name: string; phone: string | null }>();
  if (orderStudentIds.length) {
    const { data: sRows } = await supabase.from("Student").select("id, userId").in("id", orderStudentIds);
    const uIds = [...new Set(((sRows ?? []) as { userId: string }[]).map((r) => r.userId))];
    const [{ data: uRows }, { data: pRows }] = await Promise.all([
      supabase.from("User").select("id, name, email").in("id", uIds),
      supabase.from("StudentProfile").select("studentId, phone").in("studentId", orderStudentIds),
    ]);
    const uName = new Map(((uRows ?? []) as { id: string; name: string | null; email: string | null }[]).map((u) => [u.id, u.name?.trim() || u.email || "—"]));
    const phoneOf = new Map(((pRows ?? []) as { studentId: string; phone: string | null }[]).map((r) => [r.studentId, r.phone]));
    for (const r of (sRows ?? []) as { id: string; userId: string }[]) {
      orderCustomer.set(r.id, { name: uName.get(r.userId) ?? "—", phone: phoneOf.get(r.id) ?? null });
    }
  }
  const encomendas: AdminTodoItem[] = orderRows
    .map((o) => {
      const c = o.studentId ? orderCustomer.get(o.studentId) : null;
      const name = c?.name ?? o.customerName ?? "Cliente";
      const phone = c?.phone ?? o.customerPhone ?? null;
      const days = Math.max(0, daysBetween(o.createdAt.slice(0, 10), today));
      const items = o.lines.map((l) => `${l.quantity}× ${l.productName} ${lineLabel(l)}`).join(", ");
      const total = `${o.totalAmount % 1 === 0 ? o.totalAmount.toFixed(0) : o.totalAmount.toFixed(2).replace(".", ",")} €`;
      const msg = buildOrderPaymentMessage(name, {
        reference: orderReference(o.number),
        descriptor: [...new Set(o.lines.map((l) => l.productName))].join(", "),
        total,
        items,
        iban: SCHOOL_PAYMENT_DETAILS.iban,
        recipient: SCHOOL_PAYMENT_DETAILS.recipientName,
        revolut: SCHOOL_PAYMENT_DETAILS.revolutTag,
      });
      return {
        kind: "encomendas" as const,
        key: todoDoneKey("encomendas", { id: o.id, ref: null, today }),
        studentId: o.studentId,
        name,
        cells: [
          { text: `${orderReference(o.number)} · ${items}` },
          { text: total },
          { text: days === 0 ? "hoje" : `há ${days} ${dayWord(days)}`, tone: days >= 7 ? ("red" as const) : undefined },
        ],
        urgency: days,
        whatsappUrl: phone ? buildWhatsAppUrl(phone, msg) : null,
        href: "/admin/loja/encomendas",
        orderId: o.id,
      };
    })
    .filter(notDone)
    .sort((a, b) => b.urgency - a.urgency);
  const ordersTotal = orderRows.reduce((acc, o) => (encomendas.some((e) => e.orderId === o.id) ? acc + o.totalAmount : acc), 0);

  // --- Em risco de sair: ativos com plano sem treinar há 7+ dias ---
  const lastTraining = new Map<string, string>();
  const recentCount = new Map<string, number>();
  const datesByStudent = new Map<string, string[]>();
  const since = addDaysYmd(today, -180);
  for (const part of chunks(active.map((s) => s.id), 100)) {
    for (let offset = 0; ; offset += 1000) {
      const { data } = await supabase
        .from("Attendance")
        .select("studentId, occurrenceDate")
        .in("studentId", part)
        .eq("status", "CONFIRMED")
        .gte("occurrenceDate", since)
        .lte("occurrenceDate", today)
        .range(offset, offset + 999);
      const batch = (data ?? []) as { studentId: string; occurrenceDate: string }[];
      for (const a of batch) {
        const list = datesByStudent.get(a.studentId) ?? [];
        list.push(String(a.occurrenceDate).slice(0, 10));
        datesByStudent.set(a.studentId, list);
      }
      if (batch.length < 1000) break;
    }
  }
  // Último treino e quantos treinos nas 8 semanas antes dele («antes treinava»).
  for (const [id, dates] of datesByStudent) {
    const last = dates.reduce((m, d) => (d > m ? d : m), "");
    lastTraining.set(id, last);
    recentCount.set(id, dates.filter((d) => daysBetween(d, last) <= 56).length);
  }
  const risco: AdminTodoItem[] = active
    .map((s) => {
      const last = lastTraining.get(s.id) ?? null;
      const r = churnRisk({ today, lastTraining: last, createdAt: s.createdAt });
      if (!r) return null;
      const perWeek = (recentCount.get(s.id) ?? 0) / 8;
      return {
        kind: "risco" as const,
        key: todoDoneKey("risco", { id: s.id, ref: last ?? "never", today }),
        studentId: s.id,
        name: nameOf(s),
        cells: [
          { text: s.primaryModality ? MODALITY_LABELS[s.primaryModality] ?? s.primaryModality : "—" },
          {
            // Só lemos 6 meses de presenças: sem treinos nesse período e conta mais antiga = «há mais de 6 meses».
            text: r.neverTrained ? (r.daysSince > 180 ? "há mais de 6 meses" : "nunca treinou") : `há ${r.daysSince} ${dayWord(r.daysSince)}`,
            tone: r.daysSince >= 21 ? ("red" as const) : ("amber" as const),
          },
          { text: r.neverTrained ? "—" : perWeek >= 0.5 ? `${perWeek.toFixed(1).replace(".", ",")}× por semana` : "pouco frequente" },
          { text: s.planId ? planNames.get(s.planId) ?? "—" : "—" },
        ],
        urgency: r.daysSince,
        whatsappUrl: wa(s.id, buildMissYouMessage(firstName(nameOf(s)))),
        href: `/admin/alunos/${s.id}`,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .filter(notDone)
    .sort((a, b) => b.urgency - a.urgency);

  // --- Carga de treino alta (> 2× o normal; a zona «alta» do aluno continua em 1,5×, aqui a régua é mais alta para não alertar por treinos técnicos) ---
  const trainedIds = active.filter((s) => (lastTraining.get(s.id) ?? "") >= addDaysYmd(today, -7)).map((s) => s.id);
  const sessions = await loadTrainingSessions(supabase, trainedIds, today);
  const carga: AdminTodoItem[] = active
    .filter((s) => trainedIds.includes(s.id))
    .map((s) => ({ s, load: computeTrainingLoad(sessions.get(s.id) ?? [], today) }))
    .filter(({ load }) => load.ratio != null && load.ratio > 2)
    .map(({ s, load }) => ({
      kind: "carga" as const,
      key: todoDoneKey("carga", { id: s.id, today }),
      studentId: s.id,
      name: nameOf(s),
      cells: [
        { text: s.primaryModality ? MODALITY_LABELS[s.primaryModality] ?? s.primaryModality : "—" },
        { text: `${load.ratio!.toFixed(2).replace(".", ",")}×`, tone: "red" as const },
        { text: `${load.sessions7d} treinos em 7 dias` },
      ],
      urgency: load.ratio!,
      whatsappUrl: null,
      href: `/coach/carga?turma=todas&aluno=${s.id}`,
    }))
    .filter(notDone)
    .sort((a, b) => b.urgency - a.urgency);

  // --- Adesões por concluir (com plano, documentos em falta) ---
  const settings = await getInsuranceSettings(supabase);
  const docs = new Map<string, { form: boolean; agreement: boolean; waiver: boolean }>();
  for (const part of chunks(ids, 200)) {
    const [{ data: waivers }, { data: agreements }, { data: forms }] = await Promise.all([
      supabase.from("StudentWaiver").select("studentId, waiverSigned").in("studentId", part),
      supabase.from("StudentMembershipAgreement").select("studentId, agreementSigned, agreementVersion").in("studentId", part),
      supabase.from("StudentEnrollmentForm").select("studentId, formCompleted, formVersion").in("studentId", part),
    ]);
    const w = new Map(((waivers ?? []) as { studentId: string; waiverSigned: boolean }[]).map((r) => [r.studentId, Boolean(r.waiverSigned)]));
    const a = new Map(((agreements ?? []) as { studentId: string; agreementSigned: boolean; agreementVersion: string | null }[]).map((r) => [r.studentId, r]));
    const f = new Map(((forms ?? []) as { studentId: string; formCompleted: boolean; formVersion: string | null }[]).map((r) => [r.studentId, r]));
    for (const id of part) {
      docs.set(id, {
        form: isEnrollmentFormCurrent(f.get(id) ?? null, settings.enrollmentFormVersion),
        agreement: isMembershipAgreementCurrent(a.get(id) ?? null, settings.membershipAgreementVersion),
        waiver: w.get(id) ?? false,
      });
    }
  }
  const adesao: AdminTodoItem[] = withPlan
    .map((s) => {
      const d = docs.get(s.id);
      if (!d || (d.form && d.agreement && d.waiver)) return null;
      const missing = [!d.form && "ficha de inscrição", !d.agreement && "contrato", !d.waiver && "termo"].filter(Boolean) as string[];
      const age = daysBetween(s.createdAt.slice(0, 10), today);
      return {
        kind: "adesao" as const,
        key: todoDoneKey("adesao", { id: s.id, today }),
        studentId: s.id,
        name: nameOf(s),
        cells: [
          { text: s.planId ? planNames.get(s.planId) ?? "—" : "—" },
          { text: missing.join(", "), tone: "amber" as const },
          { text: `há ${age} ${dayWord(age)}` },
        ],
        urgency: age,
        whatsappUrl: wa(s.id, buildDocumentsPendingMessage(firstName(nameOf(s)), `${origin}/adesao`)),
        href: `/admin/alunos/${s.id}`,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .filter(notDone)
    .sort((a, b) => b.urgency - a.urgency);

  // --- Avaliações físicas a renovar ---
  const latestAssessment = new Map<string, { assessedAt: string; nextDueAt: string | null }>();
  const pendingRequest = new Set<string>();
  for (const part of chunks(active.map((s) => s.id), 200)) {
    const [{ data: rows }, { data: reqs }] = await Promise.all([
      supabase.from("StudentPhysicalAssessment").select("studentId, assessedAt, nextDueAt").eq("status", "SUBMITTED").in("studentId", part).order("assessedAt", { ascending: false }),
      supabase.from("PhysicalAssessmentRequest").select("studentId").eq("status", "PENDING").in("studentId", part),
    ]);
    for (const r of (rows ?? []) as { studentId: string; assessedAt: string; nextDueAt: string | null }[]) {
      if (!latestAssessment.has(r.studentId)) latestAssessment.set(r.studentId, r);
    }
    for (const r of (reqs ?? []) as { studentId: string }[]) pendingRequest.add(r.studentId);
  }
  const fisicas: AdminTodoItem[] = active
    .map((s) => {
      const last = latestAssessment.get(s.id);
      const due = last ? physicalDue(today, last.nextDueAt) : null;
      if (!last || !due) return null;
      const dueYmd = String(last.nextDueAt).slice(0, 10);
      return {
        kind: "fisicas" as const,
        key: todoDoneKey("fisicas", { id: s.id, ref: dueYmd, today }),
        studentId: s.id,
        name: nameOf(s),
        cells: [
          { text: shortDate(String(last.assessedAt).slice(0, 10)) },
          { text: due.daysLeft < 0 ? `venceu a ${shortDate(dueYmd)}` : `vence a ${shortDate(dueYmd)}`, tone: due.daysLeft < 0 ? ("red" as const) : due.daysLeft <= 7 ? ("amber" as const) : undefined },
          { text: pendingRequest.has(s.id) ? "pedido feito" : "—", tone: pendingRequest.has(s.id) ? ("green" as const) : undefined },
        ],
        urgency: -due.daysLeft,
        whatsappUrl: null,
        href: `/admin/alunos/${s.id}/avaliacao-fisica`,
        requested: pendingRequest.has(s.id),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .filter(notDone)
    .sort((a, b) => b.urgency - a.urgency);

  // --- Performance por avaliar: a treinar nos últimos 30 dias e sem AthleteEvaluation há 30+ dias (ou nunca) ---
  const staleSince = addDaysYmd(today, -PERFORMANCE_STALE_DAYS);
  const evalCandidates = active.filter((s) => (lastTraining.get(s.id) ?? "") >= staleSince);
  const athleteByStudent = new Map<string, string>();
  const lastEvalByAthlete = new Map<string, string>();
  for (const part of chunks(evalCandidates.map((s) => s.id), 200)) {
    const { data } = await supabase.from("Athlete").select("id, studentId").in("studentId", part);
    for (const a of (data ?? []) as { id: string; studentId: string }[]) athleteByStudent.set(a.studentId, a.id);
  }
  for (const part of chunks([...athleteByStudent.values()], 100)) {
    for (let offset = 0; ; offset += 1000) {
      const { data } = await supabase
        .from("AthleteEvaluation")
        .select("athleteId, created_at")
        .in("athleteId", part)
        .gte("created_at", `${since}T00:00:00Z`)
        .range(offset, offset + 999);
      const batch = (data ?? []) as { athleteId: string; created_at: string }[];
      for (const e of batch) {
        const d = String(e.created_at).slice(0, 10);
        if (d > (lastEvalByAthlete.get(e.athleteId) ?? "")) lastEvalByAthlete.set(e.athleteId, d);
      }
      if (batch.length < 1000) break;
    }
  }
  const performance: AdminTodoItem[] = evalCandidates
    .map((s) => {
      const athleteId = athleteByStudent.get(s.id);
      const lastEval = athleteId ? lastEvalByAthlete.get(athleteId) ?? null : null;
      const days = lastEval ? daysBetween(lastEval, today) : null;
      if (days != null && days < PERFORMANCE_STALE_DAYS) return null;
      const lastTrain = lastTraining.get(s.id)!;
      const trainDays = daysBetween(lastTrain, today);
      return {
        kind: "performance" as const,
        key: todoDoneKey("performance", { id: s.id, today }),
        studentId: s.id,
        name: nameOf(s),
        cells: [
          { text: s.primaryModality ? MODALITY_LABELS[s.primaryModality] ?? s.primaryModality : "—" },
          // Só lemos 6 meses de avaliações: sem nenhuma nesse período = «nunca / há mais de 6 meses».
          { text: days == null ? "nunca (ou há mais de 6 meses)" : `há ${days} ${dayWord(days)}`, tone: days == null || days >= 60 ? ("red" as const) : ("amber" as const) },
          { text: trainDays === 0 ? "hoje" : `há ${trainDays} ${dayWord(trainDays)}` },
        ],
        urgency: days ?? 10_000,
        whatsappUrl: null,
        href: `/coach/alunos/${s.id}`,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .filter(notDone)
    .sort((a, b) => b.urgency - a.urgency);

  // --- Experimentais por confirmar (hoje e próximos dias) ---
  const { data: upcomingTrials } = await supabase
    .from("TrialClass")
    .select("id, name, contact, modality, lessonDate, lessonId, acceptedAt, convertedToStudent")
    .gte("lessonDate", today)
    .lte("lessonDate", addDaysYmd(today, TRIAL_CONFIRM_DAYS));
  const upcoming = ((upcomingTrials ?? []) as { id: string; name: string; contact: string | null; modality: string | null; lessonDate: string | null; lessonId: string | null; acceptedAt: string | null; convertedToStudent: boolean | null }[]).filter(
    (t) => !t.convertedToStudent && t.lessonDate
  );
  const trialLessonIds = [...new Set(upcoming.map((t) => t.lessonId).filter((x): x is string => Boolean(x)))];
  const { data: trialLessons } = trialLessonIds.length
    ? await supabase.from("Lesson").select("id, startTime").in("id", trialLessonIds)
    : { data: [] as { id: string; startTime: string | null }[] };
  const trialTime = new Map(((trialLessons ?? []) as { id: string; startTime: string | null }[]).map((l) => [l.id, (l.startTime ?? "").slice(0, 5)]));
  const confirmar: AdminTodoItem[] = upcoming
    .map((t) => {
      const date = (t.lessonDate as string).slice(0, 10);
      const daysAhead = daysBetween(today, date);
      const time = t.lessonId ? trialTime.get(t.lessonId) ?? "" : "";
      const modality = t.modality ? MODALITY_LABELS[t.modality] ?? t.modality : "a aula";
      const dayLabel =
        daysAhead === 0
          ? "hoje"
          : daysAhead === 1
            ? "amanhã"
            : new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Lisbon" });
      const accepted = Boolean(t.acceptedAt);
      return {
        kind: "confirmar" as const,
        key: todoDoneKey("confirmar", { id: t.id, ref: date, today }),
        studentId: null,
        name: t.name || "—",
        cells: [
          { text: modality },
          { text: time ? `${dayLabel} · ${time}` : dayLabel, tone: daysAhead === 0 ? ("red" as const) : undefined },
          { text: accepted ? "Aceite" : "Pedido por aceitar", tone: accepted ? ("green" as const) : ("amber" as const) },
          { text: t.contact || "sem contacto", tone: t.contact ? undefined : ("amber" as const) },
        ],
        urgency: TRIAL_CONFIRM_DAYS - daysAhead,
        whatsappUrl: t.contact ? buildWhatsAppUrl(t.contact, buildTrialConfirmationMessage(t.name || "", modality, time || "à hora marcada", dayLabel === "amanhã" ? "amanhã" : dayLabel)) : null,
        href: "/admin/experimentais",
        trialId: t.id,
        accepted,
      };
    })
    .filter(notDone)
    .sort((a, b) => b.urgency - a.urgency);

  // --- Experimentais por converter ---
  const { data: trials } = await supabase
    .from("TrialClass")
    .select("id, name, contact, modality, lessonDate, convertedToStudent")
    .gte("lessonDate", addDaysYmd(today, -14))
    .lte("lessonDate", today);
  const experimentais: AdminTodoItem[] = ((trials ?? []) as { id: string; name: string; contact: string | null; modality: string | null; lessonDate: string | null; convertedToStudent: boolean | null }[])
    .map((t) => {
      const r = trialToConvert(today, t.lessonDate, Boolean(t.convertedToStudent));
      if (!r) return null;
      const modality = t.modality ? MODALITY_LABELS[t.modality] ?? t.modality : "a aula";
      return {
        kind: "experimentais" as const,
        key: todoDoneKey("experimentais", { id: t.id, today }),
        studentId: null,
        name: t.name || "—",
        cells: [
          { text: modality },
          { text: r.daysAgo === 0 ? "hoje" : `há ${r.daysAgo} ${dayWord(r.daysAgo)}` },
          { text: t.contact || "sem contacto", tone: t.contact ? undefined : ("amber" as const) },
        ],
        urgency: r.daysAgo,
        whatsappUrl: t.contact ? buildWhatsAppUrl(t.contact, buildTrialFollowUpMessage(t.name || "", modality, `${origin}/planos`)) : null,
        href: "/admin/experimentais",
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .filter(notDone)
    .sort((a, b) => b.urgency - a.urgency);

  // --- Mensalidades a vencer (nos 3 dias antes do dia 8) ---
  const vencer: AdminTodoItem[] = withPlan
    .filter((s) => dueSoon.has(s.id))
    .map((s) => {
      const d = dueSoon.get(s.id)!;
      const dueLabel = d.daysLeft === 0 ? "hoje" : d.daysLeft === 1 ? "amanhã" : `a ${shortDate(tuitionDueDate(d.ref))}`;
      return {
        kind: "vencer" as const,
        key: todoDoneKey("vencer", { id: s.id, ref: d.ref, today }),
        studentId: s.id,
        name: nameOf(s),
        cells: [
          { text: s.planId ? planNames.get(s.planId) ?? "—" : "—" },
          { text: `${d.total.toFixed(0)} €` },
          { text: `vence ${dueLabel}`, tone: d.daysLeft <= 1 ? ("amber" as const) : undefined },
        ],
        urgency: -d.daysLeft,
        whatsappUrl: wa(s.id, buildDueSoonMessage(firstName(nameOf(s)), dueLabel)),
        href: `/admin/alunos/${s.id}`,
      };
    })
    .filter(notDone)
    .sort((a, b) => b.urgency - a.urgency);

  // --- Kingdom Week (5 aulas/mês): na 4.ª aula (ou já esgotado) avisar por WhatsApp ---
  const weekStudents = active.filter((s) => s.planId && planMonthlyCap.get(s.planId) === KINGDOM_WEEK_MONTHLY_CAP);
  const month = today.slice(0, 7);
  const weekUsed = new Map<string, number>();
  const weekExtra = new Map<string, number>();
  for (const part of chunks(weekStudents.map((s) => s.id), 100)) {
    const [{ data: att }, { data: extra }] = await Promise.all([
      supabase.from("Attendance").select("studentId").in("studentId", part).eq("status", "CONFIRMED").gte("occurrenceDate", `${month}-01`).lte("occurrenceDate", today),
      supabase.from("StudentExtraSessions").select("studentId, quantity").in("studentId", part).eq("referenceMonth", month),
    ]);
    for (const a of (att ?? []) as { studentId: string }[]) weekUsed.set(a.studentId, (weekUsed.get(a.studentId) ?? 0) + 1);
    for (const e of (extra ?? []) as { studentId: string; quantity: number | null }[]) weekExtra.set(e.studentId, (weekExtra.get(e.studentId) ?? 0) + (e.quantity ?? 0));
  }
  const semana: AdminTodoItem[] = weekStudents
    .map((s) => {
      const used = weekUsed.get(s.id) ?? 0;
      const limit = KINGDOM_WEEK_MONTHLY_CAP + (weekExtra.get(s.id) ?? 0);
      if (used < limit - 1) return null;
      const exhausted = used >= limit;
      return {
        kind: "semana" as const,
        key: todoDoneKey("semana", { id: s.id, ref: `${month}:${used}`, today }),
        studentId: s.id,
        name: nameOf(s),
        cells: [
          { text: `${used} de ${limit} aulas`, tone: exhausted ? ("red" as const) : ("amber" as const) },
          { text: exhausted ? "esgotado" : `falta ${limit - used}` },
          { text: monthLabel(month) },
        ],
        urgency: used,
        whatsappUrl: wa(s.id, buildWeekLimitMessage(firstName(nameOf(s)), used, limit)),
        href: `/admin/alunos/${s.id}`,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .filter(notDone)
    .sort((a, b) => b.urgency - a.urgency);

  // --- Registados sem plano (contas dos últimos 60 dias) ---
  const semplano: AdminTodoItem[] = noPlan
    .map((s) => {
      const lead = noPlanLead(today, s.createdAt)!;
      return {
        kind: "semplano" as const,
        key: todoDoneKey("semplano", { id: s.id, today }),
        studentId: s.id,
        name: nameOf(s),
        cells: [
          { text: s.primaryModality ? MODALITY_LABELS[s.primaryModality] ?? s.primaryModality : "—" },
          { text: `há ${lead.days} ${dayWord(lead.days)}`, tone: lead.days >= 7 ? ("amber" as const) : undefined },
          { text: phoneByStudent.get(s.id) ? "com telefone" : "sem telefone", tone: phoneByStudent.get(s.id) ? undefined : ("amber" as const) },
        ],
        urgency: -lead.days,
        whatsappUrl: wa(s.id, buildChoosePlanMessage(firstName(nameOf(s)), `${origin}/escolher-plano`)),
        href: `/admin/alunos/${s.id}`,
      };
    })
    .filter(notDone)
    .sort((a, b) => b.urgency - a.urgency);

  // --- Aptos para exame (modalidades com graduação publicada, sem convocatória ativa) ---
  const inScope = new Set(active.map((s) => s.id));
  const { data: publishedTemplates } = await supabase.from("GraduationTemplate").select("modalityCode").eq("isPublished", true);
  const exame: AdminTodoItem[] = [];
  for (const t of (publishedTemplates ?? []) as { modalityCode: string }[]) {
    const readiness = await loadModalityReadiness(supabase, t.modalityCode).catch(() => null);
    for (const r of readiness?.students ?? []) {
      if (!inScope.has(r.studentId) || !r.progress.isReadyForExam || r.activeConvocation || !r.progress.next) continue;
      const item: AdminTodoItem = {
        kind: "exame",
        key: todoDoneKey("exame", { id: r.studentId, ref: `${t.modalityCode}:${r.progress.next.id}`, today }),
        studentId: r.studentId,
        name: r.name,
        cells: [
          { text: MODALITY_LABELS[t.modalityCode] ?? t.modalityCode },
          { text: r.progress.current?.name ?? "sem graduação" },
          { text: r.progress.next.name, tone: "green" },
        ],
        urgency: r.progress.qualifyingMonthsSinceLastGrade,
        whatsappUrl: null,
        href: "/coach/graduacao",
      };
      if (notDone(item)) exame.push(item);
    }
  }
  exame.sort((a, b) => b.urgency - a.urgency);

  // --- Aniversários (hoje e amanhã) ---
  const aniversarios: AdminTodoItem[] = students
    .filter((s) => s.status === "ATIVO" || s.status === "INADIMPLENTE")
    .map((s) => {
      const b = birthdaySoon(today, dobByStudent.get(s.id) ?? null);
      if (!b) return null;
      return {
        kind: "aniversarios" as const,
        key: todoDoneKey("aniversarios", { id: s.id, today }),
        studentId: s.id,
        name: nameOf(s),
        cells: [
          { text: b.inDays === 0 ? "hoje" : "amanhã", tone: b.inDays === 0 ? ("green" as const) : undefined },
          { text: b.age > 0 && b.age < 110 ? `faz ${b.age} anos` : "—" },
        ],
        urgency: -b.inDays,
        whatsappUrl: wa(s.id, buildBirthdayMessage(firstName(nameOf(s)))),
        href: `/admin/alunos/${s.id}`,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .filter(notDone)
    .sort((a, b) => b.urgency - a.urgency);

  const groups: Record<AdminTodoKind, AdminTodoGroup> = {
    pagamentos: {
      kind: "pagamentos", tone: "red", title: "Pagamentos em atraso", items: pagamentos,
      summary: pagamentos.length ? `${lateTotal.toFixed(0)} € em mensalidades em atraso` : "",
      info: "Alunos com mensalidades marcadas como em atraso (o mesmo critério da inadimplência). Volta a aparecer na semana seguinte se continuar por pagar.",
      columns: ["Aluno", "Plano", "Valor", "Em atraso", "Meses", ""],
    },
    seguros: {
      kind: "seguros", tone: "red", title: "Seguros e matrículas em atraso", items: seguros,
      summary: seguros.length ? `${feesTotal.toFixed(0)} € · ${feesTraining} a treinar sem seguro pago` : "",
      info: "Alunos ativos ou inadimplentes com o seguro desportivo ou a matrícula em atraso. Primeiro quem treinou nos últimos 30 dias (está a treinar sem seguro pago). Ao marcar «Feito», volta na semana seguinte se continuar por pagar.",
      columns: ["Aluno", "Falta", "Valor", "Treinos", ""],
    },
    encomendas: {
      kind: "encomendas", tone: "amber", title: "Encomendas por pagar", items: encomendas,
      summary: encomendas.length ? `${ordersTotal.toFixed(0)} € por receber · a mais antiga: há ${encomendas[0].urgency} ${dayWord(encomendas[0].urgency)}` : "",
      info: "Encomendas da loja ainda por pagar (pré-encomendas dos alunos e dos amigos). Confirma o pagamento aqui ou envia o lembrete por WhatsApp. Sai da lista quando é paga ou cancelada.",
      columns: ["Cliente", "Encomenda", "Valor", "Feita", ""],
    },
    vencer: {
      kind: "vencer", tone: "amber", title: "Mensalidades a vencer", items: vencer,
      summary: vencer.length ? "Vencem nos próximos 3 dias (prazo: dia 8)" : "",
      info: "Mensalidades do mês ainda por pagar a 3 dias ou menos do prazo (dia 8). Um lembrete antes evita atrasos.",
      columns: ["Aluno", "Plano", "Valor", "Prazo", ""],
    },
    semana: {
      kind: "semana", tone: "amber", title: "Kingdom Week no limite", items: semana,
      summary: semana.length ? "Na última aula do mês (ou já esgotaram)" : "",
      info: "Alunos do plano Kingdom Week (5 aulas/mês) que já fizeram a 4.ª aula do mês ou esgotaram o limite. Avisa por WhatsApp e, se quiserem treinar mais, concede aulas extra na ficha. Volta a aparecer se fizerem mais uma aula.",
      columns: ["Aluno", "Aulas", "Estado", "Mês", ""],
    },
    semplano: {
      kind: "semplano", tone: "blue", title: "Registados sem plano", items: semplano,
      summary: semplano.length ? "Criaram conta nos últimos 60 dias e não escolheram plano" : "",
      info: "Contas de aluno ativas, criadas há 1 a 60 dias, ainda sem plano. É receita à porta: um contacto ajuda a decidir.",
      columns: ["Aluno", "Modalidade", "Registado", "Contacto", ""],
    },
    exame: {
      kind: "exame", tone: "green", title: "Aptos para exame", items: exame,
      summary: exame.length ? "Cumprem os requisitos do próximo grau e ainda não foram convocados" : "",
      info: "Alunos que cumprem todos os requisitos do próximo grau (presenças, média, avaliação física, requisitos) nas modalidades com graduação publicada, sem convocatória ativa.",
      columns: ["Aluno", "Modalidade", "Grau atual", "Próximo grau", ""],
    },
    aniversarios: {
      kind: "aniversarios", tone: "green", title: "Aniversários", items: aniversarios,
      summary: aniversarios.length ? "Hoje e amanhã" : "",
      info: "Alunos ativos que fazem anos hoje ou amanhã (data de nascimento do perfil).",
      columns: ["Aluno", "Quando", "Idade", ""],
    },
    risco: {
      kind: "risco", tone: "red", title: "Em risco de sair", items: risco,
      summary: risco.length ? "Sem treinar há mais de 7 dias, com plano ativo" : "",
      info: "Alunos ativos com plano cujo último treino confirmado foi há 7 dias ou mais (ou que nunca treinaram). Ao marcar «Feito», só volta se o aluno treinar e deixar outra vez.",
      columns: ["Aluno", "Modalidade", "Último treino", "Antes treinava", "Plano", ""],
    },
    carga: {
      kind: "carga", tone: "amber", title: "Carga de treino alta", items: carga,
      summary: carga.length ? "Mais do dobro do normal nos últimos 7 dias" : "",
      info: "Esforço (RPE) × minutos dos últimos 7 dias comparado com a média das 4 semanas anteriores. Só alerta acima de 2×; o aluno vê o aviso a partir de 1,5×.",
      columns: ["Aluno", "Modalidade", "Rácio", "Treinos", ""],
    },
    adesao: {
      kind: "adesao", tone: "amber", title: "Adesões por concluir", items: adesao,
      summary: adesao.length ? "Têm plano mas faltam documentos" : "",
      info: "Alunos com plano a quem falta a ficha de inscrição, o contrato ou o termo de responsabilidade na versão atual.",
      columns: ["Aluno", "Plano", "Falta", "Inscrito", ""],
    },
    fisicas: {
      kind: "fisicas", tone: "blue", title: "Avaliações físicas a renovar", items: fisicas,
      summary: fisicas.length ? "Vencem nos próximos 30 dias ou já venceram" : "",
      info: "A avaliação física renova a cada 6 meses. Aparecem os alunos ativos cuja próxima avaliação vence nos próximos 30 dias ou já passou.",
      columns: ["Aluno", "Última", "Vencimento", "Pedido", ""],
    },
    performance: {
      kind: "performance", tone: "blue", title: "Performance por avaliar", items: performance,
      summary: performance.length ? `A treinar e sem avaliação de performance há ${PERFORMANCE_STALE_DAYS}+ dias` : "",
      info: `Alunos ativos que treinaram nos últimos ${PERFORMANCE_STALE_DAYS} dias e cuja última avaliação de performance foi há ${PERFORMANCE_STALE_DAYS} dias ou mais (ou que nunca foram avaliados). Ao marcar «Feito», volta na semana seguinte se continuar por avaliar.`,
      columns: ["Aluno", "Modalidade", "Última avaliação", "Último treino", ""],
    },
    confirmar: {
      kind: "confirmar", tone: "amber", title: "Experimentais por confirmar", items: confirmar,
      summary: confirmar.length ? "Aulas experimentais de hoje e dos próximos 2 dias" : "",
      info: "Aulas experimentais marcadas para hoje e para os próximos 2 dias. Aceita o pedido, se ainda não estiver aceite, e confirma a presença por WhatsApp com a mensagem padrão.",
      columns: ["Nome", "Aula", "Quando", "Estado", "Contacto", ""],
    },
    experimentais: {
      kind: "experimentais", tone: "blue", title: "Experimentais por converter", items: experimentais,
      summary: experimentais.length ? "Fizeram aula experimental nos últimos 14 dias" : "",
      info: "Aulas experimentais dos últimos 14 dias que ainda não passaram a aluno.",
      columns: ["Nome", "Aula", "Quando", "Contacto", ""],
    },
  };
  return ADMIN_TODO_ORDER.map((k) => groups[k]);
}
