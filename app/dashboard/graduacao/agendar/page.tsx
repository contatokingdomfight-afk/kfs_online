import Link from "next/link";
import { requirePlan } from "@/lib/require-plan";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { loadStudentGraduations } from "@/lib/graduation/load-student-progress";
import { buildExamSlots, canSelfBook, canSelfChange, countBySlot, selfChangeDeadline, slotKey } from "@/lib/graduation/exam-slots";
import { formatExamDate } from "@/components/graduation/ExamStatusChip";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
import { BookingPicker, type BookingEvent, type MyBooking } from "./BookingPicker";

export const dynamic = "force-dynamic";

const card = "mt-4 rounded-2xl border border-border bg-bg-secondary p-4 sm:p-5";

export default async function AgendarExamePage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requirePlan();
  const studentId = await getCurrentStudentId();
  const admin = getAdminClientOrNull().client;
  const graduations = studentId && admin ? await loadStudentGraduations(admin, studentId) : [];
  const { m } = await searchParams;
  const graduation = graduations.find((g) => g.modalityCode === m) ?? graduations.find((g) => g.openAgendaCount > 0) ?? graduations[0] ?? null;

  const back = (
    <Link
      href={graduation ? `/dashboard/graduacao?m=${encodeURIComponent(graduation.modalityCode)}` : "/dashboard/graduacao"}
      className="mb-4 inline-block text-sm font-medium text-text-secondary no-underline hover:text-text-primary"
    >
      ← A minha graduação
    </Link>
  );

  if (!graduation || !admin || !studentId || !graduation.progress.next) {
    return (
      <div className="mx-auto w-full max-w-[880px] py-4 sm:py-6">
        {back}
        <h1 className="m-0 text-2xl font-bold text-text-primary">Agendar exame</h1>
        <p className="mt-3 text-sm text-text-secondary">Não tens nenhum exame de graduação disponível de momento.</p>
      </div>
    );
  }

  const { progress } = graduation;
  const next = progress.next!;
  const now = new Date();

  const { data: eventRows } = await admin
    .from("GraduationExamEvent")
    .select("id, title, scheduledAt, endsAt, slotMinutes, slotCapacity, location, notes")
    .eq("modalityCode", graduation.modalityCode)
    .eq("status", "SCHEDULED")
    .eq("selfBooking", true)
    .gt("endsAt", now.toISOString())
    .order("scheduledAt", { ascending: true })
    .limit(12);
  const eventIds = (eventRows ?? []).map((e) => e.id as string);
  const { data: candidateRows } = eventIds.length
    ? await admin.from("GraduationExamCandidate").select("id, eventId, studentId, status, slotStartsAt, bookedByStudent").in("eventId", eventIds)
    : { data: [] as { id: string; eventId: string; studentId: string; status: string; slotStartsAt: string | null; bookedByStudent: boolean }[] };
  const candidates = candidateRows ?? [];
  const mine = candidates.find((c) => c.studentId === studentId && c.status === "CONVOKED") ?? null;

  const events: BookingEvent[] = (eventRows ?? []).map((e) => {
    const counts = countBySlot(candidates.filter((c) => c.eventId === e.id && c.studentId !== studentId));
    const capacity = (e.slotCapacity as number | null) ?? 0;
    return {
      id: e.id as string,
      title: e.title as string,
      scheduledAt: e.scheduledAt as string,
      endsAt: e.endsAt as string,
      slotMinutes: (e.slotMinutes as number | null) ?? 0,
      location: (e.location as string | null) ?? null,
      notes: (e.notes as string | null) ?? null,
      slots: buildExamSlots({
        scheduledAt: e.scheduledAt as string,
        endsAt: e.endsAt as string | null,
        slotMinutes: e.slotMinutes as number | null,
        slotCapacity: capacity,
      }).map((iso) => ({ iso, free: Math.max(0, capacity - (counts.get(slotKey(iso)) ?? 0)), open: canSelfBook(iso, now) })),
    };
  });

  const myBooking: MyBooking | null = mine
    ? (() => {
        const ev = events.find((e) => e.id === mine.eventId)!;
        const startsAt = mine.slotStartsAt ?? ev.scheduledAt;
        return {
          candidateId: mine.id,
          eventId: mine.eventId,
          slotStartsAt: mine.slotStartsAt,
          bookedByStudent: Boolean(mine.bookedByStudent),
          // Sem horário (convocado pelo coach): pode escolher; com horário: só até 48 h antes.
          canChange: !mine.slotStartsAt || canSelfChange(startsAt, now),
          deadline: selfChangeDeadline(startsAt).toISOString(),
        };
      })()
    : null;

  // Convocado para um exame sem marcação pela app (o coach trata do horário).
  const fixedConvocation = !mine && graduation.convocation ? graduation.convocation : null;
  const pendingChecks = progress.checks.filter((c) => c.status === "pending");

  return (
    <div className="mx-auto w-full min-w-0 max-w-[880px] py-4 sm:py-6">
      {back}
      <h1 className="m-0 text-2xl font-bold text-text-primary">{myBooking?.slotStartsAt ? "O teu exame" : "Agendar exame"}</h1>
      <p className="m-0 mt-1 text-sm text-text-secondary">
        {myBooking?.slotStartsAt ? "Estás convocado. Boa preparação!" : "Escolhe o dia e o horário. A tua vaga fica reservada logo."}
      </p>

      <section className={card} aria-label="Próximo grau">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BeltSwatch colors={next.colors} width={44} height={14} />
            <div className="min-w-0">
              <p className="m-0 break-words font-bold text-text-primary">Exame para {next.name}</p>
              <p className="m-0 text-xs text-text-secondary">
                {graduation.modalityName} · atual: {progress.current?.name ?? "sem graduação"}
              </p>
            </div>
          </div>
          {progress.isReadyForExam || mine ? (
            <span className="rounded-full px-2.5 py-1 text-xs font-bold text-success" style={{ background: "color-mix(in srgb, var(--success) 14%, transparent)" }}>
              ✓ Apto para exame
            </span>
          ) : (
            <span className="rounded-full px-2.5 py-1 text-xs font-bold text-danger" style={{ background: "color-mix(in srgb, var(--danger) 14%, transparent)" }}>
              Ainda não apto
            </span>
          )}
        </div>
        {!progress.isReadyForExam && !mine && !fixedConvocation && pendingChecks.length > 0 && (
          <ul className="m-0 mt-3 list-none p-0">
            {pendingChecks.map((c) => (
              <li key={c.key} className="flex justify-between gap-3 border-b border-dashed border-border py-1.5 text-sm last:border-0">
                <span className="text-text-primary">{c.label}</span>
                <span className="text-right text-text-secondary">
                  {c.key === "coach" && progress.manualReadiness ? `Ainda não — «${progress.manualReadiness.reason}»` : c.detail}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {graduation.awaitingResult && !mine ? (
        <section className={card}>
          <p className="m-0 font-semibold text-text-primary">Já fizeste o exame — aguarda o resultado.</p>
          <p className="m-0 mt-1 text-sm text-text-secondary">
            {graduation.awaitingResult.revealAt
              ? `O resultado é revelado a ${formatExamDate(graduation.awaitingResult.revealAt)}.`
              : "O resultado será revelado numa data a anunciar pela academia."}
          </p>
        </section>
      ) : fixedConvocation ? (
        <section className={card}>
          <p className="m-0 font-semibold text-text-primary">Já estás convocado: {fixedConvocation.title}</p>
          <p className="m-0 mt-1 text-sm text-text-secondary">
            {formatExamDate(fixedConvocation.slotStartsAt ?? fixedConvocation.scheduledAt)}
            {fixedConvocation.location ? ` · ${fixedConvocation.location}` : ""}. Para mudar, fala com o coach.
          </p>
        </section>
      ) : events.length === 0 ? (
        <section className={card}>
          <p className="m-0 text-sm text-text-secondary">
            Ainda não há dias de exame abertos para marcação em {graduation.modalityName}. Vais receber uma notificação quando abrirem.
          </p>
        </section>
      ) : (
        <BookingPicker events={events} myBooking={myBooking} canBook={progress.isReadyForExam} gradeName={next.name} />
      )}
    </div>
  );
}
