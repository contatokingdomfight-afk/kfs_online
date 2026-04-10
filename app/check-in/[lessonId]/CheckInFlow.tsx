"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { useMemo } from "react";
import { submitCheckInAction, type CheckInFormState } from "./actions";

type Labels = {
  title: string;
  intro: string;
  sleepHours: string;
  sleepQuality: string;
  hydration: string;
  hydrationYes: string;
  stress: string;
  fatigue: string;
  lowHigh: string;
  skipQuestionnaire: string;
  submitWithWellness: string;
  backDashboard: string;
  thankYou: string;
  confirmedAt: string;
  zoneGreen: string;
  zoneYellow: string;
  zoneRed: string;
  wellnessHint: string;
};

function SubmitRow({ labels }: { labels: Labels }) {
  const { pending } = useFormStatus();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
      <button type="submit" name="intent" value="wellness" className="btn btn-primary" disabled={pending}>
        {pending ? "…" : labels.submitWithWellness}
      </button>
      <button
        type="submit"
        formNoValidate
        name="skipWellness"
        value="1"
        className="btn btn-secondary"
        disabled={pending}
        style={{ fontSize: "clamp(14px, 3.5vw, 16px)" }}
      >
        {labels.skipQuestionnaire}
      </button>
    </div>
  );
}

type Props = {
  lessonId: string;
  occurrenceDate: string;
  labels: Labels;
  locale: "pt" | "en";
};

export function CheckInFlow({ lessonId, occurrenceDate, labels, locale }: Props) {
  const initial = useMemo(() => null as CheckInFormState, []);
  const [state, formAction] = useFormState(submitCheckInAction, initial);

  const scale = useMemo(
    () => [
      { v: 1, l: "1" },
      { v: 2, l: "2" },
      { v: 3, l: "3" },
      { v: 4, l: "4" },
      { v: 5, l: "5" },
    ],
    []
  );

  if (state?.checkedInAt) {
    const timeStr = new Date(state.checkedInAt).toLocaleTimeString(locale === "en" ? "en-GB" : "pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <div className="container-mobile" style={{ paddingTop: "clamp(24px, 6vw, 32px)", textAlign: "center" }}>
        <h1 className="text-mobile-lg" style={{ color: "var(--success)", marginBottom: 12 }}>
          {locale === "pt" ? "Check-in confirmado" : "Check-in confirmed"}
        </h1>
        <p className="text-mobile-base" style={{ color: "var(--text-secondary)", marginBottom: 8 }}>
          {labels.confirmedAt.replace("{time}", timeStr)}
        </p>
        <p className="text-mobile-sm" style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
          {labels.thankYou}
        </p>
        <Link href="/dashboard" className="btn btn-primary">
          {labels.backDashboard}
        </Link>
      </div>
    );
  }

  return (
    <div className="container-mobile" style={{ paddingTop: "clamp(24px, 6vw, 32px)", maxWidth: 480, margin: "0 auto" }}>
      <h1 className="text-mobile-lg" style={{ color: "var(--text-primary)", marginBottom: 8 }}>
        {labels.title}
      </h1>
      <p className="text-mobile-base" style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
        {labels.intro}
      </p>
      <p className="text-mobile-sm" style={{ color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
        {labels.wellnessHint}
      </p>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <input type="hidden" name="lessonId" value={lessonId} />
        <input type="hidden" name="occurrenceDate" value={occurrenceDate} />

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: "clamp(14px, 3.5vw, 16px)" }}>{labels.sleepHours}</span>
          <input
            name="sleepHours"
            type="number"
            min={0}
            max={24}
            step={0.5}
            defaultValue={7}
            required
            className="input-mobile"
            style={{ padding: "12px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}
          />
        </label>

        <div>
          <span style={{ fontWeight: 600, fontSize: "clamp(14px, 3.5vw, 16px)", display: "block", marginBottom: 8 }}>
            {labels.sleepQuality}
          </span>
          <span className="text-mobile-sm" style={{ color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>
            {labels.lowHigh}
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {scale.map((s) => (
              <label
                key={s.v}
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  background: "var(--bg-elevated)",
                }}
              >
                <input type="radio" name="sleepQuality" value={s.v} required defaultChecked={s.v === 4} /> {s.l}
              </label>
            ))}
          </div>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: "clamp(14px, 3.5vw, 16px)" }}>{labels.hydration}</span>
          <select
            name="hydrationOk"
            defaultValue="1"
            className="input-mobile"
            style={{ padding: "12px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}
          >
            <option value="1">{labels.hydrationYes}</option>
            <option value="0">{locale === "pt" ? "Não / pouco" : "No / low"}</option>
          </select>
        </label>

        <div>
          <span style={{ fontWeight: 600, fontSize: "clamp(14px, 3.5vw, 16px)", display: "block", marginBottom: 8 }}>
            {labels.stress}
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {scale.map((s) => (
              <label
                key={`st-${s.v}`}
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                }}
              >
                <input type="radio" name="stress" value={s.v} required defaultChecked={s.v === 2} /> {s.l}
              </label>
            ))}
          </div>
        </div>

        <div>
          <span style={{ fontWeight: 600, fontSize: "clamp(14px, 3.5vw, 16px)", display: "block", marginBottom: 8 }}>
            {labels.fatigue}
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {scale.map((s) => (
              <label
                key={`ft-${s.v}`}
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                }}
              >
                <input type="radio" name="fatigue" value={s.v} required defaultChecked={s.v === 2} /> {s.l}
              </label>
            ))}
          </div>
        </div>

        {state?.error && (
          <p style={{ color: "var(--danger)", fontSize: "clamp(14px, 3.5vw, 16px)", margin: 0 }}>{state.error}</p>
        )}

        <SubmitRow labels={labels} />
      </form>

      <p className="text-mobile-sm" style={{ marginTop: 24, color: "var(--text-secondary)", textAlign: "center" }}>
        {labels.zoneGreen} · {labels.zoneYellow} · {labels.zoneRed}
      </p>

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <Link href="/dashboard" className="btn btn-secondary" style={{ display: "inline-block" }}>
          {labels.backDashboard}
        </Link>
      </div>
    </div>
  );
}
