"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Gauge } from "lucide-react";
import { setCoachRpeFromForm } from "./actions";

function RpeButton({ n }: { n: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="rpe"
      value={n}
      disabled={pending}
      className="btn btn-secondary"
      style={{ minWidth: 44, minHeight: 40, padding: "6px 0", fontWeight: 800 }}
    >
      {n}
    </button>
  );
}

/**
 * «Esforço da aula»: o coach dá uma nota de esforço (1–10) a todos os presentes que ainda não
 * a deram. Os alunos podem depois dar a sua (substitui esta e dá-lhes XP).
 */
export function CoachClassRpeBulk({
  lessonId,
  occurrenceDate,
  attendanceIds,
}: {
  lessonId: string;
  occurrenceDate: string;
  attendanceIds: string[];
}) {
  const [state, action] = useActionState(setCoachRpeFromForm, null as { error?: string; updated?: number } | null);

  return (
    <form
      action={action}
      style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, marginBottom: 16, borderRadius: 14, border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
    >
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="occurrenceDate" value={occurrenceDate} />
      {attendanceIds.map((id) => (
        <input key={id} type="hidden" name="attendanceId" value={id} />
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span aria-hidden style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 10, background: "rgba(250,204,21,0.16)", color: "#facc15", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Gauge size={20} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>Esforço da aula</span>
          <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)" }}>
            {attendanceIds.length} {attendanceIds.length === 1 ? "presente sem nota" : "presentes sem nota"} · quão dura foi a aula (1–10)?
          </span>
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <RpeButton key={n} n={n} />
        ))}
      </div>
      {state?.error ? <span style={{ fontSize: 13, color: "var(--danger)" }}>{state.error}</span> : null}
      {state && !state.error && state.updated != null ? (
        <span role="status" style={{ fontSize: 13, color: "var(--success)" }}>
          Aplicado a {state.updated} {state.updated === 1 ? "aluno" : "alunos"}.
        </span>
      ) : null}
      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
        Alimenta a carga de treino. Se o aluno der a sua própria nota, fica a dele (e ganha XP).
      </span>
    </form>
  );
}
