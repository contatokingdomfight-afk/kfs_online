"use client";

import { useFormState } from "react-dom";
import { createGoal, updateGoal, type GoalActionResult } from "./actions";
import { formatDecimalAmountInput } from "@/lib/parse-decimal-amount";
import type { AdminBusinessGoalRow } from "@/lib/admin-business-goals";

type SchoolOption = { id: string; name: string };

type Props = {
  schools: SchoolOption[];
  goal?: AdminBusinessGoalRow;
};

export function AdminGoalForm({ schools, goal }: Props) {
  const isEdit = Boolean(goal);
  const action = isEdit ? updateGoal : createGoal;
  const [state, formAction] = useFormState(action, null as GoalActionResult | null);

  const targetDisplay =
    goal?.metricType === "MONETARY" ? formatDecimalAmountInput(goal.targetValue) : String(goal?.targetValue ?? "");

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
      {isEdit && <input type="hidden" name="goalId" value={goal!.id} />}
      {state?.error && <p style={{ margin: 0, color: "var(--danger)", fontSize: 14 }}>{state.error}</p>}
      {state?.success && <p style={{ margin: 0, color: "var(--primary)", fontSize: 14 }}>Guardado.</p>}

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontWeight: 500 }}>Título</span>
        <input type="text" name="title" className="input" required defaultValue={goal?.title ?? ""} />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontWeight: 500 }}>Descrição (opcional)</span>
        <textarea name="description" className="input" rows={3} defaultValue={goal?.description ?? ""} />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontWeight: 500 }}>Tipo</span>
        <select name="metricType" className="input" required defaultValue={goal?.metricType ?? "QUANTITY"}>
          <option value="QUANTITY">Quantidade</option>
          <option value="MONETARY">Monetária (€)</option>
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontWeight: 500 }}>Valor alvo</span>
        <input type="text" name="targetValue" className="input" required defaultValue={targetDisplay} inputMode="decimal" />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontWeight: 500 }}>Âmbito</span>
        <select name="schoolId" className="input" defaultValue={goal?.schoolId ?? "global"}>
          <option value="global">Global (toda a Kingdom Fight)</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontWeight: 500 }}>Data de início</span>
          <input
            type="date"
            name="startDate"
            className="input"
            required
            defaultValue={goal?.startDate?.slice(0, 10) ?? ""}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontWeight: 500 }}>Data para conclusão</span>
          <input
            type="date"
            name="targetEndDate"
            className="input"
            required
            defaultValue={goal?.targetEndDate?.slice(0, 10) ?? ""}
          />
        </label>
      </div>

      <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
        {isEdit ? "Guardar alterações" : "Criar meta"}
      </button>
    </form>
  );
}
