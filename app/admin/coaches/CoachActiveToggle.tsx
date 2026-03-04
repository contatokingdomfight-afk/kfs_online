"use client";

import { useFormState } from "react-dom";
import { setCoachActive } from "./actions";

export function CoachActiveToggle({ coachId, isActive }: { coachId: string; isActive: boolean }) {
  const [state, formAction] = useFormState(setCoachActive, null);

  return (
    <form action={formAction} style={{ flexShrink: 0 }}>
      <input type="hidden" name="coachId" value={coachId} />
      <input type="hidden" name="active" value={isActive ? "false" : "true"} />
      <button
        type="submit"
        className={isActive ? "btn btn-secondary" : "btn btn-primary"}
        style={{
          fontSize: "clamp(13px, 3.2vw, 15px)",
          padding: "8px 14px",
          minHeight: 40,
        }}
      >
        {isActive ? "Desativar" : "Ativar"}
      </button>
      {state?.error && (
        <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--danger)" }}>{state.error}</p>
      )}
    </form>
  );
}
