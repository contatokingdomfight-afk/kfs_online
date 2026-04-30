"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createFinancialExpense, type ExpenseActionResult } from "../actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending} style={{ alignSelf: "flex-start" }}>
      {label}
    </button>
  );
}

type Labels = {
  amount: string;
  description: string;
  date: string;
  submit: string;
  success: string;
};

export function AddExpenseForm({ defaultDate, labels }: { defaultDate: string; labels: Labels }) {
  const [state, formAction] = useFormState(createFinancialExpense, null as ExpenseActionResult | null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      const dateInput = formRef.current?.querySelector<HTMLInputElement>('input[name="occurredOn"]');
      if (dateInput) dateInput.value = defaultDate;
    }
  }, [state, defaultDate]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="card"
      style={{
        padding: "clamp(16px, 4vw, 20px)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        marginBottom: "clamp(20px, 5vw, 24px)",
      }}
    >
      {state?.error && (
        <p role="alert" style={{ color: "var(--error)", margin: 0, fontSize: 14 }}>
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" style={{ color: "var(--success)", margin: 0, fontSize: 14 }}>
          {labels.success}
        </p>
      )}

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(0, 1fr)" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{labels.description}</span>
          <input
            name="description"
            type="text"
            required
            autoComplete="off"
            className="input"
            style={{ maxWidth: "100%" }}
          />
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 12,
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{labels.amount}</span>
            <input name="amount" type="number" min="0" step="0.01" required className="input" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{labels.date}</span>
            <input name="occurredOn" type="date" required defaultValue={defaultDate} className="input" />
          </label>
        </div>
      </div>
      <SubmitButton label={labels.submit} />
    </form>
  );
}
