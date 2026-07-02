import {
  FINANCE_PAYMENT_METHODS,
  FINANCE_PAYMENT_METHOD_LABELS_PT,
  type FinancePaymentMethod,
} from "@/lib/finance-payment-method";

type Props = {
  name?: string;
  label: string;
  defaultValue?: FinancePaymentMethod;
  required?: boolean;
};

export function PaymentMethodSelect({
  name = "paymentMethod",
  label,
  defaultValue = "CASH",
  required = true,
}: Props) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</span>
      <select name={name} className="input" defaultValue={defaultValue} required={required}>
        {FINANCE_PAYMENT_METHODS.map((m) => (
          <option key={m} value={m}>
            {FINANCE_PAYMENT_METHOD_LABELS_PT[m]}
          </option>
        ))}
      </select>
    </label>
  );
}
