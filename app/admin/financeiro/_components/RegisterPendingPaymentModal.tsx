"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useFormState, useFormStatus } from "react-dom";
import { markPendingPaymentPaid, type MarkPendingPaymentPaidResult } from "../actions";
import { PaymentMethodSelect } from "@/components/admin/PaymentMethodSelect";

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 10050,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  overflow: "auto",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "A guardar…" : "Confirmar pagamento"}
    </button>
  );
}

type Props = {
  paymentId: string;
  studentName: string;
  paymentTypeLabel: string;
  /** Ex.: "08/2026" (mensalidade), "Seguro 2026", "Matrícula". */
  periodLabel: string;
  amount: number;
  familyDiscountPercent?: number | null;
  buttonLabel?: string;
  buttonClassName?: string;
};

export function RegisterPendingPaymentModal({
  paymentId,
  studentName,
  paymentTypeLabel,
  periodLabel,
  amount,
  familyDiscountPercent,
  buttonLabel = "Registar pagamento",
  buttonClassName = "btn btn-primary",
}: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(markPendingPaymentPaid, null as MarkPendingPaymentPaidResult | null);
  const titleId = useId();

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  return (
    <>
      <button type="button" className={buttonClassName} style={{ fontSize: 14 }} onClick={() => setOpen(true)}>
        {buttonLabel}
      </button>
      {open &&
        createPortal(
          <div
            style={overlayStyle}
            role="presentation"
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <div
              className="card"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 380, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div>
                  <h2 id={titleId} style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>
                    Registar pagamento
                  </h2>
                  <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                    {studentName} · {paymentTypeLabel} · {periodLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Fechar"
                  className="btn btn-secondary"
                  style={{ padding: "4px 10px", fontSize: 14 }}
                >
                  ×
                </button>
              </div>

              <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <input type="hidden" name="paymentId" value={paymentId} />
                {state?.error && (
                  <p role="alert" style={{ color: "var(--error)", margin: 0, fontSize: 14 }}>
                    {state.error}
                  </p>
                )}
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Valor (€)</span>
                  <input
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={amount.toFixed(2)}
                    required
                    className="input mobile-form-field-scroll"
                  />
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    Podes colocar 0 em mensalidades promocionais ou isenções.
                  </span>
                </label>
                {familyDiscountPercent != null && familyDiscountPercent > 0 && (
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
                    Inclui desconto de plano família de {familyDiscountPercent}% (já refletido no valor acima).
                  </p>
                )}
                <PaymentMethodSelect label="Forma de pagamento" />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
                  <SubmitButton />
                  <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
