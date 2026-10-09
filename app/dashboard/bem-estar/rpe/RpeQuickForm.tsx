"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitRpeAction, type RpeFormState } from "../actions";
import { FormLoadingModal } from "@/components/FormLoadingModal";

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
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>RPE</span>
        <select
          name="rpe"
          required
          value={rpe}
          onChange={(e) => setRpe(Number(e.target.value))}
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
          }}
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
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
