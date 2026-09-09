"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { coachCheckInStudentFromForm } from "./actions";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import type { CrossModalityCandidate } from "@/lib/coach-lesson-eligible-students";

type Props = {
  candidates: CrossModalityCandidate[];
  lessonId: string;
  occurrenceDate: string;
};

function CandidateRow({
  candidate,
  lessonId,
  occurrenceDate,
}: {
  candidate: CrossModalityCandidate;
  lessonId: string;
  occurrenceDate: string;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(coachCheckInStudentFromForm, null as { error?: string } | null);
  const label = candidate.name || candidate.email;
  const modalityLabel = candidate.primaryModality
    ? MODALITY_LABELS[candidate.primaryModality] ?? candidate.primaryModality
    : null;
  const confirmed = Boolean(state) && !state?.error;

  useEffect(() => {
    if (confirmed) router.refresh();
  }, [confirmed, router]);

  return (
    <li
      className="coach-attendance-row"
      style={{ alignItems: "center", flexWrap: "wrap", gap: 8 }}
    >
      <div className="coach-attendance-info">
        <div className="coach-attendance-head">
          <span className="coach-attendance-name">{label}</span>
          {modalityLabel && <span className="coach-attendance-email">Modalidade: {modalityLabel}</span>}
        </div>
      </div>
      {confirmed ? (
        <span className="coach-attendance-tag coach-attendance-tag--cross-modality">Presença marcada</span>
      ) : (
        <form action={formAction} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input type="hidden" name="lessonId" value={lessonId} readOnly />
          <input type="hidden" name="occurrenceDate" value={occurrenceDate} readOnly />
          <input type="hidden" name="studentId" value={candidate.studentId} readOnly />
          <input type="hidden" name="crossModality" value="true" readOnly />
          <button type="submit" className="btn btn-success">
            Check-in avulso
          </button>
        </form>
      )}
      {state?.error && (
        <span style={{ width: "100%", fontSize: "var(--text-sm)", color: "var(--danger)" }}>{state.error}</span>
      )}
    </li>
  );
}

export function CoachAulaCrossModalityCheckIn({ candidates, lessonId, occurrenceDate }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return candidates
      .filter((c) => (c.name ?? "").toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      .slice(0, 20);
  }, [candidates, query]);

  return (
    <div style={{ marginBottom: "clamp(16px, 4vw, 20px)" }}>
      <button type="button" className="btn btn-secondary" onClick={() => setOpen((v) => !v)}>
        {open ? "Fechar check-in avulso" : "+ Check-in avulso (aluno de outra modalidade)"}
      </button>
      {open && (
        <div
          style={{
            marginTop: 12,
            padding: "clamp(12px, 3vw, 16px)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            background: "var(--surface)",
          }}
        >
          <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Para alunos cujo plano não cobre esta modalidade (ex.: treino esporádico ao sábado). Conta na lista de
            presença desta aula e desconta do limite mensal do plano, se houver.
          </p>
          <input
            type="search"
            className="input"
            placeholder="Nome ou email do aluno"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
          {query.trim() && (
            <ul className="coach-aula-attendance-list" role="list" style={{ marginTop: 10 }}>
              {filtered.length === 0 ? (
                <li style={{ listStyle: "none", color: "var(--text-secondary)", fontSize: 14 }}>
                  Nenhum aluno encontrado.
                </li>
              ) : (
                filtered.map((c) => (
                  <CandidateRow key={c.studentId} candidate={c} lessonId={lessonId} occurrenceDate={occurrenceDate} />
                ))
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
