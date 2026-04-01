"use client";

import { useFormState, useFormStatus } from "react-dom";
import { setAttendanceIntentionFromForm } from "./actions";

type Props = {
  lessonId: string;
  /** Data da ocorrência (YYYY-MM-DD), obrigatória com presenças por ocorrência. */
  occurrenceDate: string;
  currentStatus: string | undefined;
  checkedInAt: string | null;
  goingLabel: string;
  notGoingLabel: string;
  intentGoingLabel: string;
  checkInDoneLabel: string;
  statusConfirmedLabel: string;
  statusAbsentLabel: string;
};

/** Tem de estar dentro do <form> que dispara a action (useFormStatus). */
function PendingHint({ savingLabel }: { savingLabel: string }) {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <span style={{ fontSize: 13, color: "var(--text-secondary)", marginLeft: 4 }} aria-live="polite">
      {savingLabel}
    </span>
  );
}

export function VouNaoVouButtons({
  lessonId,
  occurrenceDate,
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
  const savingLabel = "A guardar…";

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
      <div style={{ marginTop: 4 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 600, color: "var(--primary)" }}>
          {intentGoingLabel}
        </span>
        <form action={formAction} style={{ display: "inline-flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 8 }}>
          <input type="hidden" name="lessonId" value={lessonId} />
          <input type="hidden" name="occurrenceDate" value={occurrenceDate} />
          <input type="hidden" name="intention" value="nao_vou" />
          <button
            type="submit"
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
          <PendingHint savingLabel={savingLabel} />
        </form>
        {state?.error && (
          <span style={{ display: "block", width: "100%", marginTop: 8, fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--danger)" }}>
            {state.error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <form action={formAction} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <input type="hidden" name="lessonId" value={lessonId} />
          <input type="hidden" name="occurrenceDate" value={occurrenceDate} />
          <input type="hidden" name="intention" value="vou" />
          <button
            type="submit"
            className="btn btn-success"
            style={{
              fontSize: "clamp(14px, 3.5vw, 16px)",
              minHeight: 44,
              padding: "0.5em 1em",
            }}
          >
            {goingLabel}
          </button>
          <PendingHint savingLabel={savingLabel} />
        </form>
        <form action={formAction} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <input type="hidden" name="lessonId" value={lessonId} />
          <input type="hidden" name="occurrenceDate" value={occurrenceDate} />
          <input type="hidden" name="intention" value="nao_vou" />
          <button
            type="submit"
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
          <PendingHint savingLabel={savingLabel} />
        </form>
      </div>
      {state?.error && (
        <span style={{ display: "block", width: "100%", marginTop: 8, fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--danger)" }}>
          {state.error}
        </span>
      )}
    </div>
  );
}
