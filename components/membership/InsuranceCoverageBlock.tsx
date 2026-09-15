import {
  ENROLLMENT_INSURANCE_MANUAL_PLACEHOLDER,
  SPORTS_INSURANCE_COVERAGE,
} from "@/lib/sports-insurance-coverage";
import { formatDecimalAmountInput } from "@/lib/parse-decimal-amount";

type Props = {
  locale?: "pt" | "en";
  compact?: boolean;
  /** Prémio anual configurado em Admin → Configurações (InsuranceSettings.annualAmount). */
  annualAmount?: number;
};

const BLANK = "—";

export function InsuranceCoverageBlock({ locale = "pt", compact = false, annualAmount }: Props) {
  const pt = locale === "pt";
  const fontSize = compact ? 13 : 14;

  if (ENROLLMENT_INSURANCE_MANUAL_PLACEHOLDER) {
    return (
      <div
        className="insurance-coverage-block"
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
            {pt ? "Produto" : "Product"}: <strong>{BLANK}</strong>
          </li>
          <li>
            {pt ? "Atividade" : "Activity"}: <strong>{BLANK}</strong>
          </li>
          <li>
            {pt ? "Morte" : "Death"}: <strong>{BLANK}</strong>
          </li>
          <li>
            {pt ? "Invalidez Permanente" : "Permanent disability"}: <strong>{BLANK}</strong>
          </li>
          <li>
            {pt ? "Despesas de Tratamento" : "Treatment expenses"}: <strong>{BLANK}</strong>
          </li>
          <li>
            {pt ? "Despesas de Funeral" : "Funeral expenses"}: <strong>{BLANK}</strong>
          </li>
          <li>
            {pt ? "Prémio comercial anual inestornável por aderente" : "Annual non-refundable premium per member"}:{" "}
            <strong>{BLANK}</strong>
          </li>
        </ul>
      </div>
    );
  }

  const c = SPORTS_INSURANCE_COVERAGE;
  const annualPremiumLabel =
    annualAmount != null && Number.isFinite(annualAmount)
      ? `${formatDecimalAmountInput(annualAmount)} €`
      : c.annualPremium;

  return (
    <div
      className="insurance-coverage-block"
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
          <strong>{annualPremiumLabel}</strong>
        </li>
      </ul>
    </div>
  );
}
