"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitBodyWeightAction, updateWeightGoalsAction, type SimpleFormState } from "../actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "…" : label}
    </button>
  );
}

type Props = {
  locale: "pt" | "en";
  currentGoalKg: number | null;
  currentGoalDate: string | null;
};

export function WeightEntryForm({ locale }: Pick<Props, "locale">) {
  const [state, action] = useFormState(submitBodyWeightAction, null as SimpleFormState);
  return (
    <form
      action={action}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        background: "var(--bg-elevated)",
      }}
    >
      <h2 style={{ fontSize: "clamp(16px, 4vw, 18px)", margin: 0, color: "var(--text-primary)" }}>
        {locale === "pt" ? "Novo registo de peso" : "New weight entry"}
      </h2>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>kg</span>
        <input
          name="weightKg"
          type="number"
          step={0.1}
          min={30}
          max={250}
          required
          style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>{locale === "pt" ? "Notas (opcional)" : "Notes (optional)"}</span>
        <input
          name="notes"
          type="text"
          maxLength={300}
          style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}
        />
      </label>
      {state?.error && <p style={{ color: "var(--danger)", margin: 0 }}>{state.error}</p>}
      <Submit label={locale === "pt" ? "Guardar" : "Save"} />
    </form>
  );
}

export function WeightGoalsForm({ locale, currentGoalKg, currentGoalDate }: Props) {
  const [state, action] = useFormState(updateWeightGoalsAction, null as SimpleFormState);
  return (
    <form
      action={action}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        background: "var(--bg-elevated)",
      }}
    >
      <h2 style={{ fontSize: "clamp(16px, 4vw, 18px)", margin: 0, color: "var(--text-primary)" }}>
        {locale === "pt" ? "Meta de peso" : "Weight goal"}
      </h2>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>{locale === "pt" ? "Objetivo (kg)" : "Target (kg)"}</span>
        <input
          name="weightGoalKg"
          type="number"
          step={0.1}
          min={30}
          max={250}
          defaultValue={currentGoalKg ?? ""}
          placeholder="—"
          style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>{locale === "pt" ? "Data alvo (opcional)" : "Target date (optional)"}</span>
        <input
          name="weightGoalTargetDate"
          type="date"
          defaultValue={currentGoalDate ?? ""}
          style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}
        />
      </label>
      {state?.error && <p style={{ color: "var(--danger)", margin: 0 }}>{state.error}</p>}
      <Submit label={locale === "pt" ? "Atualizar meta" : "Update goal"} />
    </form>
  );
}
