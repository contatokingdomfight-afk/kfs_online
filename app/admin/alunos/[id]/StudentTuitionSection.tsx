import type { SupabaseClient } from "@supabase/supabase-js";
import { loadPausesByStudent, isPauseActiveOn, firstChargedMonthAfter } from "@/lib/tuition-pause";
import { normalizeDueDay, todayYmdLisbon } from "@/lib/lisbon-payment-dates";
import { loadAutoPayForStudent } from "@/lib/autopay/service";
import { StudentTuitionControls, type PauseView } from "./StudentTuitionControls";

const MONTHS = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
function shortDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** Ficha do aluno: dia de pagamento e pausas de mensalidade (ex.: atestado médico). */
export async function StudentTuitionSection({ supabase, studentId, sectionTitle }: { supabase: SupabaseClient; studentId: string; sectionTitle: React.CSSProperties }) {
  const today = todayYmdLisbon();
  const [{ data: st }, pausesMap, autoPay] = await Promise.all([
    supabase.from("Student").select("paymentDueDay").eq("id", studentId).maybeSingle(),
    loadPausesByStudent(supabase, [studentId]),
    loadAutoPayForStudent(supabase, studentId).catch(() => null),
  ]);
  const dueDay = normalizeDueDay((st as { paymentDueDay?: number } | null)?.paymentDueDay);
  const pauses = pausesMap.get(studentId) ?? [];
  const open = pauses.find((p) => !p.endDate) ?? null;
  const history = pauses.filter((p) => p.endDate).reverse();

  let attachmentUrl: string | null = null;
  if (open?.attachmentPath) {
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(open.attachmentPath, 600);
    attachmentUrl = data?.signedUrl ?? null;
  }
  const resumeMonth = open?.expectedEndDate ? firstChargedMonthAfter({ startDate: open.startDate, endDate: open.expectedEndDate }, dueDay) : null;

  const openView: PauseView | null = open
    ? {
        id: open.id,
        active: isPauseActiveOn(open, today),
        startLabel: shortDate(open.startDate),
        expectedEndDate: open.expectedEndDate,
        expectedLabel: open.expectedEndDate ? shortDate(open.expectedEndDate) : null,
        reasonLabel: open.reason === "MEDICAL" ? "Atestado médico" : "Outro motivo",
        notes: open.notes,
        attachmentUrl,
        attachmentFileName: open.attachmentFileName,
        resumeLabel: resumeMonth ? `cobrança volta em ${monthLabel(resumeMonth)} (dia ${dueDay})` : "sem data de regresso — não cobra até retomares",
      }
    : null;

  return (
    <section style={{ marginTop: 18 }}>
      <h2 style={sectionTitle}>Mensalidade</h2>
      <StudentTuitionControls
        studentId={studentId}
        dueDay={dueDay}
        today={today}
        open={openView}
        autoPayActive={autoPay?.state === "ACTIVE"}
        history={history.map((p) => ({
          id: p.id,
          label: `${shortDate(p.startDate)} → ${shortDate(p.endDate!)}`,
          reasonLabel: p.reason === "MEDICAL" ? "atestado médico" : "outro motivo",
        }))}
      />
    </section>
  );
}
