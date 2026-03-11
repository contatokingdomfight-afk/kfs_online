"use client";

import { useFormState } from "react-dom";
import { setAttendanceIntentionFromForm } from "./actions";

type Props = {
  lessonId: string;
  currentStatus: string | undefined;
  checkedInAt: string | null;
  goingLabel: string;
  notGoingLabel: string;
  intentGoingLabel: string;
  checkInDoneLabel: string;
  statusConfirmedLabel: string;
  statusAbsentLabel: string;
};

export function VouNaoVouButtons({
  lessonId,
  currentStatus,
  checkedInAt,
  goingLabel,
  notGoingLabel,
  intentGoingLabel,
  checkInDoneLabel,
  statusConfirmedLabel,
  statusAbsentLabel,
}: Props) {
  const [state, formAction] = useFormState(setAttendanceIntentionFromForm, null as { error?: string } | null);

  if (currentStatus === "CONFIRMED") {
    const label = checkedInAt
      ? checkInDoneLabel.replace(
          "{time}",
          new Date(checkedInAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
        )
      : statusConfirmedLabel;
    return (
      <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 600, color: "var(--success)" }}>
        {label}
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
  if (currentStatus === "PENDING") {
    return (
      <form action={formAction} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 4 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 600, color: "var(--primary)" }}>
          {intentGoingLabel}
        </span>
        <input type="hidden" name="lessonId" value={lessonId} />
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
