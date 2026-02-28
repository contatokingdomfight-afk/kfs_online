"use client";

import { useFormState } from "react-dom";
import { convertTrialToStudent, type ConvertTrialResult } from "./actions";

export function ConvertTrialButton({ trialId }: { trialId: string }) {
  const [state, formAction] = useFormState(convertTrialToStudent, null as ConvertTrialResult | null);

  return (
    <form action={formAction} style={{ marginTop: "clamp(8px, 2vw, 12px)" }}>
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
