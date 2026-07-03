"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateFinancialExpense, type ExpenseActionResult } from "../actions";
import type { FinancialExpenseRow } from "@/lib/admin-finance-overview";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS_PT } from "@/lib/retail/constants";
import { PaymentMethodSelect } from "@/components/admin/PaymentMethodSelect";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "…" : label}
    </button>
  );
}

export type EditExpenseFormLabels = {
  amount: string;
  description: string;
  date: string;
  kindField: string;
  kindFixed: string;
  kindVariable: string;
  categoryField: string;
  paymentMethod: string;
  submit: string;
  cancel: string;
};

type Props = {
  expense: FinancialExpenseRow;
  labels: EditExpenseFormLabels;
  onDone?: () => void;
  onCancel?: () => void;
};

export function EditExpenseForm({ expense, labels, onDone, onCancel }: Props) {
  const [state, action] = useFormState(updateFinancialExpense, null as ExpenseActionResult | null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) onDone?.();
  }, [state, onDone]);

  return (
    <form
      ref={ref}
      action={action}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <input type="hidden" name="id" value={expense.id} />
      {state?.error && (
        <p role="alert" style={{ color: "var(--error)", margin: 0, fontSize: 14 }}>
          {state.error}
        </p>
      )}

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{labels.description}</span>
        <input name="description" defaultValue={expense.description} required className="input mobile-form-field-scroll" />
      </label>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{labels.kindField}</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 20px" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="radio" name="kind" value="FIXED" defaultChecked={expense.kind === "FIXED"} />
            <span>{labels.kindFixed}</span>
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="radio" name="kind" value="VARIABLE" defaultChecked={expense.kind !== "FIXED"} />
            <span>{labels.kindVariable}</span>
          </label>
        </div>
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{labels.categoryField}</span>
        <select name="category" className="input mobile-form-field-scroll" defaultValue={expense.category}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {EXPENSE_CATEGORY_LABELS_PT[c]}
            </option>
          ))}
        </select>
      </label>

      <PaymentMethodSelect label={labels.paymentMethod} defaultValue={expense.paymentMethod ?? "CASH"} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 12,
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{labels.amount}</span>
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={expense.amount}
            required
            className="input mobile-form-field-scroll"
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{labels.date}</span>
          <input
            name="occurredOn"
            type="date"
            defaultValue={expense.occurredOn}
            required
            className="input mobile-form-field-scroll"
          />
        </label>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
        <SubmitButton label={labels.submit} />
        {onCancel ? (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {labels.cancel}
          </button>
        ) : null}
      </div>
    </form>
  );
}
