"use client";

import { useActionState } from "react";
import { convertTrialToStudent, type ConvertTrialResult } from "./actions";

export function ConvertTrialButton({ trialId }: { trialId: string }) {
  const [state, formAction] = useActionState(convertTrialToStudent, null as ConvertTrialResult | null);

  return (
    <form action={formAction} style={{ display: "inline-block" }}>
      <input type="hidden" name="trialId" value={trialId} />
      <button type="submit" className="btn btn-primary" style={{ fontSize: "clamp(13px, 3.2vw, 15px)" }}>
        Converter em aluno
      </button>
      {state?.error && (
        <p style={{ margin: "8px 0 0 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
    </form>
  );
}
