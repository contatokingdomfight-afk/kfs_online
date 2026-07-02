"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createFinancialExpense, type ExpenseActionResult } from "../actions";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS_PT } from "@/lib/retail/constants";
import { PaymentMethodSelect } from "@/components/admin/PaymentMethodSelect";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending} style={{ alignSelf: "flex-start" }}>
      {label}
    </button>
  );
}

type Labels = {
  kindField: string;
  kindFixed: string;
  kindVariable: string;
  categoryField: string;
  paymentMethod: string;
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
      const v = formRef.current?.querySelector<HTMLInputElement>('input[name="kind"][value="VARIABLE"]');
      if (v) v.checked = true;
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
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{labels.kindField}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 20px" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="radio" name="kind" value="FIXED" />
              <span>{labels.kindFixed}</span>
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="radio" name="kind" value="VARIABLE" defaultChecked />
              <span>{labels.kindVariable}</span>
            </label>
          </div>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{labels.categoryField}</span>
          <select name="category" className="input" defaultValue="OTHER">
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS_PT[c]}</option>
            ))}
          </select>
        </label>
        <PaymentMethodSelect label={labels.paymentMethod} />
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
