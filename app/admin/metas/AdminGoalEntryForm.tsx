"use client";

import { useFormState } from "react-dom";
import { addGoalEntry, type GoalActionResult } from "./actions";
import type { AdminGoalMetricType } from "@/lib/admin-business-goals";

type Props = {
  goalId: string;
  metricType: AdminGoalMetricType;
  disabled?: boolean;
};

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function AdminGoalEntryForm({ goalId, metricType, disabled }: Props) {
  const [state, formAction] = useFormState(addGoalEntry, null as GoalActionResult | null);

  return (
    <form action={formAction} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Registar lançamento</h3>
      <input type="hidden" name="goalId" value={goalId} />
      {state?.error && <p style={{ margin: 0, color: "var(--danger)", fontSize: 14 }}>{state.error}</p>}
      {state?.success && <p style={{ margin: 0, color: "var(--primary)", fontSize: 14 }}>Lançamento registado.</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            Valor {metricType === "MONETARY" ? "(€)" : ""}
          </span>
          <input
            type="text"
            name="deltaValue"
            className="input"
            required
            disabled={disabled}
            placeholder={metricType === "MONETARY" ? "100,00" : "10"}
            inputMode="decimal"
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Data</span>
          <input type="date" name="recordedAt" className="input" required defaultValue={todayIso()} disabled={disabled} />
        </label>
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>Nota (opcional)</span>
        <input type="text" name="note" className="input" disabled={disabled} placeholder="Ex.: novos alunos de julho" />
      </label>

      <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }} disabled={disabled}>
        Adicionar lançamento
      </button>
      <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
        Valores negativos corrigem lançamentos anteriores.
      </p>
    </form>
  );
}
