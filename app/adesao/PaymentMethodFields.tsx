"use client";

import { useState } from "react";
import { Landmark, Calendar, CreditCard } from "lucide-react";
import { CopyTextButton } from "@/components/ui/CopyTextButton";
import { MONTHLY_DUE_DAY_NOTE, PAYMENT_METHOD_OPTIONS, type PaymentMethodValue } from "@/lib/enrollment-form";
import { enrollmentPaymentMethods, type SchoolPaymentInfo } from "@/lib/school-payment-rules";

const METHOD_HINT: Record<string, string> = {
  REVOLUT: "Cartão, Apple Pay, Google Pay ou conta Revolut. Pagas já a seguir e fica confirmado na hora — sem comprovativo.",
  TRANSFER: "IBAN e comprovativo (confirmado pela secretaria).",
  MBWAY: "Envias para o número da escola e juntas o comprovativo (confirmado pela secretaria).",
  CASH: "Pagas na secretaria, no primeiro treino.",
};

type Props = {
  paymentInfo: SchoolPaymentInfo;
  /** Mostra «Pagamento online (Revolut)», se a escola o tiver (só para o próprio aluno). */
  revolutAvailable?: boolean;
  /** Forma escolhida antes (ex.: DEBIT_DIRECT legado → TRANSFER). */
  initialMethod?: string | null;
  existingProofFileName?: string | null;
};

/** Forma de pagamento + dados da escola (IBAN / MB Way) + comprovativo. Campos `paymentMethod` e `paymentProof`. */
export function PaymentMethodFields({ paymentInfo, revolutAvailable = false, initialMethod, existingProofFileName }: Props) {
  // Revolut primeiro (recomendado) quando disponível; o admin a preencher pelo aluno não a vê.
  const availableMethods = enrollmentPaymentMethods(paymentInfo, { includeOnline: revolutAvailable });
  const wantedMethod = initialMethod === "DEBIT_DIRECT" ? "TRANSFER" : initialMethod;
  const initialPayment: PaymentMethodValue | null = availableMethods.find((m) => m === wantedMethod) ?? availableMethods[0] ?? null;
  const methodOptions = availableMethods.flatMap((m) => PAYMENT_METHOD_OPTIONS.filter((o) => o.value === m));
  const transfer = paymentInfo.transfer;
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue | null>(initialPayment);

  return (
        <section className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Forma de pagamento</h2>
          {methodOptions.length === 0 ? (
            <p role="alert" style={{ margin: 0, fontSize: 14, color: "var(--danger)", lineHeight: 1.5 }}>
              A tua escola ainda não indicou como receber pagamentos. Fala com a escola para concluíres a adesão.
            </p>
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {methodOptions.map((opt) => {
              const on = paymentMethod === opt.value;
              return (
                <label
                  key={opt.value}
                  style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, cursor: "pointer", padding: "10px 12px", borderRadius: 12, border: `1px solid ${on ? "var(--primary)" : "var(--border)"}`, background: on ? "color-mix(in srgb, var(--primary) 8%, var(--bg))" : "var(--bg)" }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={opt.value}
                    checked={on}
                    onChange={() => setPaymentMethod(opt.value)}
                    required
                    style={{ marginTop: 3 }}
                  />
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontWeight: 700 }}>
                      {opt.value === "REVOLUT" ? "💳 " : ""}
                      {opt.label}
                      {opt.value === "REVOLUT" ? (
                        <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 999, color: "var(--success)", background: "color-mix(in srgb, var(--success) 12%, transparent)" }}>RECOMENDADO</span>
                      ) : null}
                    </span>
                    <span style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.45 }}>{METHOD_HINT[opt.value]}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {paymentMethod === "MBWAY" && paymentInfo.mbwayPhone ? (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--bg-secondary)",
                fontSize: 14,
              }}
            >
              <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Número MB Way da escola</p>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                <code style={{ fontSize: 15, fontWeight: 600 }}>{paymentInfo.mbwayPhone}</code>
                <CopyTextButton text={paymentInfo.mbwayPhone} label="Copiar número" />
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: 6 }}>
                <Calendar size={13} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
                As mensalidades seguintes devem ser pagas {MONTHLY_DUE_DAY_NOTE}.
              </p>
            </div>
          ) : null}
          {paymentMethod === "TRANSFER" && transfer ? (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--bg-secondary)",
                fontSize: 14,
              }}
            >
              <p style={{ margin: "0 0 8px", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <Landmark size={16} aria-hidden />
                Dados para transferência
              </p>
              {transfer.holder ? (
                <p style={{ margin: "0 0 4px", color: "var(--text-secondary)" }}>
                  Destinatário: <strong style={{ color: "var(--text-primary)" }}>{transfer.holder}</strong>
                </p>
              ) : null}
              {transfer.holderAddress ? (
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-secondary)" }}>
                  {transfer.holderAddress}
                </p>
              ) : null}
              {transfer.iban ? (
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                  <code style={{ fontSize: 15, fontWeight: 600, wordBreak: "break-all" }}>{transfer.iban}</code>
                  <CopyTextButton text={transfer.iban} label="Copiar IBAN" />
                </div>
              ) : null}
              {transfer.bicSwift ? (
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                  BIC/SWIFT: <strong style={{ color: "var(--text-primary)" }}>{transfer.bicSwift}</strong>
                </p>
              ) : null}
              {transfer.revolutTag ? (
                <p style={{ margin: "10px 0 0", fontSize: 13 }}>
                  Revolut:{" "}
                  <strong style={{ color: "var(--text-primary)" }}>{transfer.revolutTag}</strong>
                </p>
              ) : null}
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: 6 }}>
                <Calendar size={13} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
                As mensalidades seguintes devem ser pagas {MONTHLY_DUE_DAY_NOTE}.
              </p>
            </div>
          ) : null}

          <div style={{ display: paymentMethod === "REVOLUT" || !paymentMethod ? "none" : undefined }}>
            <label htmlFor="paymentProof" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
              <CreditCard size={15} aria-hidden />
              Comprovativo de pagamento {paymentMethod === "TRANSFER" || paymentMethod === "MBWAY" ? "" : "(opcional)"}
            </label>
            <input
              id="paymentProof"
              name="paymentProof"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="input w-full"
            />
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
              {existingProofFileName
                ? `Já enviaste "${existingProofFileName}". Escolhe outro ficheiro só se quiseres substituir.`
                : "Foto ou PDF do comprovativo (recibo, print da transferência ou do Revolut). Máx. 8 MB."}
            </p>
          </div>
        </section>
  );
}
