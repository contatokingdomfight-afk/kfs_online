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

export const dynamic = "force-dynamic";

export default async function ExamEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { userId } = await requireGraduationExamPage();
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { eventId } = await params;
  const detail = await loadExamEventDetail(supabase, eventId, userId);
  if (!detail) notFound();
  const { event, candidates } = detail;
  const isOpen = event.status === "SCHEDULED";

  const readiness = isOpen ? await loadModalityReadiness(supabase, event.modalityCode) : null;
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
        .filter((c) => c.status === "pending" && !c.key.startsWith("requirement:"))
        .map((c) => `${c.label} (${c.detail})`),
      pendingRequirements: s.pendingRequirements,
      otherConvocation: s.activeConvocation && s.activeConvocation.eventId !== eventId ? s.activeConvocation.title : null,
    }));

  const pending = candidates.filter((c) => c.status === "CONVOKED").length;

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
                      <strong style={{ fontSize: "var(--text-sm)" }}>{c.studentName}</strong>
                      <ExamStatusChip status={c.status} />
                    </div>
                    <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                      Para {c.gradeName}
                      {!decided && total > 0 && ` · as tuas notas: ${c.myScoredCount}/${total}`}
                      {!decided && c.result && c.result.examinerCount > 1 && ` · ${c.result.examinerCount} avaliadores`}
                      {!decided && c.result?.isComplete && (c.result.passed ? " · cumpre o critério" : " · não cumpre o critério")}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
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
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {isOpen && <ConvocationPanel eventId={event.id} options={options} />}

      <EventActions eventId={event.id} status={event.status} pendingCount={pending} />
    </div>
  );
}
