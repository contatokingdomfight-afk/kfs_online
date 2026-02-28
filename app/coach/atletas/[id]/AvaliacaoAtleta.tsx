"use client";

import { useFormState } from "react-dom";
import { createEvaluation, type CreateEvaluationResult } from "../actions";
import { RADAR_LABELS } from "@/lib/performance-utils";

const SCORES = [1, 2, 3, 4, 5];

type Props = {
  athleteId: string;
};

export function AvaliacaoAtleta({ athleteId }: Props) {
  const [state, formAction] = useFormState(createEvaluation, null as CreateEvaluationResult | null);

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
      <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 600, color: "var(--text-primary)" }}>
        Nova avaliação (1–5)
      </p>
      {(["gas", "technique", "strength", "theory"] as const).map((key) => (
        <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
            {RADAR_LABELS[key]}
          </span>
          <select name={key} className="input" defaultValue="3" required style={{ minHeight: 44 }}>
            {SCORES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      ))}
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
          Nota (opcional)
        </span>
        <textarea
          name="note"
          className="input"
          placeholder="Observações sobre esta avaliação..."
          rows={2}
          style={{ resize: "vertical", minHeight: 56 }}
        />
      </label>
      {state?.error && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>{state.error}</p>
      )}
      <button type="submit" className="btn btn-primary" style={{ minHeight: 44 }}>
        Guardar avaliação
      </button>
    </form>
  );
}
