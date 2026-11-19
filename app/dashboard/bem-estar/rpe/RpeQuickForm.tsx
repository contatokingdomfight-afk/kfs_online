"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitRpeAction, type RpeFormState } from "../actions";
import { FormLoadingModal } from "@/components/FormLoadingModal";
import { RPE_LOAD_HINT, RPE_QUESTION, formatRpe } from "@/lib/rpe-labels";
import { RpeSlider, rpeScale } from "@/components/training-load/RpeSlider";

function SaveButton({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" style={{ fontSize: "clamp(13px, 3.2vw, 15px)" }} disabled={pending || disabled}>
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
  const [rpe, setRpe] = useState<number | null>(null);

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
      <div style={{ flex: "1 1 100%", display: "grid", gap: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>{pt ? RPE_QUESTION.pt : RPE_QUESTION.en}</span>
        <RpeSlider
          name="rpe"
          value={rpe}
          onChange={setRpe}
          pt={pt}
          ariaLabel={pt ? RPE_QUESTION.pt : RPE_QUESTION.en}
          emptyText={pt ? "Corpo e cabeça" : "Body and mind"}
          scale={rpeScale(pt)}
        />
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
        {loadLabel}:{" "}
        <b style={{ color: "var(--text-primary)" }}>{rpe == null ? "—" : `${formatRpe(rpe, pt)} × ${minutes} = ${Math.round(rpe * minutes)}`}</b>
      </span>
      <span style={{ width: "100%", fontSize: 12, color: "var(--text-secondary)" }}>
        {pt ? RPE_LOAD_HINT.pt : RPE_LOAD_HINT.en}
      </span>
      <SaveButton label={saveLabel} disabled={rpe == null} />
      <span id={`weight-hint-${attendanceId}`} style={{ width: "100%", fontSize: 12, color: "var(--text-secondary)" }}>
        {weightOptionalHint}
      </span>
      {state?.error && (
        <span style={{ width: "100%", color: "var(--danger)", fontSize: "clamp(13px, 3.2vw, 14px)" }}>{state.error}</span>
      )}
    </form>
  );
}
