"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { HeartPulse } from "lucide-react";
import { QuickWellnessQuestions } from "@/components/QuickWellnessQuestions";
import { saveQuickWellnessAction, type QuickWellnessState } from "./wellness-actions";

const ZONE_TEXT = {
  GREEN: { pt: "Pronto para treinar", en: "Ready to train", color: "#4ade80" },
  YELLOW: { pt: "Atenção hoje: ouve o corpo", en: "Take care today: listen to your body", color: "#fbbf24" },
  RED: { pt: "Dia de recuperar: vai com calma", en: "Recovery day: take it easy", color: "#f87171" },
} as const;

function SaveButton({ disabled, label }: { disabled: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={disabled || pending} style={{ minHeight: 46, fontWeight: 800 }}>
      {pending ? "…" : label}
    </button>
  );
}

export function WellnessTodayForm({
  lessonId,
  occurrenceDate,
  subtitle,
  locale,
}: {
  lessonId: string;
  occurrenceDate: string;
  subtitle: string;
  locale: "pt" | "en";
}) {
  const pt = locale !== "en";
  const [answered, setAnswered] = useState(0);
  const [state, action] = useActionState(saveQuickWellnessAction, null as QuickWellnessState);

  if (state?.zone) {
    const z = ZONE_TEXT[state.zone];
    return (
      <div role="status" style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, border: `1px solid ${z.color}`, background: "var(--bg-secondary)" }}>
        <span aria-hidden style={{ width: 14, height: 14, borderRadius: 7, background: z.color, flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 700 }}>
          {pt ? "Obrigado! " : "Thanks! "}
          {pt ? z.pt : z.en}
        </span>
      </div>
    );
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14, padding: 16, borderRadius: 18, border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="occurrenceDate" value={occurrenceDate} />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span aria-hidden style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 12, background: "rgba(74,222,128,0.16)", color: "#4ade80", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <HeartPulse size={20} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 16, fontWeight: 800 }}>{pt ? "Como estás hoje?" : "How are you today?"}</span>
          <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>{subtitle}</span>
        </span>
      </div>
      <QuickWellnessQuestions locale={locale} onAnsweredChange={setAnswered} />
      {state?.error ? <span style={{ fontSize: 13, color: "var(--danger)" }}>{state.error}</span> : null}
      <SaveButton disabled={answered < 3} label={answered < 3 ? (pt ? `Responde às 3 (${answered}/3)` : `Answer all 3 (${answered}/3)`) : pt ? "Guardar" : "Save"} />
    </form>
  );
}
