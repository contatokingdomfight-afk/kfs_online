"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateFinancialExpense, type ExpenseActionResult } from "../actions";
import type { FinancialExpenseRow } from "@/lib/admin-finance-overview";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS_PT } from "@/lib/retail/constants";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending} style={{ fontSize: 12, padding: "4px 10px" }}>
      {pending ? "…" : "Guardar"}
    </button>
  );
}

type Labels = {
  amount: string;
  description: string;
  date: string;
  kindField: string;
  kindFixed: string;
  kindVariable: string;
  categoryField: string;
};

export function EditExpenseForm({ expense, labels, onDone }: { expense: FinancialExpenseRow; labels: Labels; onDone?: () => void }) {
  const [state, action] = useFormState(updateFinancialExpense, null as ExpenseActionResult | null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) onDone?.();
  }, [state, onDone]);

  return (
    <form ref={ref} action={action} style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12, background: "var(--bg)", borderRadius: 8 }}>
      <input type="hidden" name="id" value={expense.id} />
      {state?.error && <p role="alert" style={{ color: "var(--error)", margin: 0, fontSize: 13 }}>{state.error}</p>}
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{labels.description}</span>
        <input name="description" defaultValue={expense.description} required className="input" />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{labels.amount}</span>
          <input name="amount" type="number" min="0" step="0.01" defaultValue={expense.amount} required className="input" />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{labels.date}</span>
          <input name="occurredOn" type="date" defaultValue={expense.occurredOn} required className="input" />
        </label>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{labels.categoryField}</span>
        <select name="category" className="input" defaultValue={expense.category}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS_PT[c]}</option>
          ))}
        </select>
      </label>
      <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
        <span style={{ color: "var(--text-secondary)" }}>{labels.kindField}</span>
        <label style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
          <input type="radio" name="kind" value="FIXED" defaultChecked={expense.kind === "FIXED"} />
          {labels.kindFixed}
        </label>
        <label style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
          <input type="radio" name="kind" value="VARIABLE" defaultChecked={expense.kind !== "FIXED"} />
          {labels.kindVariable}
        </label>
      </div>
      <SubmitBtn />
    </form>
  );
}
