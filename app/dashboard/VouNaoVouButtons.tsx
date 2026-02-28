"use client";

import { useFormState } from "react-dom";
import { setAttendanceIntentionFromForm } from "./actions";

type Props = {
  lessonId: string;
  currentStatus: string | undefined;
  goingLabel: string;
  notGoingLabel: string;
  statusConfirmedLabel: string;
  statusAbsentLabel: string;
  statusPendingLabel: string;
};

export function VouNaoVouButtons({
  lessonId,
  currentStatus,
  goingLabel,
  notGoingLabel,
  statusConfirmedLabel,
  statusAbsentLabel,
  statusPendingLabel,
}: Props) {
  const [state, formAction] = useFormState(setAttendanceIntentionFromForm, null as { error?: string } | null);

  if (currentStatus === "CONFIRMED") {
    return (
      <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 600, color: "var(--success)" }}>
        {statusConfirmedLabel}
      </span>
    );
  }
  if (currentStatus === "ABSENT") {
    return (
      <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-secondary)" }}>
        {statusAbsentLabel}
      </span>
    );
  }

  return (
    <form action={formAction} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 4 }}>
      <input type="hidden" name="lessonId" value={lessonId} />
      <button
        type="submit"
        name="intention"
        value="vou"
        className="btn btn-success"
        style={{
          fontSize: "clamp(14px, 3.5vw, 16px)",
          minHeight: 44,
          padding: "0.5em 1em",
        }}
      >
        {goingLabel}
      </button>
      <button
        type="submit"
        name="intention"
        value="nao_vou"
        className="btn"
        style={{
          fontSize: "clamp(14px, 3.5vw, 16px)",
          minHeight: 44,
          padding: "0.5em 1em",
          backgroundColor: "var(--bg-secondary)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border)",
        }}
      >
        {notGoingLabel}
      </button>
      {state?.error && (
        <span style={{ width: "100%", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--danger)" }}>
          {state.error}
        </span>
      )}
    </form>
  );
}
