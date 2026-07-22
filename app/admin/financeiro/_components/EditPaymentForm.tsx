"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateAdminPayment, type PaymentActionResult } from "../actions";
import type { PaymentListRow } from "@/lib/admin-payment-list-grouping";
import { PaymentMethodSelect } from "@/components/admin/PaymentMethodSelect";
import type { FinancePaymentMethod } from "@/lib/finance-payment-method";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "…" : label}
    </button>
  );
}

export type EditPaymentFormLabels = {
  amount: string;
  status: string;
  statusPaid: string;
  statusLate: string;
  paymentMethod: string;
  submit: string;
  cancel: string;
};

type Props = {
  payment: PaymentListRow;
  labels: EditPaymentFormLabels;
  onDone?: () => void;
  onCancel?: () => void;
};

function defaultPaymentMethod(payment: PaymentListRow): FinancePaymentMethod {
  const m = payment.paymentMethod;
  if (m === "CASH" || m === "TRANSFER" || m === "MBWAY" || m === "DEPOSIT") return m;
  return "TRANSFER";
}

export function EditPaymentForm({ payment, labels, onDone, onCancel }: Props) {
  const [state, action] = useFormState(updateAdminPayment, null as PaymentActionResult | null);
  const ref = useRef<HTMLFormElement>(null);
  const isPaid = payment.status === "PAID";

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
      <input type="hidden" name="id" value={payment.id} />
      {state?.error && (
        <p role="alert" style={{ color: "var(--error)", margin: 0, fontSize: 14 }}>
          {state.error}
        </p>
      )}

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{labels.amount}</span>
        <input
          name="amount"
          type="number"
          min="0"
          step="0.01"
          defaultValue={payment.amount.toFixed(2)}
          required
          className="input mobile-form-field-scroll"
        />
      </label>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{labels.status}</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 20px" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="radio" name="status" value="PAID" defaultChecked={isPaid} />
            <span>{labels.statusPaid}</span>
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="radio" name="status" value="LATE" defaultChecked={!isPaid} />
            <span>{labels.statusLate}</span>
          </label>
        </div>
      </div>

      <PaymentMethodSelect
        label={labels.paymentMethod}
        defaultValue={defaultPaymentMethod(payment)}
        required={false}
      />

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
