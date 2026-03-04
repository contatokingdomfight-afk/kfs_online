"use client";

import { useFormState } from "react-dom";
import { acceptTrialRequest, type AcceptTrialResult } from "./actions";

export function AcceptTrialButton({ trialId }: { trialId: string }) {
  const [state, formAction] = useFormState(acceptTrialRequest, null as AcceptTrialResult | null);

  return (
    <form action={formAction} style={{ display: "inline-block", marginRight: 8 }}>
      <input type="hidden" name="trialId" value={trialId} />
      <button type="submit" className="btn" style={{ fontSize: "clamp(13px, 3.2vw, 15px)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}>
        Aceitar pedido
      </button>
      {state?.error && (
        <p style={{ margin: "4px 0 0 0", fontSize: "clamp(12px, 3vw, 14px)", color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
    </form>
  );
}
