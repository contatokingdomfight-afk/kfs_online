import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronRight, MapPin } from "lucide-react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { requireGraduationExamPage } from "@/lib/graduation/exam-auth";
import { loadExamEventDetail } from "@/lib/graduation/load-exam";
import { loadModalityReadiness } from "@/lib/graduation/load-modality-readiness";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
import { ExamStatusChip, formatExamDate } from "@/components/graduation/ExamStatusChip";
import { ConvocationPanel, type ConvocationOption } from "./ConvocationPanel";
import { EventActions, RemoveCandidateButton } from "./EventActions";
import { CandidateSlotSelect, RemindReadyButton } from "./SlotControls";
import { RevealControls } from "./RevealControls";
import { revealDueResults } from "@/lib/graduation/reveal";
import { TargetGradeControl, type TargetGradeOption } from "./TargetGradeControl";
import { buildExamSlots, countBySlot, slotKey } from "@/lib/graduation/exam-slots";

export const dynamic = "force-dynamic";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" });
}

export default async function ExamEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { userId, role } = await requireGraduationExamPage();
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { eventId } = await params;
  // Revela os resultados cuja data já chegou antes de mostrar a página.
  await revealDueResults(supabase, { eventId });
  const detail = await loadExamEventDetail(supabase, eventId, userId);
  if (!detail) notFound();
  const { event, candidates } = detail;
  const isOpen = event.status === "SCHEDULED";

  const readiness = isOpen ? await loadModalityReadiness(supabase, event.modalityCode, undefined, event.schoolId ? [event.schoolId] : undefined) : null;
  const convokedHere = new Set(candidates.map((c) => c.studentId));
  const options: ConvocationOption[] = (readiness?.students ?? [])
    .filter((s) => !convokedHere.has(s.studentId) && s.progress.next)
    .map((s) => ({
      studentId: s.studentId,
      name: s.name,
      isPrimary: s.isPrimary,
      currentName: s.progress.current?.name ?? null,
      currentColors: s.progress.current?.colors ?? [],
      nextName: s.progress.next!.name,
      nextColors: s.progress.next!.colors,
      ready: s.progress.isReadyForExam,
      doneCount: s.progress.doneCount,
      total: s.progress.checks.length,
      pendingChecks: s.progress.checks
        .filter((c) => c.status === "pending" && !c.key.startsWith("requirement:") && c.key !== "coach")
        .map((c) => `${c.label} (${c.detail})`),
      pendingRequirements: s.pendingRequirements,
      otherConvocation: s.activeConvocation && s.activeConvocation.eventId !== eventId ? s.activeConvocation.title : null,
      manual: s.progress.manualReadiness ? { status: s.progress.manualReadiness.status, reason: s.progress.manualReadiness.reason } : null,
    }));

  // Salto de grau (só admin): graus possíveis por convocado = do próximo grau para cima.
  const grades = detail.template?.grades ?? [];
  const nextIdByStudent = new Map((readiness?.students ?? []).map((s) => [s.studentId, s.progress.next?.id ?? null]));
  const targetOptionsFor = (studentId: string): TargetGradeOption[] => {
    const nextId = nextIdByStudent.get(studentId);
    const from = nextId ? grades.findIndex((g) => g.id === nextId) : -1;
    return from < 0 ? [] : grades.slice(from).map((g) => ({ id: g.id, name: g.name, colors: g.colors }));
  };

  // Atalho para a prontidão manual (só admin).
  const readinessHref = role === "ADMIN" ? `/admin/graduacao/${encodeURIComponent(event.modalityCode)}/aluno?student=` : null;

  const pending = candidates.filter((c) => c.status === "CONVOKED").length;

  // Agenda com horários: ocupação por horário e convocados ordenados por hora.
  const slots = buildExamSlots(event);
  const occupancy = countBySlot(candidates);
  const counts = Object.fromEntries(slots.map((s) => [s, occupancy.get(slotKey(s)) ?? 0]));
  const capacity = event.slotCapacity ?? 0;
  if (slots.length > 0) {
    candidates.sort((a, b) => (a.slotStartsAt ? slotKey(a.slotStartsAt) : Infinity) - (b.slotStartsAt ? slotKey(b.slotStartsAt) : Infinity));
  }
  const readyWithoutBooking = (readiness?.students ?? []).filter(
    (s) => s.progress.isReadyForExam && s.progress.next && !s.activeConvocation && !convokedHere.has(s.studentId)
  ).length;

  return (
    <div style={{ maxWidth: "min(760px, 100%)", paddingBottom: 96 }}>
      <Link href="/coach/graduacao" style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", fontWeight: 500, textDecoration: "none" }}>
        ← Exames de graduação
      </Link>

      <header style={{ margin: "var(--space-4) 0 var(--space-5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 600 }}>{event.title}</h1>
          <ExamStatusChip status={event.status} kind="event" />
        </div>
        <p style={{ margin: "8px 0 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)", display: "flex", gap: 14, flexWrap: "wrap" }}>
          <span>{event.modalityName}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <CalendarDays size={14} aria-hidden /> {formatExamDate(event.scheduledAt)}
          </span>
          {event.location && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <MapPin size={14} aria-hidden /> {event.location}
            </span>
          )}
        </p>
        {event.notes && <p style={{ margin: "8px 0 0", fontSize: "var(--text-sm)", whiteSpace: "pre-line" }}>{event.notes}</p>}
      </header>

      {slots.length > 0 && (
        <section className="card" style={{ marginBottom: "var(--space-5)" }} aria-labelledby="horarios">
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
            <h2 id="horarios" style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 700 }}>
              Horários{" "}
              <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>
                · até {formatTime(event.endsAt!)} · {event.slotMinutes} min · {capacity} {capacity === 1 ? "vaga" : "vagas"} por horário
              </span>
            </h2>
            {isOpen && event.selfBooking && <RemindReadyButton eventId={event.id} />}
          </div>
          <p style={{ margin: "6px 0 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            {candidates.filter((c) => c.slotStartsAt).length} de {slots.length * capacity} vagas ocupadas
            {event.selfBooking ? " · marcação pelo aluno ativa" : " · só o coach marca"}
            {isOpen && event.selfBooking && readyWithoutBooking > 0 && ` · ${readyWithoutBooking} ${readyWithoutBooking === 1 ? "apto ainda sem marcação" : "aptos ainda sem marcação"}`}
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "var(--space-3) 0 0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 8 }}>
            {slots.map((s) => {
              const n = counts[s];
              const full = n >= capacity;
              return (
                <li
                  key={s}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "8px 4px",
                    textAlign: "center",
                    background: full ? "color-mix(in srgb, var(--warning) 10%, transparent)" : undefined,
                  }}
                >
                  <strong style={{ display: "block", fontSize: "var(--text-sm)" }}>{formatTime(s)}</strong>
                  <span style={{ fontSize: "var(--text-xs)", color: full ? "var(--warning)" : "var(--text-secondary)" }}>
                    {n}/{capacity}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <RevealControls
        eventId={event.id}
        revealAt={event.resultsRevealAt}
        hiddenCount={candidates.filter((c) => c.status !== "CONVOKED" && !c.revealed).length}
        undecidedCount={pending}
      />

      <section>
        <h2 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-base)", fontWeight: 700 }}>
          Convocados <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>({candidates.length})</span>
        </h2>
        {candidates.length === 0 ? (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Ainda ninguém convocado. Escolhe os alunos abaixo.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {candidates.map((c) => {
              const decided = c.status !== "CONVOKED";
              const total = c.result?.totalCount ?? 0;
              return (
                <li key={c.id} className="card" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap", padding: "var(--space-3) var(--space-4)" }}>
                  <BeltSwatch colors={c.gradeColors} width={40} height={12} title={c.gradeName} />
                  <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {slots.length > 0 && c.slotStartsAt && (
                        <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)" }}>{formatTime(c.slotStartsAt)}</span>
                      )}
                      <strong style={{ fontSize: "var(--text-sm)" }}>{c.studentName}</strong>
                      <ExamStatusChip status={c.status} />
                      {decided && !c.revealed && (
                        <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)" }}>🔒 por revelar</span>
                      )}
                      {c.bookedByStudent && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>marcou na app</span>}
                      {readinessHref && (
                        <Link
                          href={`${readinessHref}${encodeURIComponent(c.studentId)}`}
                          style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}
                        >
                          Prontidão →
                        </Link>
                      )}
                    </div>
                    <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                      {c.mode === "PLACEMENT" ? (
                        <span style={{ color: "var(--primary)", fontWeight: 700 }}>
                          🧭 Nivelamento ·{" "}
                          {decided ? (c.awardedGradeName ? `atribuído: ${c.awardedGradeName}` : "sem grau novo") : `a avaliar: ${c.gradeName}`}
                        </span>
                      ) : (
                        <>Para {c.gradeName}</>
                      )}
                      {c.skipReason && <span style={{ color: "var(--warning)", fontWeight: 700 }}> · ⬆ salto de grau — «{c.skipReason}»</span>}
                      {c.result?.override && <span style={{ color: "var(--warning)", fontWeight: 700 }}> · aprovado com justificação</span>}
                      {!decided && total > 0 && ` · as tuas notas: ${c.myScoredCount}/${total}`}
                      {!decided && c.result && c.result.examinerCount > 1 && ` · ${c.result.examinerCount} avaliadores`}
                      {!decided && c.mode !== "PLACEMENT" && c.result?.isComplete && (c.result.passed ? " · cumpre o critério" : " · não cumpre o critério")}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                    {slots.length > 0 && !decided && isOpen && (
                      <CandidateSlotSelect candidateId={c.id} value={c.slotStartsAt} slots={slots} counts={counts} capacity={capacity} />
                    )}
                    {!decided && isOpen && (
                      <Link href={`/coach/graduacao/${event.id}/avaliar/${c.id}`} className="btn btn-primary" style={{ textDecoration: "none" }}>
                        Avaliar
                      </Link>
                    )}
                    <Link
                      href={`/coach/graduacao/${event.id}/resultado/${c.id}`}
                      className="btn btn-secondary"
                      style={{ textDecoration: "none", gap: 4 }}
                      aria-label={`Resultado de ${c.studentName}`}
                    >
                      {decided ? "Ver" : "Resultado"} <ChevronRight size={14} aria-hidden />
                    </Link>
                    {!decided && isOpen && c.myScoredCount === 0 && <RemoveCandidateButton candidateId={c.id} name={c.studentName} />}
                  </div>
                  {role === "ADMIN" && !decided && isOpen && c.myScoredCount === 0 && (
                    <TargetGradeControl
                      candidateId={c.id}
                      studentName={c.studentName}
                      currentTargetId={c.gradeId}
                      currentReason={c.skipReason}
                      options={targetOptionsFor(c.studentId)}
                      placement={c.mode === "PLACEMENT" ? { maxGradeId: c.placementMaxGradeId, note: c.placementNote } : null}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {isOpen && <ConvocationPanel eventId={event.id} options={options} readinessHref={readinessHref} />}

      <EventActions eventId={event.id} status={event.status} pendingCount={pending} />
    </div>
  );
}
