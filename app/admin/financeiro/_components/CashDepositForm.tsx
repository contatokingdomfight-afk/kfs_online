"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createCashDeposit, type CashDepositActionResult } from "../actions";

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
  date: string;
  description: string;
  submit: string;
  success: string;
  physicalCashHint: string;
};

export function CashDepositForm({
  defaultDate,
  physicalCashOnHand,
  labels,
}: {
  defaultDate: string;
  physicalCashOnHand: number;
  labels: Labels;
}) {
  const [state, formAction] = useFormState(createCashDeposit, null as CashDepositActionResult | null);
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
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "clamp(14px, 3.5vw, 18px)",
        background: "var(--bg)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
        {labels.physicalCashHint.replace("{amount}", physicalCashOnHand.toFixed(2))}
      </p>
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
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{labels.description}</span>
        <input
          name="description"
          type="text"
          className="input"
          defaultValue="Depósito de espécie na conta"
          autoComplete="off"
        />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{labels.amount}</span>
          <input name="amount" type="number" min="0.01" step="0.01" required className="input" />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{labels.date}</span>
          <input name="occurredOn" type="date" required defaultValue={defaultDate} className="input" />
        </label>
      </div>
      <SubmitButton label={labels.submit} />
    </form>
  );
}
