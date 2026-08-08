"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useFormState, useFormStatus } from "react-dom";
import { registerFamilyMemberTuition, type RegisterFamilyMemberTuitionResult } from "../actions";
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
  memberStudentId: string;
  studentName: string;
  referenceMonth: string;
  /** Ex.: "08/2026". */
  periodLabel: string;
  /** Parte mensal sugerida (já com desconto de família). Pré-preenche o valor. */
  suggestedShare: number;
  buttonLabel?: string;
  buttonClassName?: string;
};

export function RegisterFamilyMemberPaymentModal({
  memberStudentId,
  studentName,
  referenceMonth,
  periodLabel,
  suggestedShare,
  buttonLabel = "Registar pagamento",
  buttonClassName = "btn btn-primary",
}: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(
    registerFamilyMemberTuition,
    null as RegisterFamilyMemberTuitionResult | null
  );
  const [submittedAt, setSubmittedAt] = useState<number | null>(null);
  const [slowSubmit, setSlowSubmit] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (state?.success) {
      setOpen(false);
      setSubmittedAt(null);
      setSlowSubmit(false);
    } else if (state?.error) {
      setSubmittedAt(null);
      setSlowSubmit(false);
    }
  }, [state]);

  useEffect(() => {
    if (!submittedAt) {
      setSlowSubmit(false);
      return;
    }
    const timer = setTimeout(() => setSlowSubmit(true), 6000);
    return () => clearTimeout(timer);
  }, [submittedAt]);

  const closeAndReset = () => {
    setOpen(false);
    setSubmittedAt(null);
    setSlowSubmit(false);
  };

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
            onClick={(e) => e.target === e.currentTarget && closeAndReset()}
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
                    {studentName} · Mensalidade · {periodLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeAndReset}
                  aria-label="Fechar"
                  className="btn btn-secondary"
                  style={{ padding: "4px 10px", fontSize: 14 }}
                >
                  ×
                </button>
              </div>

              {slowSubmit && (
                <p
                  role="status"
                  style={{
                    margin: 0,
                    fontSize: 13,
                    padding: "10px 12px",
                    background: "var(--surface)",
                    borderRadius: "var(--radius-md)",
                    borderLeft: "3px solid var(--primary)",
                  }}
                >
                  Isto está a demorar mais que o normal. É provável que já tenha sido guardado — fecha e confere na
                  lista antes de tentar outra vez.
                </p>
              )}

              <form
                action={formAction}
                onSubmit={() => setSubmittedAt(Date.now())}
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                <input type="hidden" name="memberStudentId" value={memberStudentId} />
                <input type="hidden" name="referenceMonth" value={referenceMonth} />
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
                    defaultValue={suggestedShare.toFixed(2)}
                    required
                    className="input mobile-form-field-scroll"
                  />
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    A mensalidade da titular é reduzida por este valor (o total da família mantém-se). Coloca 0 se
                    ficar coberta pela titular.
                  </span>
                </label>
                <PaymentMethodSelect label="Forma de pagamento" />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
                  <SubmitButton />
                  <button type="button" className="btn btn-secondary" onClick={closeAndReset}>
                    {slowSubmit ? "Fechar" : "Cancelar"}
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
