import Link from "next/link";
import { requirePlan } from "@/lib/require-plan";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { loadStudentGraduations } from "@/lib/graduation/load-student-progress";
import { loadBookingEvents } from "@/lib/graduation/load-booking-events";
import { formatExamDate } from "@/components/graduation/ExamStatusChip";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
import { BookingPicker } from "./BookingPicker";

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
  // Grau do exame: o grau-alvo da convocatória (salto de grau) ou o próximo grau.
  const next = graduation.examTarget?.grade ?? progress.next!;
  const now = new Date();

  const { events, myBooking } = await loadBookingEvents(admin, graduation.modalityCode, studentId, now);
  const mine = myBooking;

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
              <p className="m-0 break-words font-bold text-text-primary">
                {graduation.convocation?.isPlacement ? "Exame de nivelamento" : `Exame para ${next.name}`}
                {graduation.examTarget && <span className="font-normal text-warning"> · salto de grau</span>}
              </p>
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
