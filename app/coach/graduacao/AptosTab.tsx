import { getSchoolScope, scopedSchoolIds } from "@/lib/school-scope";
import { filterSchools } from "@/lib/school-scope-rules";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildExamSlots, canSelfBook, countBySlot, slotKey } from "@/lib/graduation/exam-slots";
import { loadModalityReadiness } from "@/lib/graduation/load-modality-readiness";
import { inChunks } from "@/lib/graduation/queries";
import { getPublicOrigin } from "@/lib/site-public-url";
import { buildExamBookingReminderMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { formatExamDate } from "@/components/graduation/ExamStatusChip";
import { AptosList, type AptoExam, type AptoRow, type AptoState } from "./AptosList";

export type AptosFilter = "aptos" | "sem" | "todos";

const FILTERS: { value: AptosFilter; label: string }[] = [
  { value: "aptos", label: "Aptos" },
  { value: "sem", label: "Aptos sem exame marcado" },
  { value: "todos", label: "Todos" },
];

const chip = (on: boolean): React.CSSProperties => ({
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  padding: "6px 12px",
  borderRadius: 999,
  border: `1px solid ${on ? "var(--text-primary)" : "var(--border)"}`,
  background: on ? "var(--text-primary)" : "var(--bg-secondary)",
  color: on ? "var(--bg)" : "var(--text-secondary)",
  textDecoration: "none",
  whiteSpace: "nowrap",
});

const slotTime = (iso: string) => new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" });

/** Exames da modalidade ainda com horários por acontecer (para marcar um aluno). */
async function loadOpenExams(supabase: SupabaseClient, modalityCode: string, schoolIds: string[] | null | undefined): Promise<AptoExam[]> {
  const now = new Date();
  const { data: events } = await filterSchools(
    supabase.from("GraduationExamEvent").select("id, schoolId, title, scheduledAt, endsAt, slotMinutes, slotCapacity, selfBooking"),
    schoolIds
  )
    .eq("modalityCode", modalityCode)
    .eq("status", "SCHEDULED")
    .order("scheduledAt", { ascending: true });
  const ids = (events ?? []).map((e) => e.id as string);
  const candidates = await inChunks(
    ids,
    async (chunk) =>
      ((await supabase.from("GraduationExamCandidate").select("eventId, slotStartsAt").in("eventId", chunk)).data ?? []) as { eventId: string; slotStartsAt: string | null }[]
  );

  return (events ?? []).flatMap((e) => {
    const allSlots = buildExamSlots({ scheduledAt: e.scheduledAt, endsAt: e.endsAt, slotMinutes: e.slotMinutes, slotCapacity: e.slotCapacity });
    const open = allSlots.filter((iso) => new Date(iso) > now);
    if (allSlots.length > 0 ? open.length === 0 : new Date(e.scheduledAt) <= now) return [];
    const counts = countBySlot(candidates.filter((c) => c.eventId === e.id));
    return [
      {
        id: e.id as string,
        schoolId: (e.schoolId as string | null) ?? null,
        label: `${e.title} · ${formatExamDate(e.scheduledAt)}`,
        capacity: (e.slotCapacity as number | null) ?? 0,
        slots: open.map((iso) => ({ iso, label: slotTime(iso), taken: counts.get(slotKey(iso)) ?? 0 })),
        selfBookable: Boolean(e.selfBooking) && open.some((iso) => canSelfBook(iso, now)),
      },
    ];
  });
}

/** Separador «Alunos aptos»: quem pode fazer exame numa modalidade, e a decisão manual do coach/admin. */
export async function AptosTab({
  supabase,
  modalities,
  modalityParam,
  filterParam,
}: {
  supabase: SupabaseClient;
  modalities: { code: string; name: string }[];
  modalityParam?: string;
  filterParam?: string;
}) {
  const { data: templates } = await supabase.from("GraduationTemplate").select("modalityCode");
  const withGraduation = new Set((templates ?? []).map((t) => t.modalityCode as string));
  const options = modalities.filter((m) => withGraduation.has(m.code));
  if (options.length === 0) {
    return <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Ainda não há modalidades com graduação configurada.</p>;
  }

  const selected = options.find((m) => m.code === modalityParam) ?? options[0];
  const filter: AptosFilter = FILTERS.some((f) => f.value === filterParam) ? (filterParam as AptosFilter) : "aptos";
  const href = (m: string, f: AptosFilter) => `/coach/graduacao?tab=aptos&m=${encodeURIComponent(m)}&f=${f}`;

  const schoolIds = scopedSchoolIds(await getSchoolScope());
  const readiness = await loadModalityReadiness(supabase, selected.code, undefined, schoolIds);
  const rows: AptoRow[] = [];
  for (const s of readiness?.students ?? []) {
    const { progress } = s;
    if (!progress.next) continue;
    const manual = progress.manualReadiness;
    const state: AptoState = manual?.status === "READY" ? "manual" : manual?.status === "NOT_READY" ? "blocked" : progress.isReadyForExam ? "auto" : "no";
    const pending = progress.checks.filter((c) => c.status === "pending").map((c) => c.label);
    rows.push({
      studentId: s.studentId,
      name: s.name,
      modalityCode: selected.code,
      nextName: progress.next.name,
      nextColors: progress.next.colors,
      state,
      detail: manual ? manual.reason : state === "no" ? pending.slice(0, 3).join(" · ") || null : null,
      booking: s.activeConvocation ? formatExamDate(s.activeConvocation.slotStartsAt ?? s.activeConvocation.scheduledAt) : null,
      schoolId: null,
      whatsappUrl: null,
      whatsappHint: null,
    });
  }

  const isApto = (r: AptoRow) => r.state === "auto" || r.state === "manual";
  const visible = rows.filter((r) => (filter === "todos" ? true : filter === "sem" ? isApto(r) && !r.booking : isApto(r)));

  // Só quem está apto e sem exame marcado precisa de lembrete e de marcação.
  const toBook = visible.filter((r) => isApto(r) && !r.booking);
  const exams = toBook.length > 0 ? await loadOpenExams(supabase, selected.code, schoolIds) : [];
  if (toBook.length > 0) {
    const ids = toBook.map((r) => r.studentId);
    const [students, profiles] = await Promise.all([
      inChunks(ids, async (chunk) => ((await supabase.from("Student").select("id, schoolId").in("id", chunk)).data ?? []) as { id: string; schoolId: string | null }[]),
      inChunks(ids, async (chunk) => ((await supabase.from("StudentProfile").select("studentId, phone").in("studentId", chunk)).data ?? []) as { studentId: string; phone: string | null }[]),
    ]);
    const schoolByStudent = new Map(students.map((s) => [s.id, s.schoolId]));
    const phoneByStudent = new Map(profiles.map((p) => [p.studentId, p.phone]));
    const bookingUrl = `${getPublicOrigin()}/dashboard/graduacao/agendar?m=${encodeURIComponent(selected.code)}`;
    for (const r of toBook) {
      r.schoolId = schoolByStudent.get(r.studentId) ?? null;
      const phone = phoneByStudent.get(r.studentId);
      r.whatsappUrl = phone ? buildWhatsAppUrl(phone, buildExamBookingReminderMessage(r.name.trim().split(/\s+/)[0] ?? "", r.nextName, bookingUrl)) : null;
      if (!r.whatsappUrl) r.whatsappHint = "Sem telefone na ficha";
      // Sem datas abertas, o link levaria o aluno a uma página vazia.
      else if (!exams.some((e) => e.selfBookable && e.schoolId === r.schoolId)) {
        r.whatsappUrl = null;
        r.whatsappHint = "Sem datas abertas para o aluno marcar";
      }
    }
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "var(--space-2)" }} aria-label="Modalidade">
        {options.map((m) => (
          <Link key={m.code} href={href(m.code, filter)} style={chip(m.code === selected.code)}>
            {m.name}
          </Link>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "var(--space-3)" }} aria-label="Filtro">
        {FILTERS.map((f) => (
          <Link key={f.value} href={href(selected.code, f.value)} style={chip(f.value === filter)}>
            {f.label}
          </Link>
        ))}
      </div>
      <AptosList rows={visible} exams={exams} />
    </div>
  );
}
