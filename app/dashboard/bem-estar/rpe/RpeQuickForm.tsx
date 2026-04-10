"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitRpeAction, type RpeFormState } from "../actions";

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
  saveLabel: string;
};

export function RpeQuickForm({ attendanceId, modalityLabel, occurrenceDate, saveLabel }: Props) {
  const [state, action] = useFormState(submitRpeAction, null as RpeFormState);

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
          defaultValue={5}
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
      <SaveButton label={saveLabel} />
      {state?.error && (
        <span style={{ width: "100%", color: "var(--danger)", fontSize: "clamp(13px, 3.2vw, 14px)" }}>{state.error}</span>
      )}
    </form>
  );
}
