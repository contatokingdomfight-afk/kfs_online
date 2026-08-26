"use client";

import type { CSSProperties } from "react";
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
  intentGoingTitle: string;
  intentGoingHint: string;
  checkInDoneLabel: string;
  statusConfirmedLabel: string;
  statusAbsentLabel: string;
};

/** Cartão semitransparente sobre o bloco «próxima aula» (fundo primário). */
const promoPanel: CSSProperties = {
  padding: "14px 16px",
  borderRadius: 14,
  background: "rgba(255, 255, 255, 0.14)",
  border: "1px solid rgba(255, 255, 255, 0.32)",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
};

const textOnPromo = { title: "#fff" as const };

function CheckIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="var(--success)" />
      <path
        d="M8 12.5l2.5 2.5L16 9"
        stroke="#fff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Tem de estar dentro do <form> que dispara a action (useFormStatus). */
function PendingHint({ savingLabel }: { savingLabel: string }) {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginLeft: 4 }} aria-live="polite">
      {savingLabel}
    </span>
  );
}

const btnNotGoingOnPromo: CSSProperties = {
  fontSize: "clamp(14px, 3.5vw, 16px)",
  minHeight: 44,
  padding: "0.5em 1.1em",
  backgroundColor: "rgba(255,255,255,0.14)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.45)",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
  fontWeight: 500,
};

export function VouNaoVouButtons({
  lessonId,
  occurrenceDate,
  currentStatus,
  checkedInAt,
  goingLabel,
  notGoingLabel,
  intentGoingTitle,
  intentGoingHint,
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
      <div style={{ ...promoPanel, background: "rgba(34, 197, 94, 0.18)", border: "1px solid rgba(255,255,255,0.35)" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ flexShrink: 0, paddingTop: 2 }}>
            <CheckIcon />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "clamp(14px, 3.5vw, 16px)",
              fontWeight: 600,
              color: "#fff",
              lineHeight: 1.45,
            }}
          >
            {label}
          </p>
        </div>
      </div>
    );
  }
  if (currentStatus === "ABSENT") {
    return (
      <div style={{ ...promoPanel, background: "rgba(0, 0, 0, 0.12)", border: "1px solid rgba(255,255,255,0.22)" }}>
        <p
          style={{
            margin: 0,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontWeight: 500,
            color: "rgba(255,255,255,0.88)",
            lineHeight: 1.45,
          }}
        >
          {statusAbsentLabel}
        </p>
      </div>
    );
  }
  if (currentStatus === "PENDING") {
    return (
      <div style={{ marginTop: 4 }} title={intentGoingHint}>
        <div style={promoPanel}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
              <div style={{ flexShrink: 0 }}>
                <CheckIcon />
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontWeight: 600,
                  color: textOnPromo.title,
                  lineHeight: 1.3,
                }}
              >
                {intentGoingTitle}
              </p>
            </div>
            <form action={formAction} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <input type="hidden" name="lessonId" value={lessonId} />
              <input type="hidden" name="occurrenceDate" value={occurrenceDate} />
              <input type="hidden" name="intention" value="nao_vou" />
              <button
                type="submit"
                style={{ ...btnNotGoingOnPromo, minHeight: 36, padding: "0.4em 0.9em", fontSize: "clamp(13px, 3.2vw, 14px)" }}
              >
                {notGoingLabel}
              </button>
              <PendingHint savingLabel={savingLabel} />
            </form>
          </div>
        </div>
        {state?.error && (
          <span
            style={{
              display: "block",
              width: "100%",
              marginTop: 8,
              fontSize: "clamp(13px, 3.2vw, 15px)",
              color: "#fecaca",
            }}
          >
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
          <button type="submit" style={btnNotGoingOnPromo}>
            {notGoingLabel}
          </button>
          <PendingHint savingLabel={savingLabel} />
        </form>
      </div>
      {state?.error && (
        <span
          style={{
            display: "block",
            width: "100%",
            marginTop: 8,
            fontSize: "clamp(13px, 3.2vw, 15px)",
            color: "#fecaca",
          }}
        >
          {state.error}
        </span>
      )}
    </div>
  );
}
