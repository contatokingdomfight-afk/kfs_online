"use server";

import { revalidatePath } from "next/cache";
import { schoolAccessErrorForStudent } from "@/lib/school-scope";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { adminPermissionError } from "@/lib/permissions/assert";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadAutoPayForStudent, setAutoPayBillingDay } from "@/lib/autopay/service";
import { syncStudentPaymentStatus } from "@/lib/student-payment-status";
import { pauseStudentTuition, resumeStudentTuition } from "@/lib/tuition-pause.server";
import { normalizeDueDay, todayYmdLisbon } from "@/lib/lisbon-payment-dates";
import { deferAutoPayCharge } from "@/lib/autopay/service";
import { firstChargedMonthAfter, loadOpenPause } from "@/lib/tuition-pause";

export type TuitionActionResult = { error?: string; success?: string } | null;

async function guard(studentId: string): Promise<{ userId: string } | { error: string }> {
  const u = await getCurrentDbUser();
  if (!u || u.role !== "ADMIN") return { error: "Não autorizado." };
  const perm = await adminPermissionError("admin:financeiro:write");
  if (perm) return { error: perm };
  const schoolErr = await schoolAccessErrorForStudent(studentId);
  if (schoolErr) return { error: schoolErr };
  return { userId: u.id };
}

function refresh(studentId: string) {
  revalidatePath(`/admin/alunos/${studentId}`);
  revalidatePath("/admin/a-tratar");
  revalidatePath("/admin");
  revalidatePath("/admin/financeiro", "layout");
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Muda o dia de pagamento (1–28); com pagamento automático, muda também o dia da cobrança. */
export async function setPaymentDueDayAction(_prev: TuitionActionResult, formData: FormData): Promise<TuitionActionResult> {
  const studentId = String(formData.get("studentId") ?? "");
  const g = await guard(studentId);
  if ("error" in g) return g;
  const day = Number(formData.get("paymentDueDay"));
  if (!Number.isInteger(day) || day < 1 || day > 28) return { error: "Escolhe um dia entre 1 e 28." };
  const supabase = createAdminClient();
  const { error } = await supabase.from("Student").update({ paymentDueDay: day }).eq("id", studentId);
  if (error) return { error: error.message };
  const ap = await loadAutoPayForStudent(supabase, studentId);
  if (ap && ap.state === "ACTIVE" && ap.billingDay !== day) {
    const r = await setAutoPayBillingDay(supabase, ap, day);
    if (r.error) return { error: `Dia gravado, mas o pagamento automático não mudou: ${r.error}` };
  }
  await syncStudentPaymentStatus(supabase, studentId);
  refresh(studentId);
  return { success: "Dia de pagamento gravado." };
}

/** Começa uma pausa de mensalidade (ex.: atestado médico). */
export async function pauseTuitionAction(_prev: TuitionActionResult, formData: FormData): Promise<TuitionActionResult> {
  const studentId = String(formData.get("studentId") ?? "");
  const g = await guard(studentId);
  if ("error" in g) return g;
  const startDate = String(formData.get("startDate") ?? "");
  const expected = String(formData.get("expectedEndDate") ?? "").trim();
  if (!YMD.test(startDate)) return { error: "Data de início inválida." };
  if (expected && (!YMD.test(expected) || expected < startDate)) return { error: "O regresso previsto tem de ser depois do início." };
  const reason = formData.get("reason") === "OTHER" ? "OTHER" : "MEDICAL";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const supabase = createAdminClient();
  let attachmentPath: string | null = null;
  let attachmentFileName: string | null = null;
  const file = formData.get("attachment");
  if (file instanceof File && file.size > 0) {
    if (file.size > 10 * 1024 * 1024) return { error: "O atestado tem de ter no máximo 10 MB." };
    const ext = (file.name.split(".").pop() ?? "pdf").toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
    attachmentPath = `pausas/${studentId}/${Date.now()}.${ext}`;
    attachmentFileName = file.name.slice(0, 200);
    const { error: upErr } = await supabase.storage
      .from("payment-proofs")
      .upload(attachmentPath, Buffer.from(await file.arrayBuffer()), { contentType: file.type || "application/octet-stream", upsert: false });
    if (upErr) return { error: `Não foi possível guardar o atestado: ${upErr.message}` };
  }

  const r = await pauseStudentTuition(supabase, {
    studentId,
    startDate,
    expectedEndDate: expected || null,
    reason,
    notes,
    attachmentPath,
    attachmentFileName,
    createdByUserId: g.userId,
  });
  if (r.error) return { error: r.error };
  refresh(studentId);
  return { success: r.warning ?? "Pausa registada." };
}

/** Termina a pausa em curso hoje (ou na data indicada). */
export async function resumeTuitionAction(_prev: TuitionActionResult, formData: FormData): Promise<TuitionActionResult> {
  const studentId = String(formData.get("studentId") ?? "");
  const g = await guard(studentId);
  if ("error" in g) return g;
  const supabase = createAdminClient();
  const r = await resumeStudentTuition(supabase, studentId, todayYmdLisbon());
  if (r.error) return { error: r.error };
  await syncStudentPaymentStatus(supabase, studentId);
  refresh(studentId);
  return { success: r.warning ?? "Pausa terminada. A cobrança volta no dia de pagamento." };
}

/** Corrige o regresso previsto de uma pausa em curso. */
export async function updatePauseExpectedEndAction(_prev: TuitionActionResult, formData: FormData): Promise<TuitionActionResult> {
  const studentId = String(formData.get("studentId") ?? "");
  const g = await guard(studentId);
  if ("error" in g) return g;
  const pauseId = String(formData.get("pauseId") ?? "");
  const expected = String(formData.get("expectedEndDate") ?? "").trim();
  if (expected && !YMD.test(expected)) return { error: "Data inválida." };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("StudentTuitionPause")
    .update({ expectedEndDate: expected || null, updatedAt: new Date().toISOString() })
    .eq("id", pauseId)
    .eq("studentId", studentId)
    .is("endDate", null);
  if (error) return { error: error.message };
  // Pagamento automático acompanha a nova data de regresso.
  const pause = await loadOpenPause(supabase, studentId);
  if (pause) {
    const { data: st } = await supabase.from("Student").select("paymentDueDay").eq("id", studentId).maybeSingle();
    const dueDay = normalizeDueDay((st as { paymentDueDay?: number } | null)?.paymentDueDay);
    const month = expected ? firstChargedMonthAfter({ startDate: pause.startDate, endDate: expected }, dueDay) : null;
    await deferAutoPayCharge(supabase, studentId, month, dueDay);
  }
  refresh(studentId);
  return { success: "Regresso previsto atualizado." };
}
