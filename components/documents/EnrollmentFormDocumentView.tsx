import type { CSSProperties, ReactNode } from "react";
import {
  ENROLLMENT_CONSENT_FOOTNOTE,
  ENROLLMENT_CONSENT_SECTIONS,
  ENROLLMENT_GDPR_PURPOSES,
  ENROLLMENT_GDPR_RETENTION,
  ENROLLMENT_GDPR_RIGHTS,
  ENROLLMENT_MODALITY_CHECKBOXES,
  FINAL_DECLARATIONS,
  GDPR_CONSENT_INTRO,
  GYM_ENROLLMENT_INFO,
  SCHOOL_TRANSFER_IBAN,
  enrollmentModalityChecked,
  enrollmentPaymentMethodLabel,
  type EnrollmentFormRow,
} from "@/lib/enrollment-form";
import { formatDecimalAmountInput } from "@/lib/parse-decimal-amount";
import { InsuranceCoverageBlock } from "@/components/membership/InsuranceCoverageBlock";
import { ENROLLMENT_INSURANCE_MANUAL_PLACEHOLDER } from "@/lib/sports-insurance-coverage";
import { SchoolSignatureBlock } from "@/components/documents/SchoolSignatureBlock";
import type { SchoolSignature } from "@/lib/school-signatures";

type Props = {
  form: EnrollmentFormRow;
  fullName: string;
  email: string;
  dateOfBirth: string;
  phone: string;
  planName: string;
  primaryModality: string | null;
  modalityScope: string | null;
  modalityLabel: string | null;
  monthlyAmount: number;
  enrollmentAmount: number;
  insuranceAmount?: number;
  showEnrollment: boolean;
  showInsurance: boolean;
  agreementSigned?: boolean;
  signatureName?: string | null;
  signatureImageUrl?: string | null;
  schoolSignatures?: SchoolSignature[];
};

const sectionTitle: CSSProperties = {
  margin: "0 0 10px",
  fontSize: 15,
  fontWeight: 700,
  color: "var(--text-primary)",
};

const bodyText: CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.55,
  color: "var(--text-secondary)",
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-PT");
}

function FieldLine({ label, value }: { label: string; value: string | null | undefined }) {
  const text = value?.trim() || "—";
  return (
    <p style={{ ...bodyText, margin: "0 0 6px" }}>
      <span style={{ color: "var(--text-primary)" }}>{label}: </span>
      <span style={{ borderBottom: "1px solid color-mix(in srgb, var(--text-primary) 35%, transparent)", paddingBottom: 1 }}>
        {text}
      </span>
    </p>
  );
}

function CheckLine({ checked, label }: { checked: boolean; label: string }) {
  return (
    <p style={{ ...bodyText, margin: "0 0 4px" }}>
      <span style={{ fontFamily: "Segoe UI Symbol, sans-serif", marginRight: 6 }}>{checked ? "☑" : "☐"}</span>
      {label}
    </p>
  );
}

function ConsentPair({ title, yes, no, allowed }: { title: string; yes: string; no: string; allowed: boolean }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ ...bodyText, margin: "0 0 6px", fontWeight: 600, color: "var(--text-primary)" }}>{title}</p>
      <CheckLine checked={allowed} label={yes} />
      <CheckLine checked={!allowed} label={no} />
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 18 }}>
      <h3 style={sectionTitle}>
        {n}-{title}
      </h3>
      {children}
    </section>
  );
}

function formatGymPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("351")) {
    return `+351 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return phone;
}

export function EnrollmentFormDocumentView({
  form,
  fullName,
  email,
  dateOfBirth,
  phone,
  planName,
  primaryModality,
  modalityScope,
  monthlyAmount,
  enrollmentAmount,
  insuranceAmount = 0,
  showEnrollment,
  showInsurance,
  agreementSigned,
  signatureName,
  signatureImageUrl,
  schoolSignatures,
}: Props) {
  const paymentMethod = form.paymentMethod;
  const isDebitDirect = paymentMethod === "DEBIT_DIRECT";
  const isOther = !isDebitDirect;
  const otherPaymentDetail =
    paymentMethod === "CASH"
      ? "Dinheiro em espécie"
      : paymentMethod === "TRANSFER"
        ? "Transferência bancária"
        : enrollmentPaymentMethodLabel(paymentMethod);

  const healthOr = (v: string | null | undefined) => (v?.trim() ? v.trim() : "Nenhuma");

  return (
    <article className="enrollment-form-document" style={{ fontSize: 14, lineHeight: 1.55, color: "var(--text-secondary)" }}>
      <header style={{ textAlign: "center", marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
          Comprovativo de Adesão
        </h2>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Kingdom Fight School</p>
      </header>

      <Section n={1} title="Identificação do Ginásio">
        <p style={bodyText}>
          <strong style={{ color: "var(--text-primary)" }}>Denominação:</strong> {GYM_ENROLLMENT_INFO.name} também conhecida
          por Kingdom Fight School
        </p>
        <p style={{ ...bodyText, marginTop: 6 }}>NIPC: {GYM_ENROLLMENT_INFO.nipc}</p>
        <p style={{ ...bodyText, marginTop: 6 }}>Sede: {GYM_ENROLLMENT_INFO.address}</p>
        <p style={{ ...bodyText, marginTop: 6 }}>Telefone: {formatGymPhone(GYM_ENROLLMENT_INFO.phone)}</p>
        <p style={{ ...bodyText, marginTop: 6 }}>E-mail: {GYM_ENROLLMENT_INFO.email}</p>
      </Section>

      <Section n={2} title="Identificação do(a) Sócio">
        <FieldLine label="Nome completo" value={fullName} />
        <FieldLine label="Data de nascimento" value={fmtDate(dateOfBirth)} />
        <FieldLine label="Cartão de Cidadão / Passaporte n.º" value={form.idDocument} />
        <FieldLine label="NIF" value={form.taxId} />
        <FieldLine label="Morada" value={form.addressLine} />
        <FieldLine label="Código Postal" value={form.postalCode} />
        <FieldLine label="Telefone" value={phone} />
        <FieldLine label="E-mail" value={email} />
      </Section>

      <Section n={3} title="Contacto de Emergência">
        <FieldLine label="Nome" value={form.emergencyContactName} />
        <FieldLine label="Parentesco" value={form.emergencyContactRelationship} />
        <FieldLine label="Telefone" value={form.emergencyContactPhone} />
      </Section>

      <Section n={4} title="Plano de Adesão">
        <FieldLine label="Plano" value={planName} />
      </Section>

      <Section n={5} title="Modalidade(s) Escolhida(s)">
        {ENROLLMENT_MODALITY_CHECKBOXES.map((item) => (
          <CheckLine
            key={item.code}
            checked={enrollmentModalityChecked(item.code, primaryModality, modalityScope)}
            label={item.label}
          />
        ))}
      </Section>

      <Section n={6} title="Dados de Adesão">
        <FieldLine label="Data de início" value={fmtDate(form.membershipStartDate)} />
        <p style={{ ...bodyText, margin: "8px 0 4px" }}>Período inicial: 1 mês</p>
        <p style={bodyText}>
          Renovação: Automática por períodos sucessivos de 1 mês, salvo denúncia nos termos das Condições Gerais de
          Adesão.
        </p>
      </Section>

      <Section n={7} title="Valores">
        {showEnrollment ? <FieldLine label="Inscrição" value={`${enrollmentAmount.toFixed(2)} €`} /> : null}
        <FieldLine label="Mensalidade" value={`${monthlyAmount.toFixed(2)} €`} />
        {showInsurance ? (
          <FieldLine
            label="Seguro (quando aplicável)"
            value={
              ENROLLMENT_INSURANCE_MANUAL_PLACEHOLDER ? "—" : `${formatDecimalAmountInput(insuranceAmount)} €`
            }
          />
        ) : null}
      </Section>

      <Section n={8} title="Forma de Pagamento">
        <CheckLine checked={isDebitDirect} label="Débito Direto" />
        <CheckLine checked={isOther} label={otherPaymentDetail ? `Outro (${otherPaymentDetail})` : "Outro"} />
        {(isDebitDirect || form.debitIban) && form.debitIban ? (
          <FieldLine label="IBAN (débito direto)" value={form.debitIban} />
        ) : null}
        {paymentMethod === "TRANSFER" || paymentMethod === "DEBIT_DIRECT" ? (
          <FieldLine label="IBAN (transferência)" value={SCHOOL_TRANSFER_IBAN} />
        ) : null}
      </Section>

      {(showInsurance || ENROLLMENT_INSURANCE_MANUAL_PLACEHOLDER) && (
        <Section n={9} title="Dados do Seguro">
          <p style={{ ...bodyText, margin: "0 0 8px", fontWeight: 600, color: "var(--text-primary)" }}>
            Seguro obrigatório para federados!
          </p>
          <CheckLine
            checked={form.insuranceAccepted || showInsurance}
            label="Aceito o pagamento do seguro"
          />
          <InsuranceCoverageBlock compact annualAmount={insuranceAmount} />
        </Section>
      )}

      <Section n={10} title="Dados de Saúde">
        <p style={{ ...bodyText, margin: "0 0 4px", fontWeight: 600, color: "var(--text-primary)" }}>Alergias relevantes:</p>
        <p style={{ ...bodyText, margin: "0 0 10px", whiteSpace: "pre-wrap" }}>{healthOr(form.allergies)}</p>
        <p style={{ ...bodyText, margin: "0 0 4px", fontWeight: 600, color: "var(--text-primary)" }}>
          Doença conhecida com relevância para a prática desportiva:
        </p>
        <p style={{ ...bodyText, margin: "0 0 10px", whiteSpace: "pre-wrap" }}>{healthOr(form.knownHealthCondition)}</p>
        <p style={{ ...bodyText, margin: "0 0 4px", fontWeight: 600, color: "var(--text-primary)" }}>Medicação de emergência:</p>
        <p style={{ ...bodyText, margin: 0, whiteSpace: "pre-wrap" }}>{healthOr(form.emergencyMedication)}</p>
      </Section>

      <Section n={11} title="Proteção de Dados">
        <p style={{ ...bodyText, margin: "0 0 10px" }}>{GDPR_CONSENT_INTRO}</p>
        <ul style={{ margin: "0 0 10px", paddingLeft: 20, ...bodyText }}>
          {ENROLLMENT_GDPR_PURPOSES.map((item) => (
            <li key={item} style={{ marginBottom: 4 }}>
              {item}
            </li>
          ))}
        </ul>
        <p style={{ ...bodyText, margin: "0 0 10px" }}>{ENROLLMENT_GDPR_RETENTION}</p>
        <p style={{ ...bodyText, margin: "0 0 14px" }}>{ENROLLMENT_GDPR_RIGHTS}</p>

        <p style={{ ...bodyText, margin: "0 0 10px", fontWeight: 600, color: "var(--text-primary)" }}>11.2- Consentimento</p>
        {ENROLLMENT_CONSENT_SECTIONS.map((item) => (
          <ConsentPair
            key={item.key}
            title={item.title}
            yes={item.yes}
            no={item.no}
            allowed
          />
        ))}
        <p style={{ ...bodyText, margin: "12px 0 0", fontSize: 13 }}>{ENROLLMENT_CONSENT_FOOTNOTE}</p>
      </Section>

      <section style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        {FINAL_DECLARATIONS.map((text) => (
          <p key={text.slice(0, 40)} style={{ ...bodyText, margin: "0 0 10px" }}>
            {text}
          </p>
        ))}

        {agreementSigned ? (
          <p style={{ ...bodyText, margin: "16px 0 10px", fontWeight: 600, color: "var(--text-primary)" }}>
            ✓ Li e aceitei as Condições Gerais de Adesão e o Termo de Responsabilidade
          </p>
        ) : null}

        <div style={{ marginTop: 20 }}>
          <p style={{ ...bodyText, margin: "0 0 8px", fontWeight: 600, color: "var(--text-primary)" }}>
            Assinatura do(a) Sócio(a)
          </p>
          {signatureImageUrl ? (
            <img
              src={signatureImageUrl}
              alt="Assinatura desenhada"
              style={{
                display: "block",
                maxWidth: 280,
                width: "100%",
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                marginBottom: 8,
              }}
            />
          ) : (
            <div
              style={{
                borderBottom: "1px solid var(--text-primary)",
                minHeight: 48,
                maxWidth: 360,
                marginBottom: 8,
              }}
            />
          )}
          {signatureName ? (
            <p style={{ ...bodyText, margin: "0 0 4px" }}>
              Assinado por: <strong style={{ color: "var(--text-primary)" }}>{signatureName}</strong>
            </p>
          ) : null}
          {form.formCompletedAt ? (
            <p style={{ ...bodyText, margin: 0 }}>Data: {fmtDate(form.formCompletedAt)}</p>
          ) : (
            <p style={{ ...bodyText, margin: 0 }}>Data: ____ / ____ / ______</p>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          <p style={{ ...bodyText, margin: "0 0 8px", fontWeight: 600, color: "var(--text-primary)" }}>
            A Kingdom Fight School
          </p>
          <SchoolSignatureBlock signatures={schoolSignatures ?? []} title="" />
          {!schoolSignatures?.length ? (
            <>
              <FieldLine label="Nome do representante" value={null} />
              <FieldLine label="Cargo" value={null} />
              <div style={{ borderBottom: "1px solid var(--text-primary)", minHeight: 48, maxWidth: 280, marginTop: 8 }} />
              <p style={{ ...bodyText, margin: "6px 0 0" }}>Assinatura:</p>
            </>
          ) : null}
        </div>
      </section>
    </article>
  );
}
