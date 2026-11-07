"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Users } from "lucide-react";
import { FormLoadingModal } from "@/components/FormLoadingModal";
import { PaymentMethodFields } from "../PaymentMethodFields";
import type { SchoolPaymentInfo } from "@/lib/school-payment-rules";
import { CouponBox, type CouponBoxApplied } from "@/components/payments/CouponBox";
import { saveAdesaoPayment, type SaveAdesaoPaymentResult } from "./actions";

export type AdesaoPaymentLine = { id: string; label: string; amount: number; isTuition: boolean; /** Valor antes do cupão. */ originalAmount?: number };

type Props = {
  lines: AdesaoPaymentLine[];
  paymentInfo: SchoolPaymentInfo;
  paymentReference: string | null;
  initialMethod: string | null;
  existingProofFileName: string | null;
  /** Já é membro de um grupo: a mensalidade é paga pelo titular. */
  familyPayerName: string | null;
  /** Mostra a caixa «Faço parte de um grupo familiar» (só quem ainda não está num grupo). */
  canRequestFamily: boolean;
  familyRequested: boolean;
  appliedCoupons: CouponBoxApplied[];
};

const eur = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;

export function AdesaoPaymentForm({
  lines,
  paymentInfo,
  paymentReference,
  initialMethod,
  existingProofFileName,
  familyPayerName,
  canRequestFamily,
  familyRequested: initialFamily,
  appliedCoupons,
}: Props) {
  const [state, formAction] = useActionState(saveAdesaoPayment, null as SaveAdesaoPaymentResult | null);
  const [family, setFamily] = useState(initialFamily);
  const tuitionByFamily = family || Boolean(familyPayerName);
  const payable = lines.filter((l) => !(tuitionByFamily && l.isTuition));
  const total = payable.reduce((t, l) => t + l.amount, 0);

  return (
    <form action={formAction} style={{ maxWidth: 640, width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
      <FormLoadingModal message="A guardar…" />

      <p
        className="card"
        style={{ margin: 0, padding: "12px 14px", display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: "var(--success, #16a34a)", border: "1px solid color-mix(in srgb, var(--success, #16a34a) 40%, transparent)" }}
      >
        <CheckCircle2 size={18} aria-hidden /> Adesão completa. Não falta nenhum documento.
      </p>

      {familyPayerName ? (
        <p className="card" style={{ margin: 0, padding: "12px 14px", display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
          <Users size={18} aria-hidden /> A tua mensalidade é paga por <strong>{familyPayerName}</strong> (grupo familiar).
        </p>
      ) : null}

      <section className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", fontSize: 14 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 600 }}>O que pagas agora</h2>
        {lines.map((l) => {
          const byFamily = tuitionByFamily && l.isTuition;
          return (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderTop: "1px dashed var(--border)" }}>
              <span>{l.label}</span>
              {byFamily ? (
                <span style={{ color: "var(--text-secondary)" }}>Paga pelo titular</span>
              ) : (
                <strong>
                  {l.originalAmount != null && l.originalAmount > l.amount ? (
                    <s style={{ color: "var(--text-secondary)", fontWeight: 400, marginRight: 6 }}>{eur(l.originalAmount)}</s>
                  ) : null}
                  {eur(l.amount)}
                </strong>
              )}
            </div>
          );
        })}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "9px 0 0", borderTop: "1px solid var(--border)", fontWeight: 700, fontSize: 15 }}>
          <span>Total</span>
          <span>{eur(total)}</span>
        </div>
        {paymentReference && total > 0 ? (
          <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--text-secondary)" }}>
            No descritivo da transferência escreve <strong style={{ color: "var(--text-primary)" }}>{paymentReference}</strong>.
          </p>
        ) : null}
      </section>

      <CouponBox applied={appliedCoupons} />

      {canRequestFamily ? (
        <label className="card" style={{ padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontSize: 14 }}>
          <input type="checkbox" name="familyGroupRequested" checked={family} onChange={(ev) => setFamily(ev.target.checked)} style={{ marginTop: 3 }} />
          <span>
            <strong>Faço parte de um grupo familiar</strong>
            <span style={{ display: "block", fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.45, marginTop: 2 }}>
              A mensalidade passa a ser paga pelo titular da família. Avisamos a secretaria e a mensalidade fica em espera até o grupo
              estar criado. A inscrição e o seguro continuam a ser teus.
            </span>
          </span>
        </label>
      ) : null}

      {total > 0 ? (
        <PaymentMethodFields paymentInfo={paymentInfo} revolutAvailable initialMethod={initialMethod} existingProofFileName={existingProofFileName} />
      ) : null}

      {state?.error ? <p style={{ margin: 0, color: "var(--danger)", fontSize: 14 }}>{state.error}</p> : null}

      <button type="submit" className="btn btn-primary">
        {total > 0 ? "Concluir" : "Continuar"}
      </button>
    </form>
  );
}
