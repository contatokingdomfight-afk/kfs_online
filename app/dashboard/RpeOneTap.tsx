"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2 } from "lucide-react";
import { submitRpeAction, type RpeFormState } from "./bem-estar/actions";

type Props = { attendanceId: string; subtitle: string; minutes: number; locale: "pt" | "en" };

function RpeButton({ n, picked, onPick }: { n: number; picked: number | null; onPick: (n: number) => void }) {
  const { pending } = useFormStatus();
  const active = picked === n;
  return (
    <button
      type="submit"
      name="rpe"
      value={n}
      disabled={pending}
      onClick={() => onPick(n)}
      aria-pressed={active}
      style={{
        minHeight: 44,
        borderRadius: 12,
        border: active ? "2px solid var(--text-primary)" : "1px solid var(--border)",
        background: active ? "var(--primary)" : "var(--bg)",
        color: active ? "#fff" : "var(--text-primary)",
        font: "inherit",
        fontSize: 15,
        fontWeight: 800,
        cursor: pending ? "wait" : "pointer",
      }}
    >
      {n}
    </button>
  );
}

/** Nota de esforço (1–10) num toque: cada número é um botão que submete o formulário. */
export function RpeOneTap({ attendanceId, subtitle, minutes, locale }: Props) {
  const pt = locale !== "en";
  const [picked, setPicked] = useState<number | null>(null);
  const [state, action] = useActionState(async (prev: RpeFormState, fd: FormData) => {
    const res = await submitRpeAction(prev, fd);
    return res ?? {};
  }, null as RpeFormState);
  const saved = state !== null && !state.error && picked != null;

  if (saved) {
    return (
      <div role="status" style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
        <CheckCircle2 size={22} color="var(--success)" aria-hidden />
        <span style={{ fontSize: 14, fontWeight: 700 }}>
          {pt ? `Guardado · carga ${picked * minutes}` : `Saved · load ${picked * minutes}`}
        </span>
      </div>
    );
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16, borderRadius: 18, border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
      <input type="hidden" name="attendanceId" value={attendanceId} />
      <div>
        <span style={{ display: "block", fontSize: 16, fontWeight: 800 }}>{pt ? "Como foi o treino?" : "How was training?"}</span>
        <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>{subtitle}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 6 }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <RpeButton key={n} n={n} picked={picked} onPick={setPicked} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>
        <span>{pt ? "Muito leve" : "Very light"}</span>
        <span>{pt ? "Duro" : "Hard"}</span>
        <span>{pt ? "Máximo" : "Max"}</span>
      </div>
      {state?.error ? <span style={{ fontSize: 13, color: "var(--danger)" }}>{state.error}</span> : null}
    </form>
  );
}
