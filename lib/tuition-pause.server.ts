import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeDueDay, todayYmdLisbon, currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { addMonthsToReferenceMonth } from "@/lib/reference-month";
import { deferAutoPayCharge } from "@/lib/autopay/service";
import {
  exemptMonthCount,
  firstChargedMonthAfter,
  loadOpenPause,
  pauseExemptsMonth,
  type TuitionPause,
} from "@/lib/tuition-pause";

async function studentDueDay(supabase: SupabaseClient, studentId: string): Promise<number> {
  const { data } = await supabase.from("Student").select("paymentDueDay").eq("id", studentId).maybeSingle();
  return normalizeDueDay((data as { paymentDueDay?: number } | null)?.paymentDueDay);
}

/** Anula mensalidades por pagar (LATE, individuais) dos meses que a pausa isenta. */
async function voidExemptTuition(supabase: SupabaseClient, pause: Pick<TuitionPause, "studentId" | "startDate" | "endDate">, dueDay: number): Promise<number> {
  const { data } = await supabase
    .from("Payment")
    .select("id, referenceMonth")
    .eq("studentId", pause.studentId)
    .eq("status", "LATE")
    .eq("paymentType", "TUITION")
    .gte("referenceMonth", pause.startDate.slice(0, 7));
  const ids = ((data ?? []) as { id: string; referenceMonth: string }[])
    .filter((p) => pauseExemptsMonth(pause, p.referenceMonth, dueDay))
    .map((p) => p.id);
  if (ids.length) await supabase.from("Payment").delete().in("id", ids);
  return ids.length;
}

/** Sem mensalidades em atraso: limpa a tolerância e repõe ATIVO (mantém INATIVO/EXPERIMENTAL). */
async function clearOverdueState(supabase: SupabaseClient, studentId: string): Promise<void> {
  const { count } = await supabase
    .from("Payment")
    .select("id", { count: "exact", head: true })
    .eq("studentId", studentId)
    .eq("status", "LATE")
    .eq("paymentType", "TUITION");
  if ((count ?? 0) > 0) return;
  await supabase.from("Student").update({ paymentGraceEndsAt: null, paymentGraceReferenceMonth: null }).eq("id", studentId);
  await supabase
    .from("Student")
    .update({ status: "ATIVO", statusChangedAt: new Date().toISOString() })
    .eq("id", studentId)
    .eq("status", "INADIMPLENTE")
    .not("planId", "is", null);
}

export type PauseInput = {
  studentId: string;
  startDate: string;
  expectedEndDate: string | null;
  reason: "MEDICAL" | "OTHER";
  notes: string | null;
  attachmentPath?: string | null;
  attachmentFileName?: string | null;
  createdByUserId: string | null;
};

export async function pauseStudentTuition(supabase: SupabaseClient, input: PauseInput): Promise<{ error?: string; warning?: string }> {
  if (await loadOpenPause(supabase, input.studentId)) return { error: "Este aluno já tem uma pausa em curso." };
  const { data: st } = await supabase.from("Student").select("schoolId").eq("id", input.studentId).maybeSingle();
  const dueDay = await studentDueDay(supabase, input.studentId);
  const now = new Date().toISOString();
  const { error } = await supabase.from("StudentTuitionPause").insert({
    id: crypto.randomUUID(),
    studentId: input.studentId,
    schoolId: (st as { schoolId?: string } | null)?.schoolId ?? null,
    startDate: input.startDate,
    expectedEndDate: input.expectedEndDate,
    reason: input.reason,
    notes: input.notes,
    attachmentPath: input.attachmentPath ?? null,
    attachmentFileName: input.attachmentFileName ?? null,
    createdByUserId: input.createdByUserId,
    createdAt: now,
    updatedAt: now,
  });
  if (error) return { error: error.message };

  await voidExemptTuition(supabase, { studentId: input.studentId, startDate: input.startDate, endDate: null }, dueDay);
  if (input.startDate <= todayYmdLisbon()) await clearOverdueState(supabase, input.studentId);

  // Pagamento automático: próxima cobrança no regresso previsto (ou adiada sem data).
  const resumeMonth = input.expectedEndDate
    ? firstChargedMonthAfter({ startDate: input.startDate, endDate: input.expectedEndDate }, dueDay)
    : null;
  const ap = await deferAutoPayCharge(supabase, input.studentId, resumeMonth, dueDay);
  return ap.error ? { warning: `Pausa registada, mas ${ap.error}` } : {};
}

/** Termina a pausa em curso (regresso nessa data): adia a fidelização e retoma a cobrança automática. */
export async function resumeStudentTuition(supabase: SupabaseClient, studentId: string, endDate: string = todayYmdLisbon()): Promise<{ error?: string; warning?: string }> {
  const pause = await loadOpenPause(supabase, studentId);
  if (!pause) return { error: "Este aluno não tem nenhuma pausa em curso." };
  const end = endDate < pause.startDate ? pause.startDate : endDate;
  const dueDay = await studentDueDay(supabase, studentId);
  const closed = { ...pause, endDate: end };

  // Fidelização: adia o fim pelos meses não cobrados (uma só vez por pausa).
  const shift = exemptMonthCount(closed, dueDay) - (pause.loyaltyMonthsShifted ?? 0);
  if (shift > 0) {
    const { data: lc } = await supabase
      .from("LoyaltyCommitment")
      .select("id, endMonth")
      .eq("studentId", studentId)
      .eq("state", "ACTIVE")
      .maybeSingle();
    const c = lc as { id: string; endMonth: string } | null;
    if (c) {
      await supabase
        .from("LoyaltyCommitment")
        .update({ endMonth: addMonthsToReferenceMonth(c.endMonth, shift), updatedAt: new Date().toISOString() })
        .eq("id", c.id);
    }
  }

  const { error } = await supabase
    .from("StudentTuitionPause")
    .update({ endDate: end, loyaltyMonthsShifted: Math.max(0, shift) + (pause.loyaltyMonthsShifted ?? 0), updatedAt: new Date().toISOString() })
    .eq("id", pause.id);
  if (error) return { error: error.message };

  // Mensalidades geradas entretanto para meses isentos (ex.: regresso depois do dia 15).
  await voidExemptTuition(supabase, closed, dueDay);

  const month = firstChargedMonthAfter(closed, dueDay) ?? currentReferenceMonthLisbon(new Date());
  const ap = await deferAutoPayCharge(supabase, studentId, month, dueDay);
  return ap.error ? { warning: `Pausa terminada, mas ${ap.error}` } : {};
}

/** Cron diário: retoma as pausas cujo regresso previsto já chegou. */
export async function resumeDuePauses(supabase: SupabaseClient): Promise<{ resumed: number }> {
  const today = todayYmdLisbon();
  const { data, error } = await supabase
    .from("StudentTuitionPause")
    .select("studentId, expectedEndDate")
    .is("endDate", null)
    .lte("expectedEndDate", today);
  if (error) return { resumed: 0 };
  let resumed = 0;
  for (const p of (data ?? []) as { studentId: string; expectedEndDate: string }[]) {
    const r = await resumeStudentTuition(supabase, p.studentId, p.expectedEndDate);
    if (!r.error) resumed++;
  }
  return { resumed };
}
