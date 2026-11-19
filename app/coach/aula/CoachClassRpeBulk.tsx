"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Gauge } from "lucide-react";
import { FormLoadingModal } from "@/components/FormLoadingModal";
import { RpeSlider, rpeScale } from "@/components/training-load/RpeSlider";
import { setCoachRpeFromForm } from "./actions";

function ApplyButton({ n, disabled }: { n: number; disabled: boolean }) {
  const { pending } = useFormStatus();
  const off = disabled || pending;
  return (
    <button
      type="submit"
      disabled={off}
      className={off ? "btn btn-secondary" : "btn btn-primary"}
      style={{ minHeight: 48, fontWeight: 800 }}
    >
      Aplicar a {n} {n === 1 ? "aluno" : "alunos"}
    </button>
  );
}

/**
 * «Cansaço da turma»: o coach dá uma nota (1–10, meios pontos) a todos os presentes que ainda não
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
  const [rpe, setRpe] = useState<number | null>(null);

  return (
    <form
      action={action}
      style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, marginBottom: 16, borderRadius: 14, border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
    >
      <FormLoadingModal message="A guardar a nota…" />
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
          <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>Cansaço da turma</span>
          <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)" }}>
            {attendanceIds.length} {attendanceIds.length === 1 ? "presente sem nota" : "presentes sem nota"} · quão cansados saíram (corpo e cabeça)?
          </span>
        </span>
      </div>
      <RpeSlider name="rpe" value={rpe} onChange={setRpe} ariaLabel="Cansaço da turma" emptyText="Escolhe de 1 a 10" scale={rpeScale(true, true)} />
      <ApplyButton n={attendanceIds.length} disabled={rpe == null} />
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
