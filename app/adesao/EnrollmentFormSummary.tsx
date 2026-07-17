import {
  GYM_ENROLLMENT_INFO,
  PAYMENT_METHOD_OPTIONS,
  type EnrollmentFormRow,
} from "@/lib/enrollment-form";

type Props = {
  form: EnrollmentFormRow;
  fullName: string;
  email: string;
  dateOfBirth: string;
  phone: string;
  planName: string;
  modalityLabel: string | null;
  monthlyAmount: number;
  enrollmentAmount: number;
  insuranceAmount: number;
  showEnrollment: boolean;
  showInsurance: boolean;
};

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <p style={{ margin: "0 0 6px", fontSize: 14, color: "var(--text-secondary)" }}>
      <strong>{label}:</strong> {value}
    </p>
  );
}

export function EnrollmentFormSummary({
  form,
  fullName,
  email,
  dateOfBirth,
  phone,
  planName,
  modalityLabel,
  monthlyAmount,
  enrollmentAmount,
  insuranceAmount,
  showEnrollment,
  showInsurance,
}: Props) {
  const paymentLabel =
    PAYMENT_METHOD_OPTIONS.find((o) => o.value === form.paymentMethod)?.label ?? form.paymentMethod;

  return (
    <section className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", fontSize: 14, lineHeight: 1.55 }}>
      <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Comprovativo de Adesão</h2>
      <p style={{ margin: "0 0 10px", color: "var(--text-secondary)" }}>{GYM_ENROLLMENT_INFO.name}</p>
      <Row label="Nome" value={fullName} />
      <Row label="Data de nascimento" value={dateOfBirth ? new Date(`${dateOfBirth}T12:00:00`).toLocaleDateString("pt-PT") : null} />
      <Row label="CC/Passaporte" value={form.idDocument} />
      <Row label="NIF" value={form.taxId} />
      <Row label="Morada" value={`${form.addressLine ?? ""}${form.postalCode ? `, ${form.postalCode}` : ""}`} />
      <Row label="Telefone" value={phone} />
      <Row label="E-mail" value={email} />
      <Row label="Emergência" value={`${form.emergencyContactName ?? ""} (${form.emergencyContactRelationship ?? ""}) — ${form.emergencyContactPhone ?? ""}`} />
      <Row label="Plano" value={planName} />
      <Row label="Modalidade" value={modalityLabel} />
      <Row label="Início" value={form.membershipStartDate ? new Date(`${form.membershipStartDate}T12:00:00`).toLocaleDateString("pt-PT") : null} />
      <Row label="Mensalidade" value={`${monthlyAmount.toFixed(2)} €`} />
      {showEnrollment ? <Row label="Inscrição" value={`${enrollmentAmount.toFixed(2)} €`} /> : null}
      {showInsurance ? <Row label="Seguro" value={`${insuranceAmount.toFixed(2)} €`} /> : null}
      <Row label="Pagamento" value={paymentLabel ?? undefined} />
      {form.debitIban ? <Row label="IBAN" value={form.debitIban} /> : null}
      {form.allergies ? <Row label="Alergias" value={form.allergies} /> : null}
      {form.knownHealthCondition ? <Row label="Saúde" value={form.knownHealthCondition} /> : null}
      {form.emergencyMedication ? <Row label="Medicação" value={form.emergencyMedication} /> : null}
      <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
        Consentimentos: foto {form.consentPhoto ? "sim" : "não"} · vídeo {form.consentVideo ? "sim" : "não"} · redes{" "}
        {form.consentSocialMedia ? "sim" : "não"} · marketing {form.consentMarketing ? "sim" : "não"}
      </p>
    </section>
  );
}
