"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitRpeAction, type RpeFormState } from "../actions";
import { FormLoadingModal } from "@/components/FormLoadingModal";
import { RPE_LOAD_HINT, rpeDescription } from "@/lib/rpe-labels";

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" style={{ fontSize: "clamp(13px, 3.2vw, 15px)" }} disabled={pending}>
      {pending ? "…" : label}
    </button>
  );
}

type Props = {
  attendanceId: string;
  modalityLabel: string;
  occurrenceDate: string;
  /** Duração da aula, para mostrar a carga (RPE × minutos). */
  minutes: number;
  loadLabel: string;
  pt?: boolean;
  saveLabel: string;
  savingLabel?: string;
  weightLabel: string;
  weightOptionalHint: string;
};

export function RpeQuickForm({
  attendanceId,
  modalityLabel,
  occurrenceDate,
  minutes,
  loadLabel,
  pt = true,
  saveLabel,
  savingLabel = "A guardar…",
  weightLabel,
  weightOptionalHint,
}: Props) {
  const [state, action] = useActionState(submitRpeAction, null as RpeFormState);
  const [rpe, setRpe] = useState(5);

  return (
    <form
      action={action}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
        padding: "12px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <FormLoadingModal message={savingLabel} />
      <input type="hidden" name="attendanceId" value={attendanceId} />
      <div style={{ flex: "1 1 200px" }}>
        <strong style={{ color: "var(--text-primary)" }}>{modalityLabel}</strong>
        <span style={{ color: "var(--text-secondary)", marginLeft: 8, fontSize: "clamp(13px, 3.2vw, 15px)" }}>
          {occurrenceDate}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>{pt ? "Esforço (RPE)" : "Effort (RPE)"}</span>
        <input type="hidden" name="rpe" value={rpe} />
        {/* Botões 1–10 em vez de <select>: o menu nativo ficava branco sobre branco no tema escuro. */}
        <span role="radiogroup" aria-label={pt ? "Esforço de 1 a 10" : "Effort from 1 to 10"} style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
            const on = n === rpe;
            const tone = n <= 3 ? "#4ade80" : n <= 6 ? "#fbbf24" : n <= 8 ? "#fb923c" : "#f87171";
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setRpe(n)}
                style={{
                  width: 32,
                  height: 34,
                  borderRadius: 8,
                  border: `1px solid ${on ? tone : "var(--border)"}`,
                  background: on ? tone : "var(--bg-elevated)",
                  color: on ? "#111" : "var(--text-primary)",
                  font: "inherit",
                  fontSize: 14,
                  fontWeight: on ? 800 : 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {n}
              </button>
            );
          })}
        </span>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 140px" }}>
        <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>{weightLabel}</span>
        <input
          type="number"
          name="postWeightKg"
          min={30}
          max={250}
          step={0.1}
          placeholder="—"
          aria-describedby={`weight-hint-${attendanceId}`}
          style={{
            width: 88,
            padding: "8px 10px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
          }}
        />
      </label>
      <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
        {loadLabel}: <b style={{ color: "var(--text-primary)" }}>{rpe} × {minutes} = {rpe * minutes}</b>
      </span>
      <span style={{ width: "100%", fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>
        {rpe} · {rpeDescription(rpe, pt)}
      </span>
      <span style={{ width: "100%", fontSize: 12, color: "var(--text-secondary)" }}>
        {pt ? RPE_LOAD_HINT.pt : RPE_LOAD_HINT.en}
      </span>
      <SaveButton label={saveLabel} />
      <span id={`weight-hint-${attendanceId}`} style={{ width: "100%", fontSize: 12, color: "var(--text-secondary)" }}>
        {weightOptionalHint}
      </span>
      {state?.error && (
        <span style={{ width: "100%", color: "var(--danger)", fontSize: "clamp(13px, 3.2vw, 14px)" }}>{state.error}</span>
      )}
    </form>
  );
}
