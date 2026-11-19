"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { FormLoadingModal } from "@/components/FormLoadingModal";
import { RpeSlider, rpeScale } from "@/components/training-load/RpeSlider";
import { submitRpeAction, type RpeFormState } from "./bem-estar/actions";
import { RPE_PERSONAL_HINT, RPE_QUESTION } from "@/lib/rpe-labels";

type Props = {
  attendanceId: string;
  subtitle: string;
  /** «Aula tática», se o coach marcou o foco. */
  focusLabel?: string | null;
  minutes: number;
  xpReward: number;
  locale: "pt" | "en";
};

function SaveButton({ disabled, pt }: { disabled: boolean; pt: boolean }) {
  const { pending } = useFormStatus();
  const off = disabled || pending;
  return (
    <button
      type="submit"
      disabled={off}
      style={{
        minHeight: 48,
        border: 0,
        borderRadius: 12,
        background: off ? "var(--border)" : "var(--primary)",
        color: off ? "var(--text-secondary)" : "#fff",
        font: "inherit",
        fontSize: 15,
        fontWeight: 800,
        cursor: off ? "not-allowed" : "pointer",
      }}
    >
      {pt ? "Guardar" : "Save"}
    </button>
  );
}

/** «Quão cansado saíste do treino?»: slider 1–10 em meios pontos + Guardar. */
export function RpeOneTap({ attendanceId, subtitle, focusLabel, minutes, xpReward, locale }: Props) {
  const pt = locale !== "en";
  const [rpe, setRpe] = useState<number | null>(null);
  const [state, action] = useActionState(async (prev: RpeFormState, fd: FormData) => {
    const res = await submitRpeAction(prev, fd);
    return res ?? {};
  }, null as RpeFormState);
  const saved = state !== null && !state.error && rpe != null;

  if (saved) {
    return (
      <div role="status" style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
        <CheckCircle2 size={22} color="var(--success)" aria-hidden />
        <span style={{ fontSize: 14, fontWeight: 700 }}>
          {pt ? `Guardado · carga ${Math.round(rpe * minutes)}` : `Saved · load ${Math.round(rpe * minutes)}`}
          {xpReward > 0 ? <span style={{ marginLeft: 8, color: "var(--primary)" }}>+{xpReward} XP</span> : null}
        </span>
      </div>
    );
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, borderRadius: 18, border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
      <FormLoadingModal message={pt ? "A guardar a tua nota…" : "Saving your rating…"} />
      <input type="hidden" name="attendanceId" value={attendanceId} />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 16, fontWeight: 800 }}>{pt ? RPE_QUESTION.pt : RPE_QUESTION.en}</span>
          <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
            {subtitle}
            {focusLabel ? (
              <span style={{ marginLeft: 6, padding: "1px 8px", borderRadius: 999, background: "rgba(167,139,250,.15)", color: "#a78bfa", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }}>
                {focusLabel}
              </span>
            ) : null}
          </span>
        </span>
        {xpReward > 0 ? (
          <span style={{ flexShrink: 0, padding: "3px 9px", borderRadius: 999, background: "var(--primary)", color: "#fff", fontSize: 12, fontWeight: 800 }}>+{xpReward} XP</span>
        ) : null}
      </div>
      <RpeSlider
        name="rpe"
        value={rpe}
        onChange={setRpe}
        pt={pt}
        ariaLabel={pt ? RPE_QUESTION.pt : RPE_QUESTION.en}
        emptyText={pt ? "Corpo e cabeça: esforço, concentração, decisões" : "Body and mind: effort, focus, decisions"}
        scale={rpeScale(pt)}
      />
      <SaveButton disabled={rpe == null} pt={pt} />
      <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
        {pt ? RPE_PERSONAL_HINT.pt : RPE_PERSONAL_HINT.en}{" "}
        <Link href="/dashboard/bem-estar/rpe?info=1#o-que-e-rpe" style={{ color: "var(--text-primary)", fontWeight: 700, textDecoration: "underline", whiteSpace: "nowrap" }}>
          {pt ? "O que é isto?" : "What is this?"}
        </Link>
      </span>
      {state?.error ? <span style={{ fontSize: 13, color: "var(--danger)" }}>{state.error}</span> : null}
    </form>
  );
}
