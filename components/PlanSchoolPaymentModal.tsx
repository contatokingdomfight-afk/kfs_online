"use client";

import { useEffect } from "react";

export type PlanSchoolPaymentFees = {
  tuition: number;
  enrollment: number;
  insurance: number;
  showEnrollment: boolean;
  showInsurance: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  planName: string;
  fees: PlanSchoolPaymentFees;
  locale: "pt" | "en";
  confirming?: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  totalLabel: string;
  tuitionLabel: string;
  enrollmentLabel: string;
  insuranceLabel: string;
  /** info = só aviso (ex.: bloqueio até pagar na escola); confirm = escolha de plano */
  mode?: "confirm" | "info";
};

export function PlanSchoolPaymentModal({
  open,
  onClose,
  onConfirm,
  planName,
  fees,
  locale,
  confirming = false,
  title,
  body,
  confirmLabel,
  cancelLabel = "",
  totalLabel,
  tuitionLabel,
  enrollmentLabel,
  insuranceLabel,
  mode = "confirm",
}: Props) {
  const total =
    fees.tuition +
    (fees.showEnrollment ? fees.enrollment : 0) +
    (fees.showInsurance ? fees.insurance : 0);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !confirming) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, confirming, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-school-payment-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 30000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(0,0,0,0.55)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !confirming) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: "min(440px, 100%)",
          maxHeight: "min(90vh, 640px)",
          overflow: "auto",
          padding: "clamp(20px, 5vw, 28px)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <h2 id="plan-school-payment-title" style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          {title}
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.55 }}>
          {body}
        </p>
        <div
          style={{
            padding: "14px 16px",
            borderRadius: "var(--radius-md)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            fontSize: 14,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 10 }}>{planName}</div>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            <li>
              {tuitionLabel}: <strong>€{fees.tuition.toFixed(2)}</strong>
            </li>
            {fees.showEnrollment && (
              <li>
                {enrollmentLabel}: <strong>€{fees.enrollment.toFixed(2)}</strong>
              </li>
            )}
            {fees.showInsurance && (
              <li>
                {insuranceLabel}: <strong>€{fees.insurance.toFixed(2)}</strong>
                <span style={{ color: "var(--text-secondary)" }}>
                  {" "}
                  ({locale === "en" ? "required" : "obrigatório"})
                </span>
              </li>
            )}
          </ul>
          <div style={{ marginTop: 12, fontWeight: 700, fontSize: 15 }}>
            {totalLabel}: €{total.toFixed(2)}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
          {mode === "confirm" && cancelLabel ? (
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={confirming}>
              {cancelLabel}
            </button>
          ) : null}
          <button type="button" className="btn btn-primary" onClick={mode === "confirm" ? onConfirm : onClose} disabled={confirming}>
            {confirming
              ? locale === "en"
                ? "Saving…"
                : "A registar…"
              : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
