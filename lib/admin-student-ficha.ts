import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getInsuranceSettings, isMembershipAgreementCurrent } from "@/lib/insurance-settings";
import { isEnrollmentFormCurrent } from "@/lib/enrollment-form";
import { calendarDateLisbon } from "@/lib/lesson-check-in-window";
import { addDaysYmd, daysBetween, isTuitionOverdue, RISK_DAYS } from "@/lib/admin-todo-rules";
import { getFamilyContext } from "@/lib/family-context";

export type SummaryTone = "red" | "amber" | "green" | "neutral";

export type StudentAdminSummary = {
  planName: string | null;
  isFamilyMember: boolean;
  tuition: { tone: SummaryTone; title: string; detail: string; lateTotal: number; lateMonths: string[]; dueSoon: boolean };
  fees: { tone: SummaryTone; title: string; detail: string; lateTotal: number; insuranceYears: string[]; enrollmentLate: boolean };
  documents: { tone: SummaryTone; detail: string; missing: string[] };
  training: { tone: SummaryTone; detail: string; lastDate: string | null; daysSince: number | null; perWeek: number };
  recentPayments: { id: string; label: string; amount: number; status: string; createdAt: string }[];
};

const MONTHS_PT = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
export const monthLabelPt = (ref: string) => {
  const [y, m] = ref.split("-").map(Number);
  return m ? `${MONTHS_PT[m - 1]} ${y}` : ref;
};
const eur = (n: number) => `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(".", ",")} €`;

/**
 * Resumo da ficha do aluno no admin: mensalidade, seguro/matrícula, documentos e treino — os mesmos
 * critérios do «A tratar hoje» (mensalidade só em atraso depois do dia 8). Em cache por pedido
 * (layout e página da ficha usam-no).
 */
