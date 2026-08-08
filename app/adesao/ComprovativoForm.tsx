"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useFormState } from "react-dom";
import { saveEnrollmentForm, type SaveEnrollmentFormResult } from "./enrollment-actions";
import { InsuranceCoverageBlock } from "@/components/membership/InsuranceCoverageBlock";
import { CopyTextButton } from "@/components/ui/CopyTextButton";
import {
  GYM_ENROLLMENT_INFO,
  GDPR_CONSENT_INTRO,
  PAYMENT_METHOD_OPTIONS,
  SCHOOL_TRANSFER_IBAN,
  SCHOOL_PAYMENT_DETAILS,
  type EnrollmentFormPrefill,
  type PaymentMethodValue,
} from "@/lib/enrollment-form";
import { SPORTS_INSURANCE_ANNUAL_PREMIUM } from "@/lib/sports-insurance-coverage";

type Props = {
  prefill: EnrollmentFormPrefill;
};

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 500 }}>{label}</label>
      {children}
      {hint ? <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>{hint}</p> : null}
    </div>
  );
}

export function ComprovativoForm({ prefill }: Props) {
  const [state, formAction] = useFormState(saveEnrollmentForm, null as SaveEnrollmentFormResult | null);
  const e = prefill.existing;
  const initialPayment =
    e.paymentMethod === "CASH" || e.paymentMethod === "TRANSFER"
      ? e.paymentMethod
      : e.paymentMethod === "DEBIT_DIRECT"
        ? "TRANSFER"
        : "CASH";
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>(initialPayment);

  return (
    <form action={formAction} style={{ maxWidth: 640, width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
        Estes dados são exigidos para o contrato de adesão e o seguro desportivo obrigatório — leva cerca de 3
        minutos. Alguns campos já vêm preenchidos com o que sabemos sobre ti.
      </p>
      <section className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", fontSize: 14, lineHeight: 1.55 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 600 }}>1 — Identificação do ginásio</h2>
        <p style={{ margin: "0 0 4px" }}><strong>{GYM_ENROLLMENT_INFO.name}</strong></p>
        <p style={{ margin: "0 0 4px", color: "var(--text-secondary)" }}>{GYM_ENROLLMENT_INFO.tradeName}</p>
        <p style={{ margin: "0 0 4px", color: "var(--text-secondary)" }}>NIPC: {GYM_ENROLLMENT_INFO.nipc}</p>
        <p style={{ margin: "0 0 4px", color: "var(--text-secondary)" }}>{GYM_ENROLLMENT_INFO.address}</p>
        <p style={{ margin: "0 0 4px", color: "var(--text-secondary)" }}>{GYM_ENROLLMENT_INFO.phone}</p>
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>{GYM_ENROLLMENT_INFO.email}</p>
      </section>

      <section className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>2 — Identificação do(a) sócio(a)</h2>
        <Field label="Nome completo">
          <input type="text" className="input w-full" value={prefill.fullName} readOnly />
        </Field>
        <Field label="Data de nascimento">
          <input type="date" className="input w-full" value={prefill.dateOfBirth} readOnly />
        </Field>
        <Field label="E-mail">
          <input type="email" className="input w-full" value={prefill.email} readOnly />
        </Field>
        <Field label="Cartão de Cidadão / Passaporte n.º">
          <input id="idDocument" name="idDocument" type="text" required className="input w-full" defaultValue={e.idDocument ?? ""} />
        </Field>
        <Field label="NIF">
          <input id="taxId" name="taxId" type="text" required className="input w-full" defaultValue={e.taxId ?? ""} inputMode="numeric" />
        </Field>
        <Field label="Morada">
          <input id="addressLine" name="addressLine" type="text" required className="input w-full" defaultValue={e.addressLine ?? ""} />
        </Field>
        <Field label="Código postal">
          <input id="postalCode" name="postalCode" type="text" required className="input w-full" defaultValue={e.postalCode ?? ""} />
        </Field>
        <Field label="Telefone">
          <input id="phone" name="phone" type="tel" required className="input w-full" defaultValue={prefill.phone} />
        </Field>
      </section>

      <section className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>3 — Contacto de emergência</h2>
        <Field label="Nome">
          <input id="emergencyContactName" name="emergencyContactName" type="text" required className="input w-full" defaultValue={e.emergencyContactName ?? ""} />
        </Field>
        <Field label="Parentesco">
          <input id="emergencyContactRelationship" name="emergencyContactRelationship" type="text" required className="input w-full" defaultValue={e.emergencyContactRelationship ?? ""} placeholder="Ex.: Pai, Mãe, Cônjuge" />
        </Field>
        <Field label="Telefone">
          <input id="emergencyContactPhone" name="emergencyContactPhone" type="tel" required className="input w-full" defaultValue={e.emergencyContactPhone ?? ""} />
        </Field>
      </section>

      <section className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", fontSize: 14, lineHeight: 1.55 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 600 }}>4 — Plano e modalidade</h2>
        <p style={{ margin: "0 0 6px" }}><strong>Plano:</strong> {prefill.planName}</p>
        {prefill.modalityLabel ? (
          <p style={{ margin: "0 0 6px" }}><strong>Modalidade:</strong> {prefill.modalityLabel}</p>
        ) : null}
        <Field label="Data de início">
          <input id="membershipStartDate" name="membershipStartDate" type="date" required className="input w-full" defaultValue={prefill.membershipStartDate} />
        </Field>
        <p style={{ margin: "10px 0 0", color: "var(--text-secondary)", fontSize: 13 }}>
          Período inicial: 1 mês. Renovação automática por períodos sucessivos de 1 mês, salvo denúncia nos termos das
          Condições Gerais de Adesão.
        </p>
      </section>

      <section className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", fontSize: 14 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 600 }}>5 — Valores</h2>
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-secondary)", lineHeight: 1.7 }}>
          {prefill.showEnrollment ? <li>Inscrição: {prefill.enrollmentAmount.toFixed(2)} €</li> : null}
          <li>Mensalidade: {prefill.monthlyAmount.toFixed(2)} €</li>
          {prefill.showInsurance ? (
            <li>Seguro: {SPORTS_INSURANCE_ANNUAL_PREMIUM.toFixed(2).replace(".", ",")} €</li>
          ) : null}
        </ul>
      </section>

      <section className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>6 — Forma de pagamento</h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>
          Por enquanto aceitamos apenas dinheiro em espécie na secretaria ou transferência bancária.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PAYMENT_METHOD_OPTIONS.map((opt) => (
            <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
              <input
                type="radio"
                name="paymentMethod"
                value={opt.value}
                checked={paymentMethod === opt.value}
                onChange={() => setPaymentMethod(opt.value)}
                required
              />
              {opt.label}
            </label>
          ))}
        </div>
        {paymentMethod === "TRANSFER" ? (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              background: "var(--bg-secondary)",
              fontSize: 14,
            }}
          >
            <p style={{ margin: "0 0 8px", fontWeight: 600 }}>🏦 Dados para transferência</p>
            <p style={{ margin: "0 0 4px", color: "var(--text-secondary)" }}>
              Destinatário: <strong style={{ color: "var(--text-primary)" }}>{SCHOOL_PAYMENT_DETAILS.recipientName}</strong>
            </p>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-secondary)" }}>
              {SCHOOL_PAYMENT_DETAILS.recipientAddress}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
              <code style={{ fontSize: 15, fontWeight: 600, wordBreak: "break-all" }}>{SCHOOL_TRANSFER_IBAN}</code>
              <CopyTextButton text={SCHOOL_TRANSFER_IBAN} label="Copiar IBAN" />
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
              BIC/SWIFT: <strong style={{ color: "var(--text-primary)" }}>{SCHOOL_PAYMENT_DETAILS.bicSwift}</strong>
            </p>
            <p style={{ margin: "10px 0 0", fontSize: 13 }}>
              Revolut:{" "}
              <strong style={{ color: "var(--text-primary)" }}>{SCHOOL_PAYMENT_DETAILS.revolutTag}</strong>
            </p>
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              📅 As mensalidades seguintes devem ser pagas {SCHOOL_PAYMENT_DETAILS.monthlyDueDayNote}.
            </p>
          </div>
        ) : null}

        <div>
          <label htmlFor="paymentProof" style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
            💳 Comprovativo de pagamento {paymentMethod === "TRANSFER" ? "" : "(opcional)"}
          </label>
          <input
            id="paymentProof"
            name="paymentProof"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="input w-full"
          />
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
            {e.paymentProofFileName
              ? `Já enviaste "${e.paymentProofFileName}". Escolhe outro ficheiro só se quiseres substituir.`
              : "Foto ou PDF do comprovativo (recibo, print da transferência ou do Revolut). Máx. 8 MB."}
          </p>
        </div>
      </section>

      {prefill.showInsurance ? (
        <section className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 600 }}>7 — Seguro desportivo</h2>
          <p style={{ margin: "0 0 10px", fontSize: 14, color: "var(--text-secondary)" }}>
            Seguro obrigatório para federados.
          </p>
          <details>
            <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--primary)", fontWeight: 500 }}>
              Ver coberturas completas do seguro
            </summary>
            <InsuranceCoverageBlock compact />
          </details>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, cursor: "pointer", marginTop: 12 }}>
            <input
              type="checkbox"
              name="insuranceAccepted"
              defaultChecked={e.insuranceAccepted ?? true}
              style={{ marginTop: 4 }}
            />
            <span>
              Aceito o pagamento do seguro ({SPORTS_INSURANCE_ANNUAL_PREMIUM.toFixed(2).replace(".", ",")} €).
            </span>
          </label>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
            O seguro é individual. Desmarca só se já tiveres seguro desportivo próprio válido.
          </p>
        </section>
      ) : null}

      <section className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>8 — Dados de saúde</h2>
        <Field label="Alergias relevantes">
          <textarea id="allergies" name="allergies" className="input w-full" rows={2} defaultValue={e.allergies ?? ""} placeholder="Nenhuma" />
        </Field>
        <Field label="Doença conhecida com relevância para a prática desportiva">
          <textarea id="knownHealthCondition" name="knownHealthCondition" className="input w-full" rows={2} defaultValue={e.knownHealthCondition ?? ""} placeholder="Nenhuma" />
        </Field>
        <Field label="Medicação de emergência">
          <textarea id="emergencyMedication" name="emergencyMedication" className="input w-full" rows={2} defaultValue={e.emergencyMedication ?? ""} placeholder="Nenhuma" />
        </Field>
      </section>

      <section className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>9 — Proteção de dados e consentimentos</h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{GDPR_CONSENT_INTRO}</p>
        {[
          { name: "consentPhoto", label: "Autorizo a captação e utilização de fotografias para divulgação institucional." },
          { name: "consentVideo", label: "Autorizo a captação e utilização de vídeos para divulgação institucional." },
          { name: "consentSocialMedia", label: "Autorizo a publicação da minha imagem em redes sociais e materiais promocionais." },
          { name: "consentMarketing", label: "Autorizo comunicações comerciais por email, SMS ou outros meios." },
        ].map((item) => (
          <label key={item.name} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, cursor: "pointer" }}>
            <input type="checkbox" name={item.name} defaultChecked={Boolean((e as Record<string, boolean | undefined>)[item.name])} style={{ marginTop: 4 }} />
            <span>{item.label}</span>
          </label>
        ))}
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
          As autorizações são facultativas e podem ser retiradas relativamente a utilizações futuras.
        </p>
      </section>

      {state?.error ? <p style={{ margin: 0, color: "var(--danger)", fontSize: 14 }}>{state.error}</p> : null}

      <button type="submit" className="btn btn-primary">
        Continuar para as Condições Gerais
      </button>
    </form>
  );
}
