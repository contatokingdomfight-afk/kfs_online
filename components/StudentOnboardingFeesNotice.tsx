type Props = {
  enrollmentAmount: number;
  insuranceAmount: number;
  showEnrollment: boolean;
  showInsurance: boolean;
  locale?: "pt" | "en";
  /** Membro do plano família: a mensalidade é do titular — só matrícula/seguro individuais. */
  isFamilyMember?: boolean;
};

/** Resumo das taxas de inscrição visível ao aluno (matrícula + seguro obrigatório). */
export function StudentOnboardingFeesNotice({
  enrollmentAmount,
  insuranceAmount,
  showEnrollment,
  showInsurance,
  locale = "pt",
  isFamilyMember = false,
}: Props) {
  if (!showEnrollment && !showInsurance) return null;

  const isEn = locale === "en";

  return (
    <div
      className="card"
      style={{
        marginBottom: 24,
        padding: "clamp(14px, 3.5vw, 18px)",
        borderLeft: "4px solid var(--primary)",
      }}
    >
      <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>
        {isEn ? "Enrollment fees" : "Taxas de inscrição"}
      </h2>
      <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-secondary)" }}>
        {isFamilyMember
          ? isEn
            ? "On the family plan, monthly tuition is paid by the plan holder. You only need to settle your individual fees:"
            : "No plano família, a mensalidade é paga pelo titular. Só precisas de regularizar as tuas taxas individuais:"
          : isEn
            ? "On your first payment at the school, the following apply in addition to your monthly plan:"
            : "No primeiro pagamento na escola, além da mensalidade do plano, aplicam-se:"}
      </p>
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, display: "flex", flexDirection: "column", gap: 6 }}>
        {showEnrollment && (
          <li>
            <strong>{isEn ? "Enrollment fee" : "Matrícula"}</strong> — €{enrollmentAmount.toFixed(2)}
            <span style={{ color: "var(--text-secondary)" }}>
              {" "}
              ({isEn ? "one-time at registration" : "única na inscrição"})
            </span>
          </li>
        )}
        {showInsurance && (
          <li>
            <strong>{isEn ? "Annual insurance" : "Seguro anual"}</strong> — €{insuranceAmount.toFixed(2)}
            <span style={{ color: "var(--text-secondary)" }}> ({isEn ? "required" : "obrigatório"})</span>
          </li>
        )}
      </ul>
      <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
        {isEn
          ? "Payment is processed by the school office. Contact us if you have questions."
          : "O pagamento é registado pela secretaria. Contacta-nos se tiveres dúvidas."}
      </p>
    </div>
  );
}