export const loadStudentAdminSummary = cache(async function loadStudentAdminSummary(
  supabase: SupabaseClient,
  studentId: string,
  planId: string | null
): Promise<StudentAdminSummary> {
  const today = calendarDateLisbon(new Date());
  const since = addDaysYmd(today, -180);
  const [{ data: plan }, { data: payments }, settings, { data: agreement }, { data: waiver }, { data: form }, { data: att }, family] = await Promise.all([
    planId ? supabase.from("Plan").select("name").eq("id", planId).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("Payment").select("id, amount, status, paymentType, referenceMonth, referenceYear, createdAt").eq("studentId", studentId).order("createdAt", { ascending: false }).limit(60),
    getInsuranceSettings(supabase),
    supabase.from("StudentMembershipAgreement").select("agreementSigned, agreementVersion").eq("studentId", studentId).maybeSingle(),
    supabase.from("StudentWaiver").select("waiverSigned").eq("studentId", studentId).maybeSingle(),
    supabase.from("StudentEnrollmentForm").select("formCompleted, formVersion").eq("studentId", studentId).maybeSingle(),
    supabase.from("Attendance").select("occurrenceDate").eq("studentId", studentId).eq("status", "CONFIRMED").gte("occurrenceDate", since).lte("occurrenceDate", today),
    getFamilyContext(supabase, studentId),
  ]);
  const isFamilyMember = Boolean(family && !family.isTitular);

  type P = { id: string; amount: number | string; status: string; paymentType: string; referenceMonth: string | null; referenceYear: string | number | null; createdAt: string };
  const rows = (payments ?? []) as P[];

  // Mensalidade
  let lateTotal = 0;
  const lateMonths: string[] = [];
  let dueSoon = false;
  for (const p of rows.filter((r) => r.paymentType === "TUITION" && r.status === "LATE")) {
    const ref = p.referenceMonth ? String(p.referenceMonth).slice(0, 7) : null;
    if (ref && !isTuitionOverdue(today, ref)) {
      dueSoon = true;
      continue;
    }
    lateTotal += Number(p.amount) || 0;
    if (ref) lateMonths.push(ref);
  }
  lateMonths.sort();
  const tuition: StudentAdminSummary["tuition"] = isFamilyMember
    ? { tone: "neutral", title: "Mensalidade", detail: "cobrada no titular (família)", lateTotal: 0, lateMonths: [], dueSoon: false }
    : !planId
      ? { tone: "neutral", title: "Mensalidade", detail: "sem plano", lateTotal: 0, lateMonths: [], dueSoon: false }
      : lateTotal > 0
        ? { tone: "red", title: "Mensalidade", detail: `${eur(lateTotal)} em atraso${lateMonths[0] ? ` · desde ${monthLabelPt(lateMonths[0])}` : ""}`, lateTotal, lateMonths, dueSoon }
        : dueSoon
          ? { tone: "amber", title: "Mensalidade", detail: "deste mês por pagar (prazo dia 8)", lateTotal: 0, lateMonths: [], dueSoon: true }
          : { tone: "green", title: "Mensalidade", detail: "em dia", lateTotal: 0, lateMonths: [], dueSoon: false };

  // Seguro e matrícula
  const lateFees = rows.filter((r) => r.status === "LATE" && (r.paymentType === "INSURANCE" || r.paymentType === "ENROLLMENT"));
  const feesTotal = lateFees.reduce((a, r) => a + (Number(r.amount) || 0), 0);
  const insuranceYears = [...new Set(lateFees.filter((r) => r.paymentType === "INSURANCE").map((r) => (r.referenceYear != null ? String(r.referenceYear) : "")))].filter(Boolean).sort();
  const enrollmentLate = lateFees.some((r) => r.paymentType === "ENROLLMENT");
  const insuranceLate = lateFees.some((r) => r.paymentType === "INSURANCE");
  const paidInsurance = rows.some((r) => r.paymentType === "INSURANCE" && r.status === "PAID");
  const fees: StudentAdminSummary["fees"] =
    feesTotal > 0
      ? {
          tone: "amber",
          title: insuranceLate ? `Seguro${insuranceYears.length ? ` ${insuranceYears.join(", ")}` : ""}` : "Matrícula",
          detail: `${[insuranceLate && "seguro", enrollmentLate && "matrícula"].filter(Boolean).join(" e ")} por pagar · ${eur(feesTotal)}`,
          lateTotal: feesTotal,
          insuranceYears,
          enrollmentLate,
        }
      : { tone: paidInsurance ? "green" : "neutral", title: "Seguro", detail: paidInsurance ? "pago" : "sem registo", lateTotal: 0, insuranceYears: [], enrollmentLate: false };

  // Documentos
  const missing = [
    !isEnrollmentFormCurrent(form as { formCompleted?: boolean; formVersion?: string | null } | null, settings.enrollmentFormVersion) && "ficha de inscrição",
    !isMembershipAgreementCurrent(agreement as { agreementSigned?: boolean; agreementVersion?: string | null } | null, settings.membershipAgreementVersion) && "contrato",
    !(waiver as { waiverSigned?: boolean } | null)?.waiverSigned && "termo",
  ].filter(Boolean) as string[];
  const documents = missing.length ? { tone: "amber" as const, detail: `falta ${missing.join(", ")}`, missing } : { tone: "green" as const, detail: "completos", missing };

  // Treino
  const dates = ((att ?? []) as { occurrenceDate: string }[]).map((a) => String(a.occurrenceDate).slice(0, 10));
  const lastDate = dates.reduce<string | null>((m, d) => (!m || d > m ? d : m), null);
  const daysSince = lastDate ? daysBetween(lastDate, today) : null;
  const perWeek = dates.filter((d) => daysBetween(d, today) <= 56).length / 8;
  const training: StudentAdminSummary["training"] = !lastDate
    ? { tone: "neutral", detail: "sem treinos nos últimos 6 meses", lastDate: null, daysSince: null, perWeek: 0 }
    : {
        tone: daysSince! >= RISK_DAYS ? "red" : "green",
        detail: `${daysSince === 0 ? "hoje" : daysSince === 1 ? "ontem" : `há ${daysSince} dias`}${perWeek >= 0.5 ? ` · ${perWeek.toFixed(1).replace(".", ",")}×/semana` : ""}`,
        lastDate,
        daysSince,
        perWeek,
      };

  const TYPE: Record<string, string> = { TUITION: "Mensalidade", INSURANCE: "Seguro", ENROLLMENT: "Matrícula", EXTRA_SESSION: "Aula avulsa" };
  const recentPayments = rows.slice(0, 4).map((r) => ({
    id: r.id,
    label: `${TYPE[r.paymentType] ?? r.paymentType}${r.referenceMonth ? ` · ${monthLabelPt(String(r.referenceMonth).slice(0, 7))}` : r.referenceYear ? ` ${r.referenceYear}` : ""}`,
    amount: Number(r.amount) || 0,
    status: r.status,
    createdAt: r.createdAt,
  }));

  return { planName: (plan as { name?: string } | null)?.name ?? null, isFamilyMember, tuition, fees, documents, training, recentPayments };
});
