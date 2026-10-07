import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { requireGraduationExamPage } from "@/lib/graduation/exam-auth";
import { loadCandidateSheet } from "@/lib/graduation/load-exam";
import { sheetEntries } from "@/lib/graduation/exam";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
import { ExamResultBreakdown } from "@/components/graduation/ExamResultBreakdown";
import { ExamStatusChip, formatExamDate } from "@/components/graduation/ExamStatusChip";
import { DecisionForm } from "./DecisionForm";

export const dynamic = "force-dynamic";

export default async function ResultadoCandidatoPage({ params }: { params: Promise<{ eventId: string; candidateId: string }> }) {
  const { userId } = await requireGraduationExamPage();
  const supabase = getAdminClientOrNull();
  if (!supabase.client) return <AdminConfigMissing errorType={supabase.error} />;

  const { eventId, candidateId } = await params;
  const data = await loadCandidateSheet(supabase.client, candidateId, userId);
  if (!data || data.event.id !== eventId) notFound();

  const { candidate, sheet, event } = data;
  const decided = candidate.status !== "CONVOKED";
  const result = decided ? candidate.storedResult ?? data.result : data.result;
  const examinerList = [...data.examinerNames.values()];

  return (
    <div style={{ maxWidth: "min(720px, 100%)", paddingBottom: 96 }}>
      <Link href={`/coach/graduacao/${eventId}`} style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", fontWeight: 500, textDecoration: "none" }}>
        ← {event.title}
      </Link>

      <header style={{ margin: "var(--space-4) 0 var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 700 }}>{candidate.studentName}</h1>
          <ExamStatusChip status={candidate.status} />
        </div>
        <p style={{ margin: "6px 0 0", display: "flex", alignItems: "center", gap: 8, fontSize: "var(--text-sm)", color: "var(--text-secondary)", flexWrap: "wrap" }}>
          Exame para <BeltSwatch colors={sheet.targetGrade.colors} width={32} height={10} />
          <strong style={{ color: "var(--text-primary)" }}>{sheet.targetGrade.name}</strong>
          {decided && candidate.decidedAt && <span>· decidido a {formatExamDate(candidate.decidedAt, false)}</span>}
        </p>
        {examinerList.length > 0 && (
          <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>Avaliadores: {examinerList.join(", ")}</p>
        )}
      </header>

      {!decided && (
        <div
          className="card"
          style={{
            marginBottom: "var(--space-4)",
            borderColor: result.isComplete ? (result.passed ? "var(--success)" : "var(--danger)") : "var(--border)",
          }}
        >
          <p style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 700 }}>
            {!result.isComplete
              ? `Avaliação incompleta: ${result.scoredCount} de ${result.totalCount} itens com nota`
              : result.passed
                ? "Cumpre o critério de aprovação"
                : "Não cumpre o critério de aprovação"}
          </p>
          {!result.isComplete && (
            <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
              Completa a ficha para poder aprovar.{" "}
              {event.status === "SCHEDULED" && (
                <Link href={`/coach/graduacao/${eventId}/avaliar/${candidateId}`} style={{ color: "var(--primary)", fontWeight: 600 }}>
                  Continuar a avaliar
                </Link>
              )}
            </p>
          )}
        </div>
      )}

      {decided && candidate.feedback && (
        <div className="card" style={{ marginBottom: "var(--space-4)" }}>
          <p style={{ margin: 0, fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.6 }}>Feedback</p>
          <p style={{ margin: "6px 0 0", fontSize: "var(--text-sm)", whiteSpace: "pre-line" }}>{candidate.feedback}</p>
        </div>
      )}

      {candidate.status !== "ABSENT" && data.allScores.length > 0 && (
        <ExamResultBreakdown result={result} rows={data.allScores} examinerNames={data.examinerNames} keyOrder={sheetEntries(sheet).map((e) => e.key)} />
      )}

      {!decided && event.status === "SCHEDULED" && (
        <DecisionForm candidateId={candidateId} eventId={eventId} canPass={result.passed} hasScores={result.scoredCount > 0} gradeName={sheet.targetGrade.name} />
      )}
    </div>
  );
}
