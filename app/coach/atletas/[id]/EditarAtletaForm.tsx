"use client";

import { useFormState } from "react-dom";
import { updateAthlete, type UpdateAthleteResult } from "../actions";

type CoachOption = { id: string; name: string };

type Props = {
  athleteId: string;
  initialLevel: string;
  levelLabels: Record<string, string>;
  coaches?: CoachOption[];
  initialMainCoachId?: string | null;
};

export function EditarAtletaForm({ athleteId, initialLevel, levelLabels, coaches, initialMainCoachId }: Props) {
  const [state, formAction] = useFormState(updateAthlete, null as UpdateAthleteResult | null);

  return (
    <form
      action={formAction}
      className="card"
      style={{
        padding: "clamp(16px, 4vw, 20px)",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(12px, 3vw, 16px)",
      }}
    >
      <input type="hidden" name="athleteId" value={athleteId} />
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Nível
        </span>
        <select name="level" defaultValue={initialLevel} className="input">
          {(["INICIANTE", "INTERMEDIARIO", "AVANCADO"] as const).map((l) => (
            <option key={l} value={l}>
              {levelLabels[l] ?? l}
            </option>
          ))}
        </select>
      </label>
      {coaches && coaches.length > 0 && (
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
            Coach responsável
          </span>
          <select name="mainCoachId" defaultValue={initialMainCoachId ?? ""} className="input">
            <option value="">— Nenhum —</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {state?.error && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary">
        Guardar
      </button>
    </form>
  );
}
