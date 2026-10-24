import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { requireGraduationExamPage } from "@/lib/graduation/exam-auth";
import { loadCandidateSheet } from "@/lib/graduation/load-exam";
import { sheetEntries } from "@/lib/graduation/exam";
import { GRADUATION_AXIS_META } from "@/lib/graduation/template";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
import { ExamResultBreakdown } from "@/components/graduation/ExamResultBreakdown";
import { ExamStatusChip, formatExamDate } from "@/components/graduation/ExamStatusChip";
import { DecisionForm } from "./DecisionForm";
import { PlacementDecisionForm } from "./PlacementDecisionForm";

export const dynamic = "force-dynamic";

export default async function ResultadoCandidatoPage({ params }: { params: Promise<{ eventId: string; candidateId: string }> }) {
  const { userId, role } = await requireGraduationExamPage();
  const supabase = getAdminClientOrNull();
  if (!supabase.client) return <AdminConfigMissing errorType={supabase.error} />;

  const { eventId, candidateId } = await params;
  const data = await loadCandidateSheet(supabase.client, candidateId, userId);
  if (!data || data.event.id !== eventId) notFound();

  const { candidate, sheet, event } = data;
  const decided = candidate.status !== "CONVOKED";
  const result = decided ? candidate.storedResult ?? data.result : data.result;
  const examinerList = [...data.examinerNames.values()];
  const placement = data.placement;
  const proposed = placement ? placement.grades[placement.result.proposedIndex] ?? null : null;
  const awarded = placement?.awardedGradeId ? placement.grades.find((g) => g.id === placement.awardedGradeId) ?? null : null;

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
          {placement ? (
            <strong style={{ color: "var(--primary)" }}>🧭 Nivelamento</strong>
          ) : (
            <>
              Exame para <BeltSwatch colors={sheet.targetGrade.colors} width={32} height={10} />
              <strong style={{ color: "var(--text-primary)" }}>{sheet.targetGrade.name}</strong>
            </>
          )}
          {decided && candidate.decidedAt && <span>· decidido a {formatExamDate(candidate.decidedAt, false)}</span>}
        </p>
        {examinerList.length > 0 && (
          <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>Avaliadores: {examinerList.join(", ")}</p>
        )}
      </header>

      {placement && (
        <section className="card" style={{ marginBottom: "var(--space-4)" }} aria-labelledby="niveis">
          <h2 id="niveis" style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-base)", fontWeight: 700 }}>
            Graus avaliados
          </h2>
          {placement.note && (
            <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>Historial: {placement.note}</p>
          )}
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {placement.result.levels.map((l) => {
              const r = l.result;
              const weak = r.axes.filter((a) => a.newPassed === false).map((a) => GRADUATION_AXIS_META[a.axis].label);
              const label = !r.isComplete
                ? `Incompleto (${r.scoredCount}/${r.totalCount})`
                : r.passed
                  ? "Cumpre"
                  : `Não cumpre${weak.length ? ` (${weak.join(", ")})` : r.criticalFailures.length ? " (item fundamental)" : ""}`;
              const color = !r.isComplete ? "var(--text-secondary)" : r.passed ? "var(--success)" : "var(--danger)";
              return (
                <li key={l.gradeId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: "var(--text-sm)", flexWrap: "wrap" }}>
                  <BeltSwatch colors={l.colors} width={28} height={10} />
                  <strong style={{ flex: "1 1 120px" }}>{l.gradeName}</strong>
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color }}>{label}</span>
                  <span style={{ flexBasis: "100%", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                    {r.axes.map((a) => `${GRADUATION_AXIS_META[a.axis].label} ${a.newAvg != null ? a.newAvg.toLocaleString("pt-PT") : "–"}`).join(" · ")}
                  </span>
                </li>
              );
            })}
          </ul>
          <p style={{ margin: "var(--space-3) 0 0", fontSize: "var(--text-sm)" }}>
            {decided ? (
              <>
                Atribuído: <strong>{awarded?.name ?? "sem grau novo"}</strong>
                {placement.decisionNote && <span style={{ color: "var(--text-secondary)" }}> — «{placement.decisionNote}»</span>}
              </>
            ) : (
              <>
                Proposta: <strong>{proposed?.name ?? "sem grau novo"}</strong>{" "}
                <span style={{ color: "var(--text-secondary)" }}>(último grau cumprido seguido)</span>
                {event.status === "SCHEDULED" && (
                  <>
                    {" · "}
                    <Link href={`/coach/graduacao/${eventId}/avaliar/${candidateId}`} style={{ color: "var(--primary)", fontWeight: 600 }}>
                      Continuar a avaliar
                    </Link>
                  </>
                )}
              </>
            )}
          </p>
        </section>
      )}

      {!decided && !placement && (
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

      {placement && !decided && event.status === "SCHEDULED" && role === "ADMIN" && (
        <PlacementDecisionForm
          candidateId={candidateId}
          eventId={eventId}
          options={placement.result.levels.map((l) => ({ id: l.gradeId, name: l.gradeName, colors: l.colors }))}
          proposedId={proposed?.id ?? null}
          hasScores={result.scoredCount > 0}
        />
      )}
      {placement && !decided && event.status === "SCHEDULED" && role !== "ADMIN" && (
        <p style={{ marginTop: "var(--space-5)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
          Num nivelamento, o grau a atribuir é decidido pelo admin.
        </p>
      )}

      {!placement && !decided && event.status === "SCHEDULED" && (
        <DecisionForm candidateId={candidateId} eventId={eventId} canPass={result.passed} hasScores={result.scoredCount > 0} gradeName={sheet.targetGrade.name} />
      )}
    </div>
  );
}
