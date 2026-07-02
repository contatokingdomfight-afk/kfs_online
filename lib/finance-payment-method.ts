/** Forma de pagamento presencial / manual (caixa e transferências). */
export const FINANCE_PAYMENT_METHODS = ["CASH", "TRANSFER", "MBWAY", "DEPOSIT"] as const;
export type FinancePaymentMethod = (typeof FINANCE_PAYMENT_METHODS)[number];

export const FINANCE_PAYMENT_METHOD_LABELS_PT: Record<FinancePaymentMethod, string> = {
  CASH: "Espécie",
  TRANSFER: "Transferência bancária",
  MBWAY: "MBWay",
  DEPOSIT: "Depósito",
};

const LEGACY_LABELS_PT: Record<string, string> = {
  CARD: "Cartão (legado)",
  MB: "Multibanco (legado)",
  OTHER: "Outro (legado)",
};

export function isFinancePaymentMethod(v: string): v is FinancePaymentMethod {
  return (FINANCE_PAYMENT_METHODS as readonly string[]).includes(v);
}

export function parseFinancePaymentMethod(raw: string | null | undefined): FinancePaymentMethod | null {
  const v = raw?.trim();
  if (!v || !isFinancePaymentMethod(v)) return null;
  return v;
}

export function parseFinancePaymentMethodRequired(
  raw: string | null | undefined
): { method: FinancePaymentMethod } | { error: string } {
  const m = parseFinancePaymentMethod(raw);
  if (!m) return { error: "Seleciona a forma de pagamento." };
  return { method: m };
}

export function paymentMethodLabelPt(method: string | null | undefined): string {
  if (!method) return "—";
  if (isFinancePaymentMethod(method)) return FINANCE_PAYMENT_METHOD_LABELS_PT[method];
  return LEGACY_LABELS_PT[method] ?? method;
}

export function isCashPaymentMethod(method: string | null | undefined): boolean {
  return method === "CASH";
}

/** Entradas/saídas via conta (não físico). */
export function isBankPaymentMethod(method: string | null | undefined): boolean {
  return method === "TRANSFER" || method === "MBWAY" || method === "DEPOSIT";
}
