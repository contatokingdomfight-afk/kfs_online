import { SPORTS_INSURANCE_COVERAGE } from "@/lib/sports-insurance-coverage";

type Props = {
  locale?: "pt" | "en";
  compact?: boolean;
};

export function InsuranceCoverageBlock({ locale = "pt", compact = false }: Props) {
  const pt = locale === "pt";
  const c = SPORTS_INSURANCE_COVERAGE;
  const fontSize = compact ? 13 : 14;

  return (
    <div
      style={{
        marginTop: compact ? 8 : 12,
        padding: compact ? "10px 12px" : "12px 14px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        background: "var(--bg-secondary)",
        fontSize,
        lineHeight: 1.55,
        color: "var(--text-secondary)",
      }}
    >
      <p style={{ margin: "0 0 8px", fontWeight: 600, color: "var(--text-primary)" }}>
        {pt ? "Cobertura PDCR" : "PDCR coverage"}
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
        <li>
          {pt ? "Produto" : "Product"}: <strong>{c.product}</strong>
        </li>
        <li>
          {pt ? "Atividade" : "Activity"}: <strong>{c.activity}</strong>
        </li>
        <li>
          {pt ? "Morte" : "Death"}: <strong>{c.death}</strong>
        </li>
        <li>
          {pt ? "Invalidez Permanente" : "Permanent disability"}: <strong>{c.permanentDisability}</strong>
        </li>
        <li>
          {pt ? "Despesas de Tratamento" : "Treatment expenses"}: <strong>{c.treatmentExpenses}</strong>
          {pt
            ? ` (franquia de ${c.treatmentDeductible}, por sinistro e por pessoa segura)`
            : ` (deductible ${c.treatmentDeductible} per claim and insured person)`}
        </li>
        <li>
          {pt ? "Despesas de Funeral" : "Funeral expenses"}: <strong>{c.funeralExpenses}</strong>
        </li>
        <li>
          {pt ? "Prémio comercial anual inestornável por aderente" : "Annual non-refundable premium per member"}:{" "}
          <strong>{c.annualPremium}</strong>
        </li>
      </ul>
    </div>
  );
}
